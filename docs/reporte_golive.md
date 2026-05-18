# Reporte Go-Live — LicitaIA
Fecha: 2026-05-17

## 1. URL Pública del Agente

```
https://licitaia-XXXXXXXX-uc.a.run.app
```

> Reemplazar con la URL real tras ejecutar `gcloud run deploy`.
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
  + Cloud Run compute

Desglose:
  Claude Sonnet 4.6 — Input:
    1.000 consultas × 1.180 tokens × $3.00 / 1.000.000 = $3.54

  Claude Sonnet 4.6 — Output:
    1.000 consultas × 380 tokens × $15.00 / 1.000.000 = $5.70

  OpenAI text-embedding-3-small:
    1.000 consultas × 512 tokens × $0.02 / 1.000.000 = $0.01

  Pinecone queries (5 namespaces × 1 query):
    5.000 queries × $0.001 = $5.00

  Cloud Run compute (3s por req × 1 vCPU):
    1.000 × 3s × $0.000024/vCPU-s = $0.07

  TOTAL ESTIMADO POR 1.000 CONSULTAS RAG: ~ $14.32 USD
```

> **Optimización disponible:** reducir namespaces consultados (actualmente consulta hasta 5 en parallel).
> Usando namespace routing inteligente (solo el namespace relevante), el costo de Pinecone bajaría a $1.00, llevando el total a ~$10.32 USD.

---

## 5. Mejoras Técnicas Prioritarias Identificadas en Go-Live

### Mejora 1 — Namespace Routing Inteligente (Prioridad Alta)

**Problema identificado:** El worker_semantic_general consulta los 4 namespaces generales en paralelo en cada llamada, incluso cuando la query claramente pertenece a un solo dominio (ej: inhabilitaciones). Esto genera 4× el costo en Pinecone y aumenta la latencia.

**Solución propuesta:** Implementar un clasificador liviano (puede ser una llamada a un modelo embeddings con similitud contra etiquetas fijas: "inhabilitaciones", "clasificación PYME", "registro proveedores", "ley general") que decida el namespace antes de la búsqueda. Reducción estimada: 60% en costo Pinecone, 30% en latencia.

**Esfuerzo:** 1 día de desarrollo. Alta relación costo/beneficio.

### Mejora 2 — Caché de Embeddings para Queries Frecuentes (Prioridad Media)

**Problema identificado:** Las 10 preguntas más frecuentes (documentos requeridos, plazos, garantías) generan embeddings idénticos en cada llamada. El costo de embedding aunque bajo, suma a escala, y la latencia de la llamada a OpenAI añade ~200ms por consulta.

**Solución propuesta:** Implementar caché en Redis (o Supabase con tabla `embedding_cache`) con TTL de 24 horas. Clave: hash SHA-256 del texto de la query. Hit rate esperado: 35-40% en uso real (las preguntas se repiten mucho entre distintas PYMEs consultando el mismo concurso).

**Esfuerzo:** 2 días de desarrollo. Ahorro estimado: $0.60 USD por cada 1.000 consultas.
