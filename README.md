# LicitaIA — Plataforma RAG Multi-Agente para PYMEs en Licitaciones Públicas

LicitaIA ayuda a las PYMEs chilenas sin abogados a evaluar su elegibilidad para postular a licitaciones en Mercado Público (ChileCompra). El sistema analiza las bases de cada concurso, verifica el perfil de la empresa y responde preguntas legales citando exactamente la cláusula o artículo correspondiente.

La plataforma implementa una arquitectura RAG multi-agente con un orquestador central, cuatro workers especializados, un agente fiscalizador y búsqueda semántica híbrida sobre Pinecone. El backend corre en FastAPI deployado en Railway, con Supabase como base de datos relacional y una interfaz construida en Lovable (React + TypeScript).

## Arquitectura del sistema

```
Usuario (Lovable UI)
       │
       ▼
  FastAPI (Railway)
       │
       ▼
  Orquestador (LicitaBot)
  ├── worker_semantic_bases    → Pinecone [bases-concurso-{id}]
  ├── worker_semantic_general  → Pinecone [bases-generales, requisitos-pyme, inhabilitaciones]
  ├── worker_sql_historial     → Supabase (empresas, postulaciones, checklists)
  └── worker_checklist         → Supabase + worker_sql_historial
       │
       ▼
  Fiscalizador (valida PII, fuente, coherencia, alucinaciones)
       │
       ▼
  Respuesta verificada al usuario
```

## Variables de entorno requeridas

```env
ANTHROPIC_API_KEY=         # API Key de Anthropic (Claude Sonnet 4.6)
PINECONE_API_KEY=          # API Key de Pinecone
PINECONE_ENVIRONMENT=      # Ej: us-east-1-aws
PINECONE_INDEX_NAME=licitaia-docs
SUPABASE_URL=              # URL del proyecto Supabase (ver panel → Settings → API)
SUPABASE_ANON_KEY=         # Anon key (público, seguro para frontend)
SUPABASE_SERVICE_ROLE_KEY= # Service role key (privado, solo backend)
ENVIRONMENT=development    # development | production
PORT=8080                  # Railway lo inyecta automáticamente
```

## Instalación paso a paso

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/tu-usuario/licitaia.git
cd licitaia
python -m venv .venv
source .venv/bin/activate      # Linux/Mac
.venv\Scripts\activate         # Windows
pip install -r requirements.txt
cp .env.example .env           # Completar con credenciales reales
```

### 2. Configurar Supabase

Ver sección **"Supabase: configuración completa"** más abajo.

### 3. Levantar la API localmente

```bash
uvicorn src.api.main:app --reload --port 8080
```

API disponible en `http://localhost:8080` · Swagger UI en `http://localhost:8080/docs`

## Cargar documentos a Pinecone

Coloca los documentos en `/docs` (formatos `.pdf`, `.docx`, `.txt`) y ejecuta:

```bash
python -m src.indexer.load_documents
```

El script chunkeará por cláusula, generará embeddings en batch y subirá a Pinecone con metadatos completos.

## Cómo correr tests

```bash
pytest tests/ -v
pytest tests/ --cov=src --cov-report=term-missing
```

## Deploy en Railway (reemplaza GCP Cloud Run)

Railway es más simple que Cloud Run: conectas tu repositorio, configuras las variables de entorno en el panel web, y deploy automático en cada push a `main`.

### 1. Probar Docker localmente

```bash
docker build -t licitaia .
docker run -p 8080:8080 --env-file .env licitaia
curl http://localhost:8080/
```

### 2. Crear proyecto en Railway

