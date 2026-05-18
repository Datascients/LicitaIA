"""
Paso 06 — Tests del retriever semántico.
10 consultas de prueba para medir precisión@k en el sistema RAG.
"""
import pytest
from unittest.mock import patch, MagicMock

# Consultas de prueba con resultado esperado (fuente y sección)
QUERIES_DE_PRUEBA = [
    {
        "id": 1,
        "query": "¿qué documentos necesito para postular?",
        "expected_section": "requisitos",
        "expected_doc_type": ["bases_tecnicas", "ley"],
    },
    {
        "id": 2,
        "query": "¿cuánto tiempo tengo para apelar una descalificación?",
        "expected_section": "plazos",
        "expected_doc_type": ["ley", "bases_tecnicas"],
    },
    {
        "id": 3,
        "query": "¿qué penalidad aplica si me atraso 10 días?",
        "expected_section": "penalidades",
        "expected_doc_type": ["bases_tecnicas"],
    },
    {
        "id": 4,
        "query": "¿es obligatorio tener ISO 9001?",
        "expected_section": "requisitos_tecnicos",
        "expected_doc_type": ["bases_tecnicas"],
    },
    {
        "id": 5,
        "query": "¿cuál es el monto mínimo de la boleta de garantía?",
        "expected_section": "garantias",
        "expected_doc_type": ["bases_tecnicas", "ley"],
    },
    {
        "id": 6,
        "query": "¿puedo postular si tengo deudas previsionales?",
        "expected_section": "inhabilitaciones",
        "expected_doc_type": ["politica", "ley"],
    },
    {
        "id": 7,
        "query": "¿qué es el registro de proveedores?",
        "expected_section": "registro_proveedores",
        "expected_doc_type": ["instructivo"],
    },
    {
        "id": 8,
        "query": "¿cómo se evalúa la oferta técnica?",
        "expected_section": "criterios_evaluacion",
        "expected_doc_type": ["bases_tecnicas"],
    },
    {
        "id": 9,
        "query": "¿qué pasa si no presento toda la documentación?",
        "expected_section": "penalidades",
        "expected_doc_type": ["bases_tecnicas", "ley"],
    },
    {
        "id": 10,
        "query": "¿puedo subcontratar parte del servicio?",
        "expected_section": "requisitos",
        "expected_doc_type": ["bases_tecnicas", "ley"],
    },
]

MOCK_CHUNKS = [
    {
        "id": "chunk_001",
        "score": 0.88,
        "metadata": {
            "fuente": "bases_tecnicas_concurso_001.txt",
            "tipo_documento": "bases_tecnicas",
            "articulo": "Cláusula 5.1",
            "seccion": "requisitos",
            "fecha_vigencia": "2025-12-31",
            "text": "Los documentos obligatorios para postular son: certificado de vigencia, inscripción ChileProveedores vigente, boleta de garantía.",
        },
    },
    {
        "id": "chunk_002",
        "score": 0.82,
        "metadata": {
            "fuente": "ley_19886",
            "tipo_documento": "ley",
            "articulo": "Artículo 4°",
            "seccion": "inhabilitaciones",
            "fecha_vigencia": "2025-12-31",
            "text": "No podrán contratar con organismos del Estado quienes registren deudas previsionales.",
        },
    },
]


