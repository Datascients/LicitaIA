"""
Paso 03 — Agente Orquestador LicitaBot.
Cerebro del sistema: elige workers, llama al LLM, aplica fiscalizador.
"""
import os
import time
from typing import Optional

import anthropic
from dotenv import load_dotenv

from src.agents.workers.worker_semantic_bases import WorkerSemanticBases
from src.agents.workers.worker_semantic_general import WorkerSemanticGeneral
from src.agents.workers.worker_sql_historial import WorkerSqlHistorial
from src.agents.workers.worker_checklist import WorkerChecklist
from src.agents.fiscalizador import fiscalizar
from src.db.supabase_client import log_interaction, get_empresa, get_concurso

load_dotenv()

_SYSTEM_PROMPT = """Eres LicitaBot, un asesor especializado en licitaciones públicas chilenas para PYMEs. \
Tu función es responder preguntas sobre bases de licitaciones, requisitos de postulación e inhabilidades, \
siempre citando la cláusula o artículo exacto del que proviene la información.

Contexto del usuario activo:
- RUT empresa: {rut}
- Clasificación: {clasificacion_pyme}
- Concurso consultado: {concurso_id} — {nombre_concurso}
- Estado de habilidad: {estado_habilidad}
- Primer filtro IA: {resultado_filtro}

Reglas estrictas:
1. SIEMPRE citar la fuente: 'Según [Documento], [Cláusula X]:'
2. Si no encuentras la respuesta en los documentos, declarar explícitamente que no está en las bases \
y sugerir consultar directamente con el organismo comprador.
3. NUNCA inventar requisitos, fechas ni montos.
4. Si detectas que el usuario no califica para algo, explicar por qué y qué debe hacer para resolverlo.
5. Responder siempre en español chileno, tono profesional pero accesible."""

# Palabras clave para delegación a workers
_KEYWORDS_BASES = [
    "penalidad", "penalidades", "plazo", "entrega", "documento", "documentos",
    "requisito", "cláusula", "bases del concurso", "criterio", "evaluación",
    "boleta", "garantía", "postular al concurso", "bases técnicas",
]
_KEYWORDS_GENERAL = [
    "pyme", "ley 19886", "ley 20416", "inhabilitacion", "inhabilidad",
    "deuda previsional", "deuda tributaria", "chileproveedores", "inscripción",
    "soy pyme", "clasifico", "tamaño", "multa", "dt", "inspección del trabajo",
]
_KEYWORDS_HISTORIAL = [
    "califico", "calificar", "cumplo", "cumplir", "califico yo",
    "mis postulaciones", "mi historial", "mi empresa", "mis requisitos",
    "puedo postular",
]
_KEYWORDS_CHECKLIST = [
    "checklist", "lista de requisitos", "mi checklist", "estado de mis documentos",
    "actualizar análisis", "qué me falta",
]


def _elegir_worker(query: str) -> str:
    q = query.lower()
    if any(kw in q for kw in _KEYWORDS_CHECKLIST):
        return "worker_checklist"
    if any(kw in q for kw in _KEYWORDS_HISTORIAL):
        return "worker_sql_historial"
    if any(kw in q for kw in _KEYWORDS_GENERAL):
        return "worker_semantic_general"
    if any(kw in q for kw in _KEYWORDS_BASES):
        return "worker_semantic_bases"
    # Default: primero buscar en bases del concurso
    return "worker_semantic_bases"


