"""
Worker 3 — Consulta SQL: elegibilidad y checklist de requisitos.
"""
from tenacity import retry, stop_after_attempt, wait_exponential

from src.db.supabase_client import get_empresa, get_concurso, get_or_create_postulacion
from src.retriever.semantic_search import search_concurso


# Requisitos mock por concurso (en producción se extraen desde Pinecone + bases)
REQUISITOS_MOCK = {
    "001": [
        {"nombre": "Ventas anuales entre 2.400 y 25.000 UF", "campo": "ventas_uf_anual", "rango": (2400, 25000), "inhabilitante": False},
        {"nombre": "Sin deudas previsionales últimos 12 meses", "campo": "tiene_deuda_previsional", "valor_esperado": False, "inhabilitante": True},
        {"nombre": "Inscripción vigente en ChileProveedores", "campo": "inscrita_chileproveedores", "valor_esperado": True, "inhabilitante": True},
        {"nombre": "Mínimo 5 trabajadores con contrato", "campo": "num_trabajadores", "minimo": 5, "inhabilitante": False},
        {"nombre": "Sin multas de la DT en últimos 24 meses", "campo": "tiene_denuncia_laboral", "valor_esperado": False, "inhabilitante": True},
        {"nombre": "Certificado SUSESO de cumplimiento laboral", "campo": "certificaciones", "contiene": "SUSESO", "inhabilitante": False},
    ],
    "002": [
        {"nombre": "Sin litigios con organismos públicos últimos 3 años", "campo": "tiene_litigio_proveedor", "valor_esperado": False, "inhabilitante": True},
        {"nombre": "Inscripción vigente en ChileProveedores", "campo": "inscrita_chileproveedores", "valor_esperado": True, "inhabilitante": True},
        {"nombre": "Sin deudas tributarias", "campo": "tiene_deuda_tributaria", "valor_esperado": False, "inhabilitante": True},
    ],
    "003": [
        {"nombre": "Giro en consultoría o tecnología", "campo": "giro", "contiene_texto": ["consultor", "tecnolog", "digital"], "inhabilitante": False},
        {"nombre": "Sin sanciones del Consejo para la Transparencia", "campo": "tiene_denuncia_laboral", "valor_esperado": False, "inhabilitante": True},
        {"nombre": "Inscripción vigente en ChileProveedores", "campo": "inscrita_chileproveedores", "valor_esperado": True, "inhabilitante": True},
    ],
}


def _evaluar_requisito(empresa: dict, req: dict) -> dict:
    estado = "pendiente"
    gap = None
    accion = None
    campo = req.get("campo", "")
    valor = empresa.get(campo)

    if "rango" in req:
        lo, hi = req["rango"]
        if valor is None:
            estado = "pendiente"
            gap = "No se ha registrado el valor de ventas anuales en UF."
            accion = "Completar la ficha empresa con las ventas anuales en UF."
        elif lo <= float(valor) <= hi:
            estado = "cumple"
        else:
            estado = "no_cumple"
            gap = f"Ventas registradas: {valor} UF. Rango requerido: {lo}–{hi} UF."
            accion = "Verificar que las ventas anuales correspondan al período correcto según Ley 20.416."

    elif "minimo" in req:
        if valor is None:
            estado = "pendiente"
            gap = "No se ha registrado el número de trabajadores."
            accion = "Completar la ficha empresa con el número de trabajadores con contrato."
        elif int(valor) >= req["minimo"]:
            estado = "cumple"
        else:
            estado = "no_cumple"
            gap = f"Trabajadores registrados: {valor}. Mínimo requerido: {req['minimo']}."
            accion = "Contratar trabajadores adicionales o verificar que todos estén correctamente registrados."

    elif "contiene" in req:
        certs = empresa.get("certificaciones") or []
        if req["contiene"] in certs:
            estado = "cumple"
        else:
            estado = "no_cumple"
            gap = f"Certificación '{req['contiene']}' no registrada en el perfil."
            accion = f"Obtener y cargar la certificación '{req['contiene']}' en el perfil de empresa."

    elif "contiene_texto" in req:
        giro = (valor or "").lower()
        if any(kw in giro for kw in req["contiene_texto"]):
            estado = "cumple"
        else:
            estado = "no_cumple"
            gap = f"Giro registrado: '{valor}'. El concurso requiere giro en consultoría o tecnología."
            accion = "Verificar el giro ante el SII y actualizar en el perfil."

    elif "valor_esperado" in req:
        if valor is None:
            estado = "pendiente"
            gap = f"El campo '{campo}' no ha sido completado."
            accion = "Completar la información en la ficha empresa."
        elif valor == req["valor_esperado"]:
            estado = "cumple"
        else:
            estado = "no_cumple"
            gap = _gap_for_boolean(campo, valor)
            accion = _accion_for_boolean(campo)

    return {
        "nombre": req["nombre"],
        "estado": estado,
        "gap": gap,
        "accion": accion,
        "inhabilitante": req.get("inhabilitante", False),
    }