1. Ir a [railway.app](https://railway.app) → **New Project**
2. Elegir **Deploy from GitHub repo** → conectar tu repositorio `licitaia`
3. Railway detecta el `Dockerfile` automáticamente

### 3. Configurar variables de entorno en Railway

En el panel del servicio → **Variables** → agregar:

| Variable | Valor |
|---|---|
| `ANTHROPIC_API_KEY` | tu key |
| `PINECONE_API_KEY` | tu key |
| `PINECONE_ENVIRONMENT` | ej: `us-east-1-aws` |
| `PINECONE_INDEX_NAME` | `licitaia-docs` |
| `SUPABASE_URL` | URL de tu proyecto |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key |
| `ENVIRONMENT` | `production` |

> Railway inyecta `PORT` automáticamente — no hace falta configurarlo.

### 4. Deploy

Railway hace deploy automático al hacer push. Para forzar un deploy manual:

```bash
# Opción A: via CLI de Railway
npm install -g @railway/cli
railway login
railway up

# Opción B: push a main dispara deploy automático
git push origin main
```

### 5. Obtener la URL pública

Railway asigna una URL del tipo `https://licitaia-production.up.railway.app`.
Ir a **Settings → Networking → Public Domain** para verla o personalizarla.

### 6. Verificar el deploy

```bash
curl https://tu-app.up.railway.app/
# → {"status":"ok","service":"LicitaIA API","version":"1.0.0"}

curl -X POST https://tu-app.up.railway.app/concursos
```

## Costo estimado por 1.000 consultas

| Componente | Cálculo | Costo USD |
|---|---|---|
| Claude Sonnet 4.6 input | 1.000 × 1.200 tokens × $3/MTok | $3.60 |
| Claude Sonnet 4.6 output | 1.000 × 400 tokens × $15/MTok | $6.00 |
| Pinecone queries | 1.000 queries × $0.001 | $1.00 |
| Railway compute | Plan Hobby ~$5/mes fijo | ~$0.05 |
| OpenAI embeddings | 1.000 × 512 tokens × $0.02/MTok | $0.01 |
| **Total estimado** | | **~$10.66 USD** |

> Railway Plan Hobby: $5 USD/mes fijo con 512MB RAM. Para producción usar Plan Pro ($20/mes, 8GB RAM, SLA 99.95%).

---

## Supabase: configuración completa

Supabase actúa como la base de datos relacional del sistema. Almacena los datos estructurados de empresas, concursos, postulaciones y el log de cada interacción del agente.

### Qué contiene en este proyecto

| Tabla | Para qué sirve |
|---|---|
| `empresas` | Ficha completa de cada PYME: RUT, ventas UF, estado habilitaciones, clasificación PYME |
| `concursos` | Registro de concursos activos con fecha de cierre y namespace en Pinecone |
| `postulaciones` | Relación empresa↔concurso con estado del proceso (guardado → enviado) |
| `checklists` | Cada ítem del checklist de requisitos con su estado: cumple / no_cumple / pendiente |
| `interactions` | Log completo de cada consulta al agente: query, respuesta, tokens, latencia, fiscalizador |
| `feedbacks_admin` | Mensajes del administrador a cada empresa (informativo / alerta / urgente) |

### Paso 1 — Ejecutar la migración

1. Ir a tu proyecto en [supabase.com](https://supabase.com) → **SQL Editor**
2. Copiar y ejecutar el contenido de `src/db/migrations/001_initial_schema.sql`
3. Verificar en **Table Editor** que aparecen las 6 tablas y los datos mock

### Paso 2 — Obtener las credenciales

En **Settings → API**:
- `SUPABASE_URL`: campo **Project URL** (ej: `https://bozxvgsujuivylyvgmne.supabase.co`)
- `SUPABASE_ANON_KEY`: campo **anon / public** (para el frontend Lovable)
- `SUPABASE_SERVICE_ROLE_KEY`: campo **service_role** (solo backend, nunca exponer en frontend)

### Paso 3 — Configurar MCP de Supabase (para desarrollo con Claude Code)

El MCP permite que Claude Code interactúe directamente con tu base de datos durante el desarrollo:

```bash
# Ya ejecutado — agrega el servidor MCP al proyecto
claude mcp add --scope project --transport http supabase \
  "https://mcp.supabase.com/mcp?project_ref=bozxvgsujuivylyvgmne"

# Autenticar (ejecutar en terminal, no en extensión IDE)
claude /mcp

# Opcional: instalar Agent Skills para mayor precisión
npx skills add supabase/agent-skills
```

Una vez autenticado, Claude Code puede consultar el esquema, ejecutar queries, revisar RLS policies y crear migraciones directamente desde el chat.

### Paso 4 — Habilitar Row Level Security (RLS) en producción

Antes de ir a producción, habilitar RLS en las tablas `empresas`, `postulaciones` y `checklists` para que cada usuario solo vea sus propios datos:

```sql
-- En SQL Editor de Supabase
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuarios ven su empresa" ON empresas
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE postulaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuarios ven sus postulaciones" ON postulaciones
  FOR ALL USING (
    empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid())
  );
```
