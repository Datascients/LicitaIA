# LicitaIA — Plataforma RAG Multi-Agente para PYMEs en Licitaciones Públicas

LicitaIA ayuda a las PYMEs chilenas a evaluar su elegibilidad para postular a licitaciones en Mercado Público (ChileCompra). El sistema analiza las bases de cada concurso, verifica el perfil de la empresa y responde preguntas legales citando exactamente la cláusula o artículo correspondiente.

## URLs del Sistema

| Servicio | URL |
|---|---|
| **Frontend** | https://licitaia-7a9a89.netlify.app |
| **Backend API** | https://licitaia-production-4e54.up.railway.app |
| **API Docs (Swagger)** | https://licitaia-production-4e54.up.railway.app/docs |
| **Repositorio GitHub** | https://github.com/Datascients/LicitaIA |

## Credenciales de prueba

| Rol | Usuario | Contraseña | Destino |
|---|---|---|---|
| Administrador | `Admin` | `1234` | `/admin` |
| PYME (demo) | cualquier email | cualquier contraseña | `/dashboard` |

---

## Arquitectura del Sistema

```
Usuario (React + Netlify)
       │
       ▼
  FastAPI (Railway)
       │
       ▼
  Orquestador LicitaBot (GPT-4o)
  ├── worker_semantic_bases    → Pinecone [bases-concurso-{id}]
  ├── worker_semantic_general  → Pinecone [bases-generales, requisitos-pyme, inhabilitaciones, registro-proveedores]
  ├── worker_sql_historial     → Supabase (empresas, postulaciones, checklists)
  └── worker_checklist         → Supabase + worker_sql_historial
       │
       ▼
  Fiscalizador (valida fuentes, PII, coherencia, alucinaciones)
       │
       ▼
  Respuesta verificada al usuario
```

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| LLM | OpenAI GPT-4o |
| Embeddings | OpenAI text-embedding-3-small |
| Vector DB | Pinecone Serverless (AWS us-east-1) |
| Base de datos | Supabase (PostgreSQL) |
| Backend | FastAPI 0.111 + Uvicorn + Python 3.11 |
| Frontend | React 19 + TypeScript + Vite 8 + Tailwind CSS v4 |
| Deploy backend | Railway (Dockerfile, auto-deploy en push a `main`) |
| Deploy frontend | Netlify (build desde `/frontend`, SPA routing) |

---

## Documentos Indexados

| Documento | Chunks | Namespace Pinecone |
|---|---|---|
| Reglamento de la Ley 19886.pdf | 283 | `bases-generales` |
| Bases Tipo Adquisición de Vehículos Motorizados.pdf | 390 | `bases-concurso-001` |
| Manual-de-Compras-DCCP.pdf | 355 | `registro-proveedores` |
| politica_inhabilitaciones.txt | 15 | `inhabilitaciones` |
| **Total** | **1.043 chunks** | |

---

## Instalación Local

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/Datascients/LicitaIA.git
cd LicitaIA
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # Linux/Mac
pip install -r requirements.txt
cp .env.example .env          # Completar con credenciales reales
```

### 2. Variables de entorno (`.env`)

```env
OPENAI_API_KEY=               # OpenAI API Key (GPT-4o + embeddings)
PINECONE_API_KEY=             # Pinecone API Key
PINECONE_INDEX_NAME=licitaia-docs
SUPABASE_URL=                 # URL del proyecto Supabase
SUPABASE_ANON_KEY=            # Anon key (frontend)
SUPABASE_SERVICE_ROLE_KEY=    # Service role key (backend)
ENVIRONMENT=development
PORT=8080
```

### 3. Indexar documentos en Pinecone

Coloca los PDFs y TXTs en la carpeta `/docs` y ejecuta:

```bash
python -m src.indexer.load_documents
```

El script chunkeará por cláusula/artículo, generará embeddings en batch con `text-embedding-3-small` y subirá a Pinecone con metadatos completos.

### 4. Levantar el backend

```bash
uvicorn src.api.main:app --host 0.0.0.0 --port 8080 --reload
```

API disponible en `http://localhost:8080` · Swagger UI en `http://localhost:8080/docs`

### 5. Levantar el frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend disponible en `http://localhost:5173`

---

## Endpoints de la API

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/query` | Consulta al orquestador RAG |
| `POST` | `/eligibility` | Checklist de elegibilidad empresa/concurso |
| `GET` | `/concursos` | Lista concursos activos con semáforo |
| `GET` | `/empresa/{id}` | Ficha empresa + postulaciones + feedbacks |
| `POST` | `/empresa` | Crear o actualizar ficha empresa |
| `GET` | `/admin/empresas` | Listado admin con filtros |
| `POST` | `/admin/feedback` | Enviar feedback a una empresa |

### Ejemplo de consulta al agente

```bash
curl -X POST https://licitaia-production-4e54.up.railway.app/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "¿Qué documentos necesito para postular al concurso de vehículos?",
    "empresa_id": "uuid-de-empresa",
    "concurso_id": "uuid-de-concurso"
  }'
