"""
Worker 2 — Búsqueda semántica en normativas generales.
"""
from tenacity import retry, stop_after_attempt, wait_exponential

from src.retriever.semantic_search import search_general, format_context


class WorkerSemanticGeneral:
    name = "worker_semantic_general"

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8))
    def run(self, query: str, tipo_consulta: str = "general") -> dict:
        results = search_general(query)

        if not results:
            return {
                "ok": False,
                "worker": self.name,
                "chunks": [],
                "context": "No se encontró información en la normativa general.",
                "fuente_primaria": None,
            }

        fuente = None
        if results:
            meta = results[0].get("metadata", {})
            fuente = f"{meta.get('articulo', '')} — {meta.get('fuente', '')}"

        return {
            "ok": True,
            "worker": self.name,
            "chunks": results,
            "context": format_context(results),
            "fuente_primaria": fuente,
        }