def _gap_for_boolean(campo: str, valor) -> str:
    mensajes = {
        "tiene_deuda_previsional": "La empresa registra deudas previsionales activas.",
        "tiene_deuda_tributaria": "La empresa registra deudas tributarias activas.",
        "tiene_denuncia_laboral": "La empresa registra denuncias o multas laborales.",
        "tiene_litigio_proveedor": "La empresa registra litigios activos con organismos públicos.",
        "inscrita_chileproveedores": "La empresa no está inscrita en ChileProveedores o su inscripción no está vigente.",
    }
    return mensajes.get(campo, f"El campo '{campo}' no cumple el valor esperado.")


def _accion_for_boolean(campo: str) -> str:
    acciones = {
        "tiene_deuda_previsional": "Regularizar deudas previsionales en www.previred.com. Plazo de actualización: 2-5 días hábiles.",
        "tiene_deuda_tributaria": "Regularizar deudas tributarias en www.sii.cl. Solicitar certificado de cumplimiento tributario.",
        "tiene_denuncia_laboral": "Revisar y resolver las multas en www.dt.gob.cl. El proceso puede tomar 10-30 días hábiles.",
        "tiene_litigio_proveedor": "Consultar con abogado sobre resolución del litigio. Los litigios activos inhabilitan para postular al organismo demandado.",
        "inscrita_chileproveedores": "Inscribirse en www.chileproveedores.cl. Documentos necesarios: RUT, inicio actividades SII, representante legal, declaración jurada.",
    }
    return acciones.get(campo, "Corregir el valor en la ficha empresa.")


class WorkerSqlHistorial:
    name = "worker_sql_historial"

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=2, max=10))
    def run(self, empresa_id: str, concurso_id_uuid: str, concurso_codigo: str = "001") -> dict:
        empresa = get_empresa(empresa_id)
        if not empresa:
            return {"ok": False, "error": f"Empresa {empresa_id} no encontrada."}

        concurso = get_concurso(concurso_id_uuid)
        concurso_codigo_final = concurso_codigo
        if concurso and concurso.get("codigo_mp"):
            # Extraer el número del código MP para buscar en REQUISITOS_MOCK
            import re
            match = re.search(r"(\d{3})", concurso["codigo_mp"])
            if match:
                concurso_codigo_final = match.group(1)

        requisitos_def = REQUISITOS_MOCK.get(concurso_codigo_final, [])
        evaluados = [_evaluar_requisito(empresa, req) for req in requisitos_def]

        total = len(evaluados)
        cumplen = sum(1 for r in evaluados if r["estado"] == "cumple")
        tiene_inhabilitante = any(r for r in evaluados if r["estado"] == "no_cumple" and r["inhabilitante"])
        califica = not tiene_inhabilitante and total > 0
        score = int((cumplen / total) * 100) if total > 0 else 0

        return {
            "ok": True,
            "worker": self.name,
            "califica": califica,
            "score_completitud": score,
            "empresa": {
                "rut": empresa.get("rut"),
                "razon_social": empresa.get("razon_social"),
                "clasificacion_pyme": empresa.get("clasificacion_pyme"),
            },
            "requisitos": evaluados,
        }