```

---

## Estructura del Proyecto

```
LicitaIA/
├── src/
│   ├── api/
│   │   └── main.py               # FastAPI endpoints
│   ├── agents/
│   │   ├── orchestrator.py       # Orquestador central (GPT-4o)
│   │   ├── fiscalizador.py       # Agente validador de respuestas
│   │   └── workers/
│   │       ├── worker_semantic_bases.py    # Búsqueda en bases del concurso
│   │       ├── worker_semantic_general.py  # Búsqueda en normativa general
│   │       ├── worker_sql_historial.py     # Historial empresa en Supabase
│   │       └── worker_checklist.py         # Checklist visual de requisitos
│   ├── retriever/
│   │   └── semantic_search.py    # Búsqueda híbrida KNN + BM25 + re-ranking
│   ├── indexer/
│   │   └── load_documents.py     # Pipeline de indexación de documentos
│   └── db/
│       └── supabase_client.py    # Cliente Supabase (empresas, concursos, logs)
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.tsx       # Landing + login/registro
│   │   │   ├── Dashboard.tsx     # Dashboard PYME con semáforo
│   │   │   ├── FichaEmpresa.tsx  # Onboarding 4 pasos
│   │   │   ├── MiEmpresa.tsx     # Perfil + postulaciones
│   │   │   └── AdminPanel.tsx    # Panel administrador
│   │   ├── components/
│   │   │   ├── ChatbotWidget.tsx # Widget LicitaBot (flotante)
│   │   │   ├── Navbar.tsx
│   │   │   └── SemaforoTag.tsx
│   │   └── context/
│   │       └── AppContext.tsx    # Estado global + persistencia localStorage
│   └── public/
│       └── _redirects            # Netlify SPA routing
├── docs/
│   ├── Reglamento de la Ley 19886.pdf
│   ├── Bases Tipo Adquisición de Vehículos Motorizados.pdf
│   ├── Manual-de-Compras-DCCP.pdf
│   ├── politica_inhabilitaciones.txt
│   └── reporte_golive.md
├── Dockerfile                    # Build para Railway
├── railway.toml                  # Config Railway (healthcheck, restart policy)
├── netlify.toml                  # Config Netlify (base, publish, redirects)
├── vercel.json                   # Config Vercel (ignorado, se usa Netlify)
├── requirements.txt
└── .env.example
```

---

## Deploy

### Backend — Railway

Railway hace auto-deploy en cada push a `main`. Para deploy manual:

```bash
git push origin main
```

Variables de entorno requeridas en Railway:

| Variable | Descripción |
|---|---|
| `OPENAI_API_KEY` | OpenAI API Key |
| `PINECONE_API_KEY` | Pinecone API Key |
| `PINECONE_INDEX_NAME` | `licitaia-docs` |
| `SUPABASE_URL` | URL proyecto Supabase |
| `SUPABASE_ANON_KEY` | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `ENVIRONMENT` | `production` |

> `PORT` es inyectado automáticamente por Railway.

### Frontend — Netlify

Netlify hace auto-deploy en cada push a `main` usando `netlify.toml`:
- **Base directory:** `frontend/`
- **Build command:** `npm run build`
- **Publish directory:** `frontend/dist`

La variable `VITE_API_URL` está definida en `frontend/.env.production` apuntando al backend de Railway.

---

## Supabase — Tablas

| Tabla | Descripción |
|---|---|
| `empresas` | Ficha PYME: RUT, ventas UF, clasificación, estado inhabilitaciones |
| `concursos` | Concursos activos con fecha de cierre y código Mercado Público |
| `postulaciones` | Relación empresa ↔ concurso con estado del proceso |
| `checklists` | Ítems de requisitos con estado: cumple / no_cumple / pendiente |
| `interactions` | Log completo: query, respuesta, tokens, latencia, fiscalizador |
| `feedbacks_admin` | Mensajes del administrador a cada empresa |

---

## Costo Estimado por 1.000 Consultas

| Componente | Costo USD |
|---|---|
| GPT-4o Input (1.200 tokens × 1.000) | $3.00 |
| GPT-4o Output (400 tokens × 1.000) | $4.00 |
| OpenAI Embeddings | $0.01 |
| Pinecone queries | $1.00 |
| Railway (prorrateado) | $0.50 |
| Netlify (free tier) | $0.00 |
| **Total** | **~$8.51 USD** |
