"""
Paso 06 — Búsqueda semántica híbrida (KNN + BM25) sobre Pinecone.
"""
import os
import re
from datetime import date
from typing import Optional

from dotenv import load_dotenv
from openai import OpenAI
from pinecone import Pinecone
from rank_bm25 import BM25Okapi

load_dotenv()

INDEX_NAME = os.environ.get("PINECONE_INDEX_NAME", "licitaia-docs")
K_RESULTS = 5
MIN_SCORE = 0.72
ALPHA_KNN = 0.7      # peso KNN por defecto
ALPHA_BM25 = 0.3     # peso BM25 por defecto

# Jerarquía de tipo_documento para re-ranking
DOC_TYPE_RANK = {"bases_tecnicas": 1.0, "ley": 0.85, "politica": 0.75, "instructivo": 0.6}

_pc: Pinecone | None = None
_openai: OpenAI | None = None
_index = None


def _get_index():
    global _pc, _index
    if _index is None:
        _pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
        _index = _pc.Index(INDEX_NAME)
    return _index


def _get_openai():
    global _openai
    if _openai is None:
        _openai = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    return _openai


def embed_query(query: str) -> list[float]:
    resp = _get_openai().embeddings.create(model="text-embedding-3-small", input=[query])
    return resp.data[0].embedding


def _date_score(fecha_vigencia: str) -> float:
    """Mayor peso a documentos más recientes."""
    try:
        doc_date = date.fromisoformat(fecha_vigencia)
        today = date.today()
        delta_days = (doc_date - today).days
        # Documentos que vencen más lejos = score más alto, max 1.0
        return min(1.0, max(0.0, (delta_days + 365) / 730))
    except Exception:
        return 0.5


def rerank(results: list[dict]) -> list[dict]:
    """
    Re-ranking post-recuperación con tres criterios ponderados:
    - 60%: similaridad coseno
    - 25%: fecha_vigencia
    - 15%: tipo_documento jerarquía
    """
    today_str = date.today().isoformat()
    for r in results:
        meta = r.get("metadata", {})
        cosine = r.get("score", 0.0)
        date_s = _date_score(meta.get("fecha_vigencia", today_str))
        type_s = DOC_TYPE_RANK.get(meta.get("tipo_documento", ""), 0.5)
        r["rerank_score"] = (cosine * 0.60) + (date_s * 0.25) + (type_s * 0.15)
    return sorted(results, key=lambda x: x["rerank_score"], reverse=True)


def _has_explicit_article(query: str) -> bool:
    return bool(re.search(r"(artículo|art\.?|cláusula)\s+\d+", query, re.IGNORECASE))


def bm25_score(query: str, docs: list[dict]) -> list[float]:
    """BM25 sobre el campo 'text' de los metadatos."""
    tokenized_corpus = [doc.get("metadata", {}).get("text", "").lower().split() for doc in docs]
    if not any(tokenized_corpus):
        return [0.0] * len(docs)
    bm25 = BM25Okapi(tokenized_corpus)
    scores = bm25.get_scores(query.lower().split())
    # Normalizar a [0, 1]
    max_s = max(scores) if max(scores) > 0 else 1.0
    return [float(s / max_s) for s in scores]


def semantic_search(
    query: str,
    namespaces: list[str],
    concurso_id: Optional[str] = None,
    k: int = K_RESULTS,
) -> list[dict]:
    """
    Búsqueda híbrida KNN + BM25.
    Retorna hasta k resultados con score >= MIN_SCORE, re-rankeados.
    """
    embedding = embed_query(query)
    alpha_knn = ALPHA_KNN
    alpha_bm25 = ALPHA_BM25

    # Si la query menciona un artículo explícito, potenciar BM25
    if _has_explicit_article(query):
        alpha_knn = 0.4
        alpha_bm25 = 0.6

    all_matches: list[dict] = []
    index = _get_index()

    for ns in namespaces:
        filter_dict: dict = {}
        if concurso_id:
            filter_dict["concurso_id"] = {"$eq": concurso_id}

        resp = index.query(
            vector=embedding,
            top_k=k * 2,
            namespace=ns,
            include_metadata=True,
            filter=filter_dict if filter_dict else None,
        )
        for match in resp.matches:
            if match.score >= MIN_SCORE:
                all_matches.append({
                    "id": match.id,
                    "score": match.score,
                    "metadata": match.metadata or {},
                    "namespace": ns,
                })

    if not all_matches:
        return []

    # BM25 sobre los candidatos recuperados
    bm25_scores = bm25_score(query, all_matches)

    # Combinar scores
    for i, match in enumerate(all_matches):
        match["hybrid_score"] = alpha_knn * match["score"] + alpha_bm25 * bm25_scores[i]

    # Re-ranking final
    all_matches.sort(key=lambda x: x.get("hybrid_score", 0), reverse=True)
    ranked = rerank(all_matches[:k * 2])
    return ranked[:k]


def search_concurso(query: str, concurso_id: str) -> list[dict]:
    """Busca en el namespace del concurso activo."""
    ns = f"bases-concurso-{concurso_id}"
    return semantic_search(query, [ns], concurso_id=concurso_id)


def search_general(query: str) -> list[dict]:
    """Busca en todos los namespaces de normativa general."""
    namespaces = ["bases-generales", "requisitos-pyme", "inhabilitaciones", "registro-proveedores"]
    return semantic_search(query, namespaces)


def format_context(results: list[dict]) -> str:
    """Convierte los resultados en un bloque de contexto para el LLM."""
    if not results:
        return "No se encontraron documentos relevantes."
    lines = []
    for r in results:
        meta = r.get("metadata", {})
        text = meta.get("text", "")
        articulo = meta.get("articulo", "")
        fuente = meta.get("fuente", "")
        lines.append(f"[{fuente} — {articulo}]\n{text}\n")
    return "\n---\n".join(lines)
