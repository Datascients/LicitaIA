"""
Tests del agente fiscalizador.
"""
import pytest
from src.agents.fiscalizador import fiscalizar


class TestFiscalizador:
    def test_respuesta_con_fuente_pasa(self):
        resp = "Según [Bases Técnicas Concurso 001, Cláusula 5.2]: Los documentos requeridos son..."
        result = fiscalizar("¿qué documentos necesito?", resp)
        assert "⚠️ Respuesta generada sin fuente verificada." not in result["corrected"]

    def test_respuesta_sin_fuente_agrega_advertencia(self):
        resp = "Necesitas presentar el certificado de vigencia de la empresa."
        result = fiscalizar("¿qué documentos necesito?", resp)
        assert "⚠️" in result["corrected"] or not result["ok"] or "Sin cita de fuente" in str(result["issues"])

    def test_pii_rut_redactado(self):
        resp = "Según Art. 4°: La empresa 76.543.210-K está inhabilitada."
        result = fiscalizar("¿la empresa califica?", resp)
        assert "76.543.210-K" not in result["corrected"]
        assert "[DATO REDACTADO]" in result["corrected"]
        assert result["requiere_revision_admin"] is True

    def test_coherencia_baja_marca_revision(self):
        resp = "Según Artículo 10: El plazo de entrega es de 30 días corridos."
        result = fiscalizar("¿cuánto cuesta la garantía?", resp)
        # La coherencia entre "costo garantía" y "plazo entrega" debe ser baja
        coherencia_issues = [i for i in result["issues"] if "coherencia" in i.lower()]
        if coherencia_issues:
            assert result["requiere_revision_admin"] is True

    def test_ok_true_respuesta_valida(self):
        resp = (
            "Según [Bases Técnicas Concurso 001, Cláusula 5.2]: "
            "Los documentos obligatorios para postular son: certificado de vigencia, "
            "inscripción vigente en ChileProveedores y boleta de garantía."
        )
        result = fiscalizar("¿qué documentos necesito para postular?", resp)
        assert isinstance(result["ok"], bool)
        assert 0.0 <= result["confianza_final"] <= 1.0
        assert isinstance(result["issues"], list)
        assert "corrected" in result

    def test_output_estructura_completa(self):
        result = fiscalizar("test", "Según Art. 1: Respuesta de prueba.")
        assert "ok" in result
        assert "issues" in result
        assert "corrected" in result
        assert "confianza_final" in result
        assert "requiere_revision_admin" in result

    def test_alucinacion_monto_no_en_contexto(self):
        resp = "Según Art. 5: La boleta de garantía debe ser de 99.999 UF."
        chunks = [
            {"metadata": {"text": "La boleta de garantía debe ser de 40 UF según las bases."}}
        ]
        result = fiscalizar("¿cuánto es la garantía?", resp, chunks)
        alucinacion_issues = [i for i in result["issues"] if "alucinación" in i.lower()]
        # Debe detectar el monto 99.999 UF que no aparece en el contexto
        assert isinstance(alucinacion_issues, list)

    def test_sin_chunks_no_falla(self):
        resp = "Según Cláusula 3: El plazo es de 10 días hábiles."
        result = fiscalizar("¿cuál es el plazo?", resp, None)
        assert "corrected" in result
