"""
Worker 1 — Búsqueda semántica en bases específicas del concurso activo.
"""
import os
from typing import Optional
from tenacity import retry, stop_after_attempt, wait_exponential

from src.retriever.semantic_search import search_concurso, search_general, format_context


class WorkerSemanticBases:
    name = "worker_semantic_bases"

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8))
    def run(self, query: str, concurso_id: str) -> dict:
        results = search_concurso(query, concurso_id)

        # Si hay menos de 2 resultados relevantes, escalar a normativa general
        if len(results) < 2:
            fallback = search_general(query)
            if fallback:
                results = fallback
                source = "worker_semantic_general (escalado)"
            else:
                return {
                    "ok": False,
                    "worker": self.name,
                    "chunks": [],
                    "context": "No se encontraron cláusulas relevantes en las bases del concurso ni en normativa general.",
                    "fuente_primaria": None,
                    "escalado": True,
                }
        else:
            source = self.name

        fuente = None
        if results:
            meta = results[0].get("metadata", {})
            fuente = f"{meta.get('articulo', '')} — {meta.get('fuente', '')}"

        return {
            "ok": True,
            "worker": source,
            "chunks": results,
            "context": format_context(results),
            "fuente_primaria": fuente,
            "escalado": source != self.name,
        }
