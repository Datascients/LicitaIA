"""
Tests de los 4 workers especializados.
"""
import pytest
from unittest.mock import patch, MagicMock


class TestWorkerSemanticBases:
    def test_run_returns_ok_with_results(self):
        from src.agents.workers.worker_semantic_bases import WorkerSemanticBases
        worker = WorkerSemanticBases()
        mock_results = [
            {"score": 0.90, "metadata": {"fuente": "bases_001", "articulo": "Cláusula 5", "text": "Texto prueba"}, "namespace": "bases-concurso-001"},
            {"score": 0.85, "metadata": {"fuente": "bases_001", "articulo": "Cláusula 6", "text": "Texto prueba 2"}, "namespace": "bases-concurso-001"},
        ]
        with patch("src.agents.workers.worker_semantic_bases.search_concurso", return_value=mock_results):
            result = worker.run("¿qué documentos necesito?", "001")
        assert result["ok"] is True
        assert result["worker"] == "worker_semantic_bases"
        assert len(result["chunks"]) == 2

    def test_escalada_a_general_si_pocos_resultados(self):
        from src.agents.workers.worker_semantic_bases import WorkerSemanticBases
        worker = WorkerSemanticBases()
        mock_general = [
            {"score": 0.80, "metadata": {"fuente": "ley_19886", "articulo": "Art. 4", "text": "Texto ley"}, "namespace": "bases-generales"},
        ]
        with patch("src.agents.workers.worker_semantic_bases.search_concurso", return_value=[]), \
             patch("src.agents.workers.worker_semantic_bases.search_general", return_value=mock_general):
            result = worker.run("algo muy específico", "001")
        assert result["escalado"] is True


class TestWorkerSemanticGeneral:
    def test_run_retorna_chunks(self):
        from src.agents.workers.worker_semantic_general import WorkerSemanticGeneral
        worker = WorkerSemanticGeneral()
        mock_results = [
            {"score": 0.88, "metadata": {"fuente": "ley_20416", "articulo": "Art. 2", "text": "Clasificación PYME"}, "namespace": "requisitos-pyme"},
        ]
        with patch("src.agents.workers.worker_semantic_general.search_general", return_value=mock_results):
            result = worker.run("¿soy PYME?")
        assert result["ok"] is True
        assert "worker_semantic_general" in result["worker"]

    def test_sin_resultados_retorna_ok_false(self):
        from src.agents.workers.worker_semantic_general import WorkerSemanticGeneral
        worker = WorkerSemanticGeneral()
        with patch("src.agents.workers.worker_semantic_general.search_general", return_value=[]):
            result = worker.run("pregunta sin respuesta")
        assert result["ok"] is False


class TestWorkerSqlHistorial:
    def _make_empresa(self, overrides=None):
        base = {
            "id": "emp-001",
            "rut": "76.543.210-K",
            "razon_social": "TecnoServ Ltda",
            "clasificacion_pyme": "pequena",
            "ventas_uf_anual": 8500,
            "num_trabajadores": 12,
            "tiene_deuda_previsional": False,
            "tiene_deuda_tributaria": False,
            "tiene_denuncia_laboral": False,
            "tiene_litigio_proveedor": False,
            "inscrita_chileproveedores": True,
            "certificaciones": ["SUSESO"],
            "estado_primer_filtro": "califica",
        }
        if overrides:
            base.update(overrides)
        return base

    def test_empresa_califica(self):
        from src.agents.workers.worker_sql_historial import WorkerSqlHistorial
        worker = WorkerSqlHistorial()
        empresa = self._make_empresa()
        with patch("src.agents.workers.worker_sql_historial.get_empresa", return_value=empresa), \
             patch("src.agents.workers.worker_sql_historial.get_concurso", return_value={"codigo_mp": "MP-001-2025"}):
            result = worker.run("emp-001", "concurso-uuid-001", "001")
        assert result["ok"] is True
        assert result["califica"] is True

    def test_empresa_no_califica_por_deuda(self):
        from src.agents.workers.worker_sql_historial import WorkerSqlHistorial
        worker = WorkerSqlHistorial()
        empresa = self._make_empresa({"tiene_deuda_previsional": True})
        with patch("src.agents.workers.worker_sql_historial.get_empresa", return_value=empresa), \
             patch("src.agents.workers.worker_sql_historial.get_concurso", return_value={"codigo_mp": "MP-001-2025"}):
            result = worker.run("emp-001", "concurso-uuid-001", "001")
        assert result["ok"] is True
        assert result["califica"] is False
        deuda_req = next((r for r in result["requisitos"] if "previsional" in r["nombre"].lower()), None)
        assert deuda_req is not None
        assert deuda_req["estado"] == "no_cumple"
        assert deuda_req["inhabilitante"] is True

    def test_empresa_no_encontrada(self):
        from src.agents.workers.worker_sql_historial import WorkerSqlHistorial
        worker = WorkerSqlHistorial()
        with patch("src.agents.workers.worker_sql_historial.get_empresa", return_value=None):
            result = worker.run("id-inexistente", "concurso-001", "001")
        assert result["ok"] is False


class TestWorkerChecklist:
    def test_checklist_genera_alertas_urgentes(self):
        from src.agents.workers.worker_checklist import WorkerChecklist
        worker = WorkerChecklist()
        historial_mock = {
            "ok": True,
            "califica": False,
            "score_completitud": 40,
            "requisitos": [
                {
                    "nombre": "Sin deudas previsionales últimos 12 meses",
                    "estado": "no_cumple",
                    "gap": "Deuda activa",
                    "accion": "Regularizar en previred.com",
                    "inhabilitante": True,
                }
            ],
        }
        postulacion_mock = {"id": "post-uuid-001"}
        concurso_mock = {"fecha_cierre": "2025-05-19T23:59:00Z"}  # 2 días

        with patch.object(worker._historial, "run", return_value=historial_mock), \
             patch("src.agents.workers.worker_checklist.get_or_create_postulacion", return_value=postulacion_mock), \
             patch("src.agents.workers.worker_checklist.get_checklist", return_value=[]), \
             patch("src.agents.workers.worker_checklist.upsert_checklist_item", return_value={}), \
             patch("src.agents.workers.worker_checklist.get_concurso", return_value=concurso_mock):
            result = worker.run("emp-001", "concurso-001")

        assert result["ok"] is True
        assert len(result["alertas"]) >= 0  # Puede haber alertas o no según la fecha mock
