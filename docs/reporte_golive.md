# Reporte Go-Live — LicitaIA
Fecha: 2026-05-18 | Deploy: Railway (backend) + Netlify (frontend)

---

## URLs del Sistema

| Servicio | URL |
|---|---|
| **Frontend (Netlify)** | https://licitaia-7a9a89.netlify.app |
| **Backend API (Railway)** | https://licitaia-production-4e54.up.railway.app |
| **API Docs (Swagger)** | https://licitaia-production-4e54.up.railway.app/docs |
| **Repositorio GitHub** | https://github.com/Datascients/LicitaIA |

---

## Stack Tecnológico Real

| Componente | Tecnología |
|---|---|
| LLM principal | OpenAI GPT-4o |
| Embeddings | OpenAI text-embedding-3-small (1.536 dims) |
| Vector DB | Pinecone Serverless (AWS us-east-1) |
| Base de datos | Supabase (PostgreSQL) |
| Backend | FastAPI + Uvicorn (Python 3.11) |
| Frontend | React 19 + TypeScript + Vite 8 + Tailwind CSS v4 |
| Deploy backend | Railway (Dockerfile, auto-deploy desde GitHub) |
| Deploy frontend | Netlify (build desde `frontend/`, SPA routing) |

---

## Documentos Indexados en Pinecone

| Archivo | Chunks | Namespace |
|---|---|---|
| Reglamento de la Ley 19886.pdf | 283 | `bases-generales` |
| Bases Tipo Adquisición de Vehículos Motorizados.pdf | 390 | `bases-concurso-001` |
| Manual-de-Compras-DCCP.pdf | 355 | `registro-proveedores` |
| politica_inhabilitaciones.txt | 15 | `inhabilitaciones` |
| **Total** | **1.043 chunks** | |

---

## 5 Preguntas de Prueba Post-Deploy

Las siguientes consultas deben ejecutarse contra `POST /query` con un `empresa_id` y `concurso_id` válidos de Supabase. Registrar latencia y tokens reales de la respuesta del sistema.

### Pregunta 1 — worker_semantic_bases
**Query:** `"¿Qué requisitos técnicos deben cumplir los vehículos motorizados ofertados según las bases del concurso?"`
**Worker esperado:** `worker_semantic_bases`
**Namespace:** `bases-concurso-001`

| Métrica | Valor |
|---|---|
| Latencia (ms) | _5857m ms_ |
| Tokens input | _291_ |
| Tokens output | _69_ |
| Confianza fiscalizador | _1.00_ |
| Fuente citada | _completar_ |

---

### Pregunta 2 — worker_semantic_general (inhabilitaciones)
**Query:** `"¿Cuáles son las causales de inhabilidad para postular a una licitación según la Ley 19.886?"`
**Worker esperado:** `worker_semantic_general`
**Namespace:** `inhabilitaciones` + `bases-generales`

| Métrica | Valor |
|---|---|
| Latencia (ms) | _completar_ |
| Tokens input | _completar_ |
| Tokens output | _completar_ |
| Confianza fiscalizador | _completar_ |
| Fuente citada | _completar_ |

---

### Pregunta 3 — worker_semantic_general (registro proveedores)
**Query:** `"¿Qué documentos necesito para inscribirme en ChileProveedores y mantener mi registro vigente?"`
**Worker esperado:** `worker_semantic_general`
**Namespace:** `registro-proveedores`

| Métrica | Valor |
|---|---|
| Latencia (ms) | _completar_ |
| Tokens input | _completar_ |
| Tokens output | _completar_ |
| Confianza fiscalizador | _completar_ |
| Fuente citada | _completar_ |

---

### Pregunta 4 — worker_semantic_bases (penalidades)
**Query:** `"¿Qué penalidades aplica el organismo comprador si no cumplo el plazo de entrega de los vehículos?"`
**Worker esperado:** `worker_semantic_bases`
**Namespace:** `bases-concurso-001`

| Métrica | Valor |
|---|---|
| Latencia (ms) | _completar_ |
| Tokens input | _completar_ |
| Tokens output | _completar_ |
| Confianza fiscalizador | _completar_ |
| Fuente citada | _completar_ |

---

### Pregunta 5 — worker_sql_historial (elegibilidad)
**Query:** `"¿Califica mi empresa para postular al concurso? ¿Qué requisitos me faltan cumplir?"`
**Worker esperado:** `worker_sql_historial`
**Fuente:** Supabase (tabla `empresas` + `postulaciones`)

| Métrica | Valor |
|---|---|
| Latencia (ms) | _completar_ |
| Tokens input | _completar_ |
| Tokens output | _completar_ |
| Confianza fiscalizador | _completar_ |
| Califica (bool) | _completar_ |

---

## Resumen de Métricas Post-Pruebas

| Métrica | Valor |
|---|---|
| Latencia promedio RAG (ms) | _completar tras 5 pruebas_ |
| Latencia promedio SQL (ms) | _completar tras 5 pruebas_ |
| Tokens input promedio | _completar_ |
| Tokens output promedio | _completar_ |
| Confianza fiscalizador promedio | _completar_ |

---

## Costo Estimado por 1.000 Consultas

Basado en precios GPT-4o (mayo 2026):

| Componente | Cálculo | Costo USD |
|---|---|---|
| GPT-4o — Input | 1.000 × 1.200 tokens × $2.50/MTok | $3.00 |
| GPT-4o — Output | 1.000 × 400 tokens × $10.00/MTok | $4.00 |
| OpenAI Embeddings (text-embedding-3-small) | 1.000 × 512 tokens × $0.02/MTok | $0.01 |
| Pinecone queries | 1.000 × $0.001 | $1.00 |
| Railway Plan Hobby ($5/mes, ~10.000 consultas/mes) | prorrateado | $0.50 |
| Netlify (free tier) | 0 | $0.00 |
| **Total estimado** | | **~$8.51 USD** |

---

## Mejoras Técnicas Prioritarias

### Mejora 1 — Namespace Routing Inteligente (Prioridad Alta)

**Problema:** `worker_semantic_general` consulta los 4 namespaces de Pinecone en cada llamada, aunque la query pertenezca claramente a un solo dominio. Esto multiplica el costo en Pinecone y suma ~400ms de latencia.

**Solución:** Clasificador liviano con similitud coseno contra etiquetas fijas (`"inhabilitaciones"`, `"clasificación PYME"`, `"registro proveedores"`, `"ley general"`) que decide el namespace antes de buscar.

**Impacto estimado:** 60% reducción costo Pinecone, 30% reducción latencia.
**Esfuerzo:** 1 día.

---

### Mejora 2 — Caché de Embeddings en Supabase (Prioridad Media)

**Problema:** Las consultas frecuentes sobre el mismo concurso generan embeddings idénticos en cada llamada, pagando innecesariamente a OpenAI por el mismo vector.

**Solución:** Tabla `embedding_cache` en Supabase con clave `SHA-256(query_text)` y TTL de 24h. Hit rate esperado: 35-40%.

**Impacto estimado:** Ahorro $0.01 por embedding cacheado, relevante a escala (>10.000 consultas/mes).
**Esfuerzo:** 2 días.
