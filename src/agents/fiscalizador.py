"""
Paso 05 — Agente Fiscalizador.
Valida TODA respuesta del orquestador antes de mostrarla al usuario.
"""
import re
from typing import Any


# Patrones de datos PII
_PII_PATTERNS = [
    r"\b\d{2}\.\d{3}\.\d{3}-[\dkK]\b",   # RUT chileno
    r"\b\d{8}-\d\b",                        # RUT formato alternativo
    r"\b\d{16}\b",                          # Número tarjeta bancaria
    r"\bCBU\s*\d{22}\b",                    # CBU argentino
    r"\bIBAN\s*[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}\b",
]

# Palabras clave que indican datos sensibles de competidores
_COMPETITOR_KEYWORDS = [
    "precio de competidor", "oferta de otra empresa", "evaluación de empresa",
    "cotización de tercero", "puntuación rival",
]

MENSAJE_SIN_FUENTE = "⚠️ Respuesta generada sin fuente verificada."
MENSAJE_NO_VERIFICADA = (
    "No pude encontrar información verificada sobre esto en las bases. "
    "Por favor consulta con el administrador de la plataforma."
)


def _check_source_citation(response: str) -> bool:
    """Verifica si la respuesta cita una fuente explícita."""
    patterns = [
        r"Según\s+\[?[^\]]+\]?,",
        r"(Cláusula|Artículo|Art\.|Sección)\s+\d+",
        r"\[.+?—.+?\]",
    ]
    return any(re.search(p, response, re.IGNORECASE) for p in patterns)


def _redact_pii(response: str) -> tuple[str, list[str]]:
    """Redacta datos PII y retorna texto limpio + lista de issues."""
    issues = []
    for pattern in _PII_PATTERNS:
        if re.search(pattern, response):
            response = re.sub(pattern, "[DATO REDACTADO]", response)
            issues.append("Datos personales (PII) detectados y redactados.")
    return response, issues


def _check_competitor_data(response: str) -> list[str]:
    issues = []
    for kw in _COMPETITOR_KEYWORDS:
        if kw.lower() in response.lower():
            issues.append(f"Posible exposición de datos sensibles de competidores: '{kw}'.")
    return issues


def _coherence_score(query: str, response: str) -> float:
    """
    Heurística de coherencia: porcentaje de palabras clave del query
    que aparecen en la respuesta.
    """
    if not query or not response:
        return 0.5
    query_words = set(re.findall(r"\b\w{4,}\b", query.lower()))
    resp_words = set(re.findall(r"\b\w{4,}\b", response.lower()))
    if not query_words:
        return 1.0
    overlap = len(query_words & resp_words) / len(query_words)
    return round(min(1.0, overlap * 2), 2)  # *2 porque ~50% overlap ya es coherente


def _check_hallucinations(response: str, context_chunks: list[dict]) -> list[str]:
    """
    Verifica que montos y fechas en la respuesta estén presentes en el contexto.
    """
    issues = []
    context_text = " ".join(
        c.get("metadata", {}).get("text", "") for c in context_chunks
    ).lower()

    # Detectar montos en UF en la respuesta
    montos_resp = re.findall(r"(\d[\d.,]+)\s*UF", response, re.IGNORECASE)
    for monto in montos_resp:
        monto_clean = monto.replace(".", "").replace(",", "")
        if monto_clean not in re.sub(r"[.,]", "", context_text):
            issues.append(f"Posible alucinación: monto '{monto} UF' no verificado en contexto.")

    # Detectar fechas en la respuesta
    fechas_resp = re.findall(r"\b(\d{1,2}/\d{1,2}/\d{4}|\d{4}-\d{2}-\d{2})\b", response)
    for fecha in fechas_resp:
        fecha_norm = fecha.replace("/", "-")
        if fecha_norm not in context_text and fecha not in context_text:
            issues.append(f"Posible alucinación: fecha '{fecha}' no verificada en contexto.")

    return issues


def fiscalizar(
    query: str,
    response: str,
    context_chunks: list[dict] | None = None,
) -> dict:
    """
    Valida y corrige la respuesta del orquestador.
    Retorna el output estándar del fiscalizador.
    """
    issues: list[str] = []
    context_chunks = context_chunks or []
    corrected = response
    requiere_admin = False
    confianza = 1.0

    # 1. Verificar cita de fuente
    if not _check_source_citation(corrected):
        corrected += f"\n\n{MENSAJE_SIN_FUENTE}"
        issues.append("Sin cita de fuente verificada.")
        confianza -= 0.1

    # 2. Redactar PII
    corrected, pii_issues = _redact_pii(corrected)
    if pii_issues:
        issues.extend(pii_issues)
        requiere_admin = True
        confianza -= 0.2

    # 3. Coherencia con la pregunta
    coherencia = _coherence_score(query, corrected)
    if coherencia < 0.6:
        issues.append(f"Baja coherencia con la pregunta (score: {coherencia}). Revisar manualmente.")
        requiere_admin = True
        confianza -= 0.25

    # 4. Datos sensibles de competidores
    competitor_issues = _check_competitor_data(corrected)
    if competitor_issues:
        issues.extend(competitor_issues)
        # Filtrar menciones problemáticas
        for kw in _COMPETITOR_KEYWORDS:
            corrected = re.sub(re.escape(kw), "[INFORMACIÓN FILTRADA]", corrected, flags=re.IGNORECASE)
        requiere_admin = True
        confianza -= 0.3

    # 5. Detección de alucinaciones
    if context_chunks:
        hal_issues = _check_hallucinations(corrected, context_chunks)
        if hal_issues:
            issues.extend(hal_issues)
            confianza -= 0.15 * len(hal_issues)

    confianza = round(max(0.0, min(1.0, confianza)), 2)
    ok = len([i for i in issues if "alucinación" in i.lower() or "pii" in i.lower() or "competidores" in i.lower()]) == 0
    ok = ok and coherencia >= 0.6

    if not ok:
        corrected = MENSAJE_NO_VERIFICADA

    return {
        "ok": ok,
        "issues": issues,
        "corrected": corrected,
        "confianza_final": confianza,
        "requiere_revision_admin": requiere_admin,
    }
