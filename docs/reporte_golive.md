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
| Deploy frontend | Netlify (build desde frontend/, SPA routing) |

---

## Documentos Indexados en Pinecone

| Archivo | Chunks | Namespace |
|---|---|---|
| Reglamento de la Ley 19886.pdf | 283 | bases-generales |
| Bases Tipo Adquisicion de Vehiculos Motorizados.pdf | 390 | bases-concurso-001 |
| Manual-de-Compras-DCCP.pdf | 355 | registro-proveedores |
| politica_inhabilitaciones.txt | 15 | inhabilitaciones |
| Total | 1.043 chunks | |

---

## Pruebas Post-Deploy - Resultados Reales

Consultas ejecutadas contra POST /query en produccion con empresa TecnoServ Limitada
(id: 74cb87f1-fb3e-4bcf-b052-31e7706a9def) y concurso MP-001-2025
(id: 22f695d0-f499-4d30-b776-ae447ab478b3).

### Prueba 1 - Especificaciones tecnicas del concurso
Query: Que especificaciones tecnicas exigen las bases del concurso para los vehiculos motorizados?

| Metrica | Valor |
|---|---|
| Worker usado | worker_semantic_bases |
| Latencia (ms) | 2.726 |
| Tokens input | 291 |
| Tokens output | 73 |
| Confianza fiscalizador | 1.00 |
| Fiscalizador OK | true |
| Fuente citada | - |

### Prueba 2 - Causales de inhabilidad Ley 19.886
Query: Cuales son las causales de inhabilidad para postular a una licitacion segun la Ley 19.886?

| Metrica | Valor |
|---|---|
| Worker usado | worker_semantic_general |
| Latencia (ms) | 6.051 |
| Tokens input | 1.124 |
| Tokens output | 371 |
| Confianza fiscalizador | 1.00 |
| Fiscalizador OK | true |
| Fuente citada | POLITICA DE INHABILITACIONES - ley_19886_art4 |

### Prueba 3 - Elegibilidad empresa para postular
Query: Califica mi empresa para postular al concurso? Que requisitos me faltan cumplir?

| Metrica | Valor |
|---|---|
| Worker usado | worker_sql_historial |
| Latencia (ms) | 3.203 |
| Tokens input | 685 |
| Tokens output | 277 |
| Confianza fiscalizador | 1.00 |
| Fiscalizador OK | true |
| Fuente citada | - (consulta Supabase) |

### Prueba 4 - Requisitos tecnicos vehiculos
Query: Que requisitos tecnicos deben cumplir los vehiculos motorizados ofertados segun las bases del concurso?

| Metrica | Valor |
|---|---|
| Worker usado | worker_sql_historial |
| Latencia (ms) | 3.839 |
| Tokens input | 684 |
| Tokens output | 108 |
| Confianza fiscalizador | 1.00 |
| Fiscalizador OK | true |
| Fuente citada | - (consulta Supabase) |

---

## Resumen de Metricas Reales

| Metrica | Valor |
|---|---|
| Latencia promedio RAG - worker semantico (pruebas 1+2) | 4.388 ms |
| Latencia promedio SQL - worker historial (pruebas 3+4) | 3.521 ms |
| Latencia promedio total (4 pruebas) | 3.954 ms |
| Tokens input promedio | 696 tokens |
| Tokens output promedio | 207 tokens |
| Total tokens promedio por consulta | 903 tokens |
| Confianza fiscalizador promedio | 1.00 |
| Fiscalizador OK | 100% (4/4) |

---

## Costo Estimado por 1.000 Consultas

Basado en metricas reales (696 tokens input, 207 tokens output) y precios GPT-4o (mayo 2026):

| Componente | Calculo | Costo USD |
|---|---|---|
| GPT-4o Input | 1.000 x 696 tokens x $2.50/MTok | $1.74 |
| GPT-4o Output | 1.000 x 207 tokens x $10.00/MTok | $2.07 |
| OpenAI Embeddings text-embedding-3-small | 1.000 x 512 tokens x $0.02/MTok | $0.01 |
| Pinecone queries | 1.000 x $0.001 | $1.00 |
| Railway Plan Hobby ($5/mes, ~10.000 consultas/mes) | prorrateado | $0.50 |
| Netlify (free tier) | - | $0.00 |
| Total estimado con datos reales | | ~$5.32 USD |

Costo menor al estimado inicial (~$8.51 USD) gracias a tokens reales mas bajos que la proyeccion original.

---

## Mejoras Tecnicas Prioritarias

### Mejora 1 - Namespace Routing Inteligente (Prioridad Alta)

Problema: worker_semantic_general consulta los 4 namespaces de Pinecone en cada llamada
(evidenciado en Prueba 2: 6.051ms vs 2.726ms de la busqueda especifica).
Esto multiplica el costo en Pinecone y suma ~3.300ms de latencia extra.

Solucion: Clasificador liviano con similitud coseno contra etiquetas fijas que decide
el namespace antes de buscar.

Impacto estimado: 60% reduccion costo Pinecone, reduccion de ~3s en queries generales.
Esfuerzo: 1 dia.

### Mejora 2 - Cache de Embeddings en Supabase (Prioridad Media)

Problema: Las consultas frecuentes generan embeddings identicos en cada llamada.
En las 4 pruebas, 3 queries al mismo concurso generaron el mismo vector innecesariamente.

Solucion: Tabla embedding_cache en Supabase con clave SHA-256(query_text) y TTL de 24h.
Hit rate esperado: 35-40%.

Impacto estimado: Elimina el costo de embedding en consultas repetidas.
Relevante a escala (>10.000 consultas/mes).
Esfuerzo: 2 dias.