class Orchestrator:
    def __init__(self):
        self._client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
        self._w_bases = WorkerSemanticBases()
        self._w_general = WorkerSemanticGeneral()
        self._w_historial = WorkerSqlHistorial()
        self._w_checklist = WorkerChecklist()

    def _build_system_prompt(self, empresa: dict | None, concurso: dict | None) -> str:
        return _SYSTEM_PROMPT.format(
            rut=empresa.get("rut", "No registrado") if empresa else "No registrado",
            clasificacion_pyme=empresa.get("clasificacion_pyme", "No determinada") if empresa else "No determinada",
            concurso_id=concurso.get("codigo_mp", "N/A") if concurso else "N/A",
            nombre_concurso=concurso.get("nombre", "No especificado") if concurso else "No especificado",
            estado_habilidad="Hábil" if empresa and empresa.get("inscrita_chileproveedores") else "Verificar",
            resultado_filtro=empresa.get("estado_primer_filtro", "pendiente") if empresa else "pendiente",
        )

    def _run_worker(self, worker_name: str, query: str, empresa_id: str, concurso_id: str, concurso: dict | None) -> dict:
        concurso_codigo = "001"
        if concurso and concurso.get("codigo_mp"):
            import re
            match = re.search(r"(\d{3})", concurso["codigo_mp"])
            if match:
                concurso_codigo = match.group(1)

        if worker_name == "worker_semantic_bases":
            return self._w_bases.run(query, concurso_codigo)
        elif worker_name == "worker_semantic_general":
            return self._w_general.run(query)
        elif worker_name == "worker_sql_historial":
            return self._w_historial.run(empresa_id, concurso_id, concurso_codigo)
        elif worker_name == "worker_checklist":
            return self._w_checklist.run(empresa_id, concurso_id)
        return {}

    def query(self, query: str, empresa_id: str, concurso_id: str) -> dict:
        t_start = time.time()
        empresa = None
        concurso = None

        try:
            empresa = get_empresa(empresa_id)
        except Exception:
            pass
        try:
            concurso = get_concurso(concurso_id)
        except Exception:
            pass

        worker_name = _elegir_worker(query)
        worker_result = self._run_worker(worker_name, query, empresa_id, concurso_id, concurso)

        context = worker_result.get("context", "")
        chunks = worker_result.get("chunks", [])
        fuente_citada = worker_result.get("fuente_primaria", "")

        # Si el worker retornó datos estructurados (historial/checklist), convertir a texto
        if worker_name in ("worker_sql_historial", "worker_checklist"):
            import json
            context = json.dumps(worker_result, ensure_ascii=False, indent=2)
            chunks = []

        system_prompt = self._build_system_prompt(empresa, concurso)
        user_message = f"Pregunta del usuario:\n{query}\n\nInformación recuperada:\n{context}"

        response = self._client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )

        respuesta_text = response.content[0].text
        tokens_in = response.usage.input_tokens
        tokens_out = response.usage.output_tokens

        # Fiscalizar
        fisco = fiscalizar(query, respuesta_text, chunks)
        latency_ms = int((time.time() - t_start) * 1000)

        # Registrar interacción
        requiere_accion = bool(
            worker_result.get("alertas") or
            (worker_name == "worker_sql_historial" and not worker_result.get("califica"))
        )
        accion_sugerida = None
        if worker_name in ("worker_sql_historial", "worker_checklist"):
            requisitos = worker_result.get("requisitos", worker_result.get("checklist", []))
            gaps = [r for r in requisitos if r.get("estado") == "no_cumple"]
            if gaps:
                accion_sugerida = gaps[0].get("accion") or gaps[0].get("accion_sugerida")

        try:
            log_interaction({
                "empresa_id": empresa_id,
                "concurso_id": concurso_id,
                "query": query,
                "response": respuesta_text,
                "corrected_response": fisco["corrected"],
                "worker_usado": worker_name,
                "fuente_citada": fuente_citada,
                "tokens_input": tokens_in,
                "tokens_output": tokens_out,
                "latency_ms": latency_ms,
                "confianza": fisco["confianza_final"],
                "fiscalizador_ok": fisco["ok"],
                "fiscalizador_issues": fisco["issues"],
                "requiere_revision_admin": fisco["requiere_revision_admin"],
            })
        except Exception:
            pass  # No romper el flujo principal por error de log

        return {
            "respuesta": fisco["corrected"],
            "fuente_citada": fuente_citada,
            "worker_usado": worker_name,
            "requiere_accion_usuario": requiere_accion,
            "accion_sugerida": accion_sugerida,
            "confianza": fisco["confianza_final"],
            "fiscalizador_ok": fisco["ok"],
            "latency_ms": latency_ms,
        }
