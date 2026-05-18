"""
Worker 4 — Genera y actualiza el checklist visual del dashboard PYME.
"""
from datetime import datetime, timezone
from tenacity import retry, stop_after_attempt, wait_exponential

from src.agents.workers.worker_sql_historial import WorkerSqlHistorial
from src.db.supabase_client import (
    get_or_create_postulacion,
    get_checklist,
    upsert_checklist_item,
    get_concurso,
)


URGENCIA_DIAS = 5  # Notificar si concurso vence en menos de N días


class WorkerChecklist:
    name = "worker_checklist"

    def __init__(self):
        self._historial = WorkerSqlHistorial()

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=2, max=10))
    def run(self, empresa_id: str, concurso_id: str) -> dict:
        historial = self._historial.run(empresa_id, concurso_id)
        if not historial.get("ok"):
            return {"ok": False, "error": historial.get("error", "Error en worker_sql_historial")}

        postulacion = get_or_create_postulacion(empresa_id, concurso_id)
        postulacion_id = postulacion["id"]

        checklist_actual = get_checklist(postulacion_id)
        prev_map = {item["requisito_nombre"]: item for item in checklist_actual}

        nuevos_items = []
        alertas = []

        concurso = get_concurso(concurso_id)
        dias_restantes = None
        if concurso and concurso.get("fecha_cierre"):
            try:
                cierre = datetime.fromisoformat(concurso["fecha_cierre"].replace("Z", "+00:00"))
                ahora = datetime.now(timezone.utc)
                dias_restantes = (cierre - ahora).days
            except Exception:
                pass

        for req in historial.get("requisitos", []):
            nombre = req["nombre"]
            item = {
                "postulacion_id": postulacion_id,
                "requisito_nombre": nombre,
                "estado": req["estado"],
                "es_inhabilitante": req["inhabilitante"],
                "gap_descripcion": req.get("gap"),
                "accion_sugerida": req.get("accion"),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            # Conservar path adjunto si ya existía
            if nombre in prev_map and prev_map[nombre].get("documento_adjunto_path"):
                item["documento_adjunto_path"] = prev_map[nombre]["documento_adjunto_path"]

            upsert_checklist_item(item)
            nuevos_items.append(item)

            # Alerta: ítem inhabilitante sin resolver y concurso próximo a vencer
            if (
                req["estado"] == "no_cumple"
                and req["inhabilitante"]
                and dias_restantes is not None
                and dias_restantes < URGENCIA_DIAS
            ):
                alertas.append({
                    "tipo": "urgente",
                    "requisito": nombre,
                    "dias_restantes": dias_restantes,
                    "mensaje": f"⚠️ Ítem inhabilitante sin resolver. El concurso vence en {dias_restantes} día(s).",
                })

        return {
            "ok": True,
            "worker": self.name,
            "postulacion_id": postulacion_id,
            "checklist": nuevos_items,
            "califica": historial.get("califica"),
            "score_completitud": historial.get("score_completitud"),
            "alertas": alertas,
            "dias_restantes": dias_restantes,
        }
