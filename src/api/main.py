"""
Paso 09 — FastAPI: endpoints de LicitaIA.
"""
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.agents.orchestrator import Orchestrator
from src.agents.workers.worker_checklist import WorkerChecklist
from src.db.supabase_client import (
    list_concursos_activos,
    get_empresa,
    upsert_empresa,
    list_feedbacks_empresa,
    create_feedback,
    get_client,
)

app = FastAPI(
    title="LicitaIA API",
    description="Plataforma RAG multi-agente para PYMEs en licitaciones públicas chilenas",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_orchestrator = Orchestrator()
_checklist_worker = WorkerChecklist()


# ── Modelos Pydantic ───────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    query: str
    empresa_id: str
    concurso_id: str


class EligibilityRequest(BaseModel):
    empresa_id: str
    concurso_id: str


class EmpresaData(BaseModel):
    rut: str
    razon_social: str
    nombre_fantasia: Optional[str] = None
    giro: Optional[str] = None
    ventas_uf_anual: Optional[float] = None
    num_trabajadores: Optional[int] = None
    tiene_deuda_previsional: bool = False
    tiene_deuda_tributaria: bool = False
    tiene_denuncia_laboral: bool = False
    tiene_litigio_proveedor: bool = False
    inscrita_chileproveedores: bool = False
    certificaciones: Optional[list[str]] = None


class FeedbackData(BaseModel):
    empresa_id: str
    admin_id: str
    mensaje: str
    tipo: str = "informativo"


# ── Helpers ────────────────────────────────────────────────────────────────

def _semaforo(fecha_cierre_str: str) -> str:
    try:
        cierre = datetime.fromisoformat(fecha_cierre_str.replace("Z", "+00:00"))
        dias = (cierre - datetime.now(timezone.utc)).days
        if dias < 0:
            return "vencido"
        if dias < 3:
            return "rojo"
        if dias <= 10:
            return "amarillo"
        return "verde"
    except Exception:
        return "desconocido"


def _clasificar_pyme(ventas_uf: float | None) -> str:
    if ventas_uf is None:
        return "no_aplica"
    if ventas_uf <= 2400:
        return "micro"
    if ventas_uf <= 25000:
        return "pequena"
    if ventas_uf <= 100000:
        return "mediana"
    return "no_aplica"


# ── Endpoints ──────────────────────────────────────────────────────────────

@app.get("/")
def health():
    return {"status": "ok", "service": "LicitaIA API", "version": "1.0.0"}


@app.post("/query")
def query_endpoint(req: QueryRequest):
    """Responde preguntas sobre licitaciones usando el orquestador RAG."""
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="La pregunta no puede estar vacía.")
    result = _orchestrator.query(req.query, req.empresa_id, req.concurso_id)
    return result


@app.post("/eligibility")
def eligibility_endpoint(req: EligibilityRequest):
    """Retorna el checklist completo de elegibilidad de una empresa para un concurso."""
    result = _checklist_worker.run(req.empresa_id, req.concurso_id)
    if not result.get("ok"):
        raise HTTPException(status_code=422, detail=result.get("error", "Error evaluando elegibilidad."))
    return result


@app.get("/concursos")
def list_concursos():
    """Lista concursos activos con semáforo de urgencia."""
    concursos = list_concursos_activos()
    for c in concursos:
        c["semaforo"] = _semaforo(c.get("fecha_cierre", ""))
    # Ordenar: vencidos al final, urgentes primero
    prioridad = {"rojo": 0, "amarillo": 1, "verde": 2, "vencido": 3, "desconocido": 4}
    concursos.sort(key=lambda x: prioridad.get(x.get("semaforo", "desconocido"), 4))
    return {"concursos": concursos, "total": len(concursos)}


@app.get("/empresa/{empresa_id}")
def get_empresa_endpoint(empresa_id: str):
    """Retorna ficha + estado filtro IA + postulaciones de una empresa."""
    empresa = get_empresa(empresa_id)
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada.")

    postulaciones = (
        get_client()
        .table("postulaciones")
        .select("*, concursos(nombre, fecha_cierre, organismo)")
        .eq("empresa_id", empresa_id)
        .execute()
        .data or []
    )
    feedbacks = list_feedbacks_empresa(empresa_id)

    return {
        "empresa": empresa,
        "postulaciones": postulaciones,
        "feedbacks_pendientes": [f for f in feedbacks if not f.get("leido")],
    }


@app.post("/empresa")
def create_update_empresa(data: EmpresaData):
    """Crea o actualiza la ficha de una empresa. Calcula clasificación PYME automáticamente."""
    payload = data.model_dump(exclude_none=True)
    payload["clasificacion_pyme"] = _clasificar_pyme(data.ventas_uf_anual)

    # Estado inhabilitaciones para primer filtro IA
    inhabilitado = (
        data.tiene_deuda_previsional or
        data.tiene_deuda_tributaria or
        data.tiene_litigio_proveedor
    )
    payload["estado_primer_filtro"] = "no_califica" if inhabilitado else "califica"

    # Score completitud básico
    campos = ["rut", "razon_social", "giro", "ventas_uf_anual", "num_trabajadores",
              "inscrita_chileproveedores"]
    completados = sum(1 for c in campos if payload.get(c) is not None)
    payload["score_completitud_ficha"] = int((completados / len(campos)) * 100)

    empresa = upsert_empresa(payload)
    return {"empresa": empresa}


@app.get("/admin/empresas")
def admin_list_empresas(
    estado_filtro: Optional[str] = None,
    min_completitud: Optional[int] = None,
):
    """Listado admin con filtros."""
    query = get_client().table("empresas").select("*").order("created_at", desc=True)
    if estado_filtro:
        query = query.eq("estado_primer_filtro", estado_filtro)
    if min_completitud is not None:
        query = query.gte("score_completitud_ficha", min_completitud)
    resp = query.execute()
    return {"empresas": resp.data or [], "total": len(resp.data or [])}


@app.post("/admin/feedback")
def admin_send_feedback(data: FeedbackData):
    """Envía feedback del administrador a una empresa."""
    if data.tipo not in ("informativo", "alerta", "urgente"):
        raise HTTPException(status_code=400, detail="Tipo debe ser: informativo, alerta o urgente.")
    feedback = create_feedback(data.model_dump())
    return {"feedback": feedback}