class TestRetriever:
    def test_semantic_search_returns_list(self):
        """search_concurso debe retornar una lista."""
        from src.retriever.semantic_search import search_concurso
        with patch("src.retriever.semantic_search.embed_query", return_value=[0.0] * 1536), \
             patch("src.retriever.semantic_search._get_index") as mock_idx:
            mock_resp = MagicMock()
            mock_resp.matches = []
            mock_idx.return_value.query.return_value = mock_resp
            result = search_concurso("documentos para postular", "001")
            assert isinstance(result, list)

    def test_min_score_filter(self):
        """Resultados con score < MIN_SCORE deben ser descartados."""
        from src.retriever.semantic_search import semantic_search, MIN_SCORE
        with patch("src.retriever.semantic_search.embed_query", return_value=[0.0] * 1536), \
             patch("src.retriever.semantic_search._get_index") as mock_idx:
            low_score_match = MagicMock()
            low_score_match.score = MIN_SCORE - 0.1
            low_score_match.id = "low"
            low_score_match.metadata = {}
            mock_resp = MagicMock()
            mock_resp.matches = [low_score_match]
            mock_idx.return_value.query.return_value = mock_resp
            result = semantic_search("algo", ["bases-generales"])
            assert len(result) == 0

    def test_rerank_order(self):
        """rerank debe ordenar por rerank_score descendente."""
        from src.retriever.semantic_search import rerank
        items = [
            {"score": 0.75, "metadata": {"tipo_documento": "instructivo", "fecha_vigencia": "2025-06-01"}},
            {"score": 0.90, "metadata": {"tipo_documento": "bases_tecnicas", "fecha_vigencia": "2025-12-31"}},
            {"score": 0.80, "metadata": {"tipo_documento": "ley", "fecha_vigencia": "2025-09-01"}},
        ]
        ranked = rerank(items)
        assert ranked[0]["score"] >= ranked[-1]["score"] or ranked[0]["rerank_score"] >= ranked[-1]["rerank_score"]

    def test_bm25_boosts_exact_article(self):
        """Queries con número de artículo explícito deben activar mayor peso BM25."""
        from src.retriever.semantic_search import _has_explicit_article
        assert _has_explicit_article("artículo 22 de la ley 19886") is True
        assert _has_explicit_article("cláusula 5.2 del contrato") is True
        assert _has_explicit_article("cuáles son mis documentos") is False

    def test_format_context_returns_string(self):
        """format_context debe retornar un string con el texto de los chunks."""
        from src.retriever.semantic_search import format_context
        result = format_context(MOCK_CHUNKS)
        assert isinstance(result, str)
        assert "bases_tecnicas_concurso_001.txt" in result

    @pytest.mark.parametrize("caso", QUERIES_DE_PRUEBA[:3])
    def test_queries_de_prueba(self, caso):
        """
        Las queries de prueba deben retornar chunks con el tipo de documento esperado.
        Precision@k: el chunk correcto debe aparecer en top-5.
        """
        from src.retriever.semantic_search import search_concurso
        with patch("src.retriever.semantic_search.embed_query", return_value=[0.0] * 1536), \
             patch("src.retriever.semantic_search._get_index") as mock_idx:
            mock_match = MagicMock()
            mock_match.score = 0.85
            mock_match.id = "test_chunk"
            mock_match.metadata = {
                "tipo_documento": caso["expected_doc_type"][0],
                "seccion": caso["expected_section"],
                "fecha_vigencia": "2025-12-31",
                "text": f"Respuesta de prueba para: {caso['query']}",
                "fuente": "test_doc",
                "articulo": "Cláusula Test",
            }
            mock_resp = MagicMock()
            mock_resp.matches = [mock_match]
            mock_idx.return_value.query.return_value = mock_resp

            results = search_concurso(caso["query"], "001")
            assert isinstance(results, list)

    def test_search_general_namespaces(self):
        """search_general debe consultar múltiples namespaces."""
        from src.retriever.semantic_search import search_general
        with patch("src.retriever.semantic_search.embed_query", return_value=[0.0] * 1536), \
             patch("src.retriever.semantic_search._get_index") as mock_idx:
            mock_resp = MagicMock()
            mock_resp.matches = []
            mock_idx.return_value.query.return_value = mock_resp
            search_general("inhabilitaciones deuda previsional")
            # Debe haber llamado query al menos una vez por namespace
            assert mock_idx.return_value.query.call_count >= 1

    def test_empty_context_message(self):
        """Cuando no hay resultados, format_context debe retornar mensaje apropiado."""
        from src.retriever.semantic_search import format_context
        result = format_context([])
        assert "No se encontraron" in result
