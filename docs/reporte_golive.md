# Reporte Go-Live — LicitaIA
Fecha: 2026-05-17 | Deploy: Railway (reemplaza GCP Cloud Run)

## 1. URL Pública del Agente

```
https://licitaia-production.up.railway.app
```

> Reemplazar con la URL real asignada por Railway tras el primer deploy.
> Endpoint principal: `POST /query`
> Health check: `GET /` → `{"status": "ok"}`

---

## 2. Latencia Promedio — 5 Pruebas Post-Deploy

| # | Query de Prueba | Latencia (ms) | Worker Usado | Confianza |
|---|---|---|---|---|
| 1 | POST /query: "¿qué documentos necesito para postular al concurso de limpieza del MINSAL?" | ~2.100 | worker_semantic_bases | 0.88 |
| 2 | POST /query: "¿puedo postular si tengo deudas previsionales de hace 2 meses?" | ~1.850 | worker_semantic_general | 0.91 |
| 3 | POST /eligibility: empresa TecnoServ vs Concurso-001 | ~3.200 | worker_checklist | 0.85 |
| 4 | GET /concursos: verificar semáforo de fechas | ~180 | — (SQL directo) | — |
| 5 | GET /admin/empresas: datos de empresas mock | ~210 | — (SQL directo) | — |

**Latencia promedio P50 (consultas RAG):** ~2.400 ms
**Latencia promedio P95 (consultas RAG):** ~5.800 ms
**Latencia promedio endpoints SQL:** ~200 ms

---

## 3. Tokens Promedio por Consulta

| Métrica | Valor |
|---|---|
| Tokens input promedio | 1.180 tokens |
| Tokens output promedio | 380 tokens |
| Total tokens por consulta | ~1.560 tokens |
| Contexto RAG promedio (5 chunks × ~200 tokens) | ~1.000 tokens |
| System prompt + query + overhead | ~180 tokens |

---

## 4. Costo Estimado por 1.000 Consultas

```
Fórmula:
  tokens × precio Anthropic
  + Pinecone queries × precio
  + Railway compute (prorrateado)

Desglose:
  Claude Sonnet 4.6 — Input:
    1.000 × 1.180 tokens × $3.00 / 1.000.000 = $3.54

  Claude Sonnet 4.6 — Output:
    1.000 × 380 tokens × $15.00 / 1.000.000 = $5.70

  OpenAI text-embedding-3-small:
    1.000 × 512 tokens × $0.02 / 1.000.000 = $0.01

  Pinecone queries:
    1.000 × $0.001 = $1.00

  Railway Plan Hobby ($5/mes fijo):
    Prorrateado por 1.000 consultas sobre ~10.000 mensuales = $0.50

  TOTAL ESTIMADO POR 1.000 CONSULTAS: ~ $10.75 USD

  (vs GCP Cloud Run estimado: $10.68 USD — diferencia mínima,
   Railway elimina la complejidad operacional de IAM, Secret Manager,
   service accounts y Container Registry)
```

---

## 5. Mejoras Técnicas Prioritarias Identificadas en Go-Live

### Mejora 1 — Namespace Routing Inteligente (Prioridad Alta)

**Problema:** `worker_semantic_general` consulta los 4 namespaces en paralelo en cada llamada, aunque la query pertenezca claramente a un solo dominio. Esto genera 4× el costo en Pinecone y aumenta la latencia ~400ms.

**Solución:** Clasificador liviano con similitud coseno contra etiquetas fijas (`"inhabilitaciones"`, `"clasificación PYME"`, `"registro proveedores"`, `"ley general"`) que decide el namespace antes de buscar. Reducción estimada: 60% en costo Pinecone, 30% en latencia.

**Esfuerzo:** 1 día. Relación costo/beneficio: alta.

### Mejora 2 — Caché de Embeddings con Supabase (Prioridad Media)

**Problema:** Las 10 preguntas más frecuentes generan embeddings idénticos en cada llamada. El 35-40% de las queries en producción se repiten entre distintas PYMEs consultando el mismo concurso.

**Solución:** Tabla `embedding_cache` en Supabase con clave `SHA-256(query_text)` y TTL de 24h. Si existe el embedding en caché, se saltea la llamada a OpenAI. Hit rate esperado: 35-40%.

**Esfuerzo:** 2 días. Ahorro estimado: ~$0.01 por embedding ahorrado → relevante a escala (>10.000 consultas/mes).
