No se ha encontrado ninguna página web para la dirección http://localhost:5176/.# ✅ Checklist de Validación — LicitaIA
> Basado en los 10 pasos del curso. Marcar cada ítem con `[x]` al validar.

---

## PARTE 1 · Fundamentos y arquitectura del agente

---

### 01 · Documentos de Negocio

- [ ] Se seleccionaron entre 3 y 5 documentos representativos
- [ ] Los formatos usados son válidos: `.pdf`, `.docx` o `.txt`
- [ ] Los documentos están organizados en la carpeta `/docs` con un `README.md`
- [ ] Está definido qué preguntas debe responder el agente por cada documento

---

### 02 · Embeddings → Vector DB

- [ ] Se aplica chunking con overlap a los documentos
- [ ] Se generan embeddings con `text-embedding-3-small` o `voyage-3`
- [ ] Los vectores se cargan en Pinecone (índice `documentos` poblado)
- [ ] Cada chunk incluye metadata: `fuente`, `fecha`, `sección`

---

### 03 · Agente Orquestador

- [ ] Está definido el rol y el system prompt del agente principal
- [ ] Se listan las herramientas y workers disponibles
- [ ] Están establecidos los criterios de delegación a cada worker
- [ ] Está definido el formato de salida estándar (JSON)

---

### 04 · Agentes Workers

- [ ] Se crearon al menos 2 agentes especializados
- [ ] Existe un worker de búsqueda semántica (Pinecone)
- [ ] Existe un worker de consulta SQL (`worker_sql_historial`)
- [ ] Se implementó manejo de errores y reintentos en cada worker

---

### 05 · Agente Fiscalizador

- [ ] Valida que la respuesta cite fuentes (artículo o cláusula)
- [ ] Detecta datos sensibles o PII antes de responder al usuario
- [ ] Verifica que la respuesta corresponda a la pregunta original
- [ ] Retorna el objeto `{ ok, issues, corrected }`

---

### 06 · Búsqueda Semántica (KNN)

- [ ] El retriever está configurado con `k=5`
- [ ] Se probó con 10 consultas reales documentadas
- [ ] Se midió precisión@k manualmente (chunk correcto en top-5)
- [ ] Se evaluó re-ranking y/o hybrid search (BM25 + KNN)

---

## PARTE 2 · Persistencia, versionado y go-live

---

### 07 · SQL para Registros

- [ ] Existe la tabla `interactions` diseñada para trazabilidad
- [ ] La tabla incluye los campos: `id`, `timestamp`, `query`, `response`, `tokens`, `latency`
- [ ] La conexión es vía SQLAlchemy o cliente nativo (Supabase)
- [ ] Se registra cada interacción del orquestador sin excepción

---

### 08 · Subir a GitHub

- [ ] El repositorio tiene la estructura `/src`, `/tests`, `requirements.txt`
- [ ] Están incluidos `.env.example` y `.gitignore`
- [ ] El `README.md` documenta el setup completo (instalación, variables, deploy)
- [ ] Hay mínimo 3 commits significativos con mensajes descriptivos

---

### 09 · Conectar GCP Cloud Run

- [ ] El `Dockerfile` fue escrito y probado localmente
- [ ] Se habilitaron las APIs necesarias y se creó el service account
- [ ] Las API keys están configuradas en Secret Manager
- [ ] Están definidos los límites de costo y concurrencia máxima

---

### 10 · Deploy & Go Live

- [ ] Se ejecutó `gcloud run deploy` exitosamente
- [ ] Se probó el endpoint con 5 consultas reales post-deploy
- [ ] Se monitorean latencia y logs en Cloud Console
- [ ] Se reportó el costo estimado por 1.000 consultas (USD)

---

## 🏁 Entregable Final

- [ ] **URL pública** del agente desplegado en Cloud Run responde correctamente
- [ ] **URL de la app** (Lovable) funcionando contra la API de Cloud Run
- [ ] **Repositorio GitHub** con estructura completa y README documentado
- [ ] **Reporte `/docs/reporte_golive.md`** entregado con:
  - [ ] Latencia promedio de las 5 pruebas (ms)
  - [ ] Tokens promedio por consulta (input + output)
  - [ ] Costo estimado por 1.000 consultas (USD)
  - [ ] 2 mejoras técnicas prioritarias identificadas

---

## Resumen de avance

| Parte | Pasos | Ítems totales | Completados |
|---|---|---|---|
| Parte 1 — Arquitectura | 01 al 06 | 24 | `__` / 24 |
| Parte 2 — Go-live | 07 al 10 | 16 | `__` / 16 |
| Entregable final | — | 7 | `__` / 7 |
| **Total** | **10 pasos** | **47** | `__` / 47 |

---

*Checklist generado para el proyecto LicitaIA — Plataforma de licitaciones públicas para PYMEs chilenas*