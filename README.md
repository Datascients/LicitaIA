# LicitaIA — Plataforma RAG Multi-Agente para PYMEs en Licitaciones Públicas

LicitaIA es un sistema de inteligencia artificial que ayuda a las PYMEs chilenas sin abogados propios a evaluar su elegibilidad para postular a licitaciones públicas en Mercado Público (ChileCompra). El sistema analiza las bases de cada concurso, verifica el perfil de la empresa y responde preguntas legales citando exactamente la cláusula o artículo correspondiente.

La plataforma implementa una arquitectura RAG (Retrieval-Augmented Generation) multi-agente con un orquestador central, cuatro workers especializados, un agente fiscalizador y búsqueda semántica híbrida sobre Pinecone. El backend corre en FastAPI sobre GCP Cloud Run, con Supabase como base de datos relacional y una interfaz construida en Lovable (React + TypeScript).

## Arquitectura del sistema

```
Usuario (Lovable UI)
       │
       ▼
  FastAPI (Cloud Run)
       │
       ▼
  Orquestador (LicitaBot)
  ├── worker_semantic_bases   → Pinecone [bases-concurso-{id}]
  ├── worker_semantic_general → Pinecone [bases-generales, requisitos-pyme, inhabilitaciones, registro-proveedores]
  ├── worker_sql_historial    → Supabase (empresas, postulaciones, checklists)
  └── worker_checklist        → Supabase + worker_sql_historial
       │
       ▼
  Fiscalizador (valida PII, fuente, coherencia, alucinaciones)
       │
       ▼
  Respuesta verificada al usuario
```

Diagrama completo: [Ver en draw.io](https://drive.google.com/file/d/architecture-licitaia)

## Variables de entorno requeridas

```env
ANTHROPIC_API_KEY=         # API Key de Anthropic (Claude Sonnet 4.6)
PINECONE_API_KEY=          # API Key de Pinecone
PINECONE_ENVIRONMENT=      # Ej: us-east-1-aws
PINECONE_INDEX_NAME=licitaia-docs
SUPABASE_URL=              # URL del proyecto Supabase
SUPABASE_ANON_KEY=         # Anon key de Supabase
SUPABASE_SERVICE_ROLE_KEY= # Service role key (para operaciones admin)
GCP_PROJECT_ID=            # ID del proyecto en GCP
ENVIRONMENT=development    # development | production
```

> También necesitas `OPENAI_API_KEY` si usas text-embedding-3-small directamente.
> En producción, todos los secrets se gestionan con GCP Secret Manager.

## Instalación paso a paso

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/licitaia.git
cd licitaia
```

### 2. Crear entorno virtual e instalar dependencias

```bash
python -m venv .venv
source .venv/bin/activate          # Linux/Mac
.venv\Scripts\activate             # Windows
pip install -r requirements.txt
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con tus credenciales reales
```

### 4. Ejecutar migración en Supabase

1. Ir al SQL Editor de tu proyecto en [supabase.com](https://supabase.com)
2. Copiar y ejecutar el contenido de `src/db/migrations/001_initial_schema.sql`
3. Verificar que las 6 tablas fueron creadas correctamente

### 5. Levantar la API localmente

```bash
uvicorn src.api.main:app --reload --port 8000
```

La API estará disponible en `http://localhost:8000`. Documentación interactiva en `http://localhost:8000/docs`.

## Cargar documentos a Pinecone

Coloca los documentos en la carpeta `/docs` (formatos: `.pdf`, `.docx`, `.txt`) y ejecuta:

```bash
python -m src.indexer.load_documents
```

El script:
1. Lee todos los archivos en `/docs`
2. Aplica chunking por cláusula legal (512 tokens, overlap 64)
3. Genera embeddings en batch de 100 con `text-embedding-3-small`
4. Sube a Pinecone con metadatos completos
5. Imprime el total de chunks cargados por documento

**Para re-indexar un concurso específico**, coloca el archivo como `bases_tecnicas_concurso_{id}.txt` y vuelve a ejecutar el script. Los vectores existentes se reemplazan por ID.

## Cómo correr tests

```bash
pytest tests/ -v
```

Para correr solo un módulo:

```bash
pytest tests/test_fiscalizador.py -v
pytest tests/test_workers.py -v
pytest tests/test_retriever.py -v
```

Cobertura:

```bash
pytest tests/ --cov=src --cov-report=term-missing
```

## Deploy a Cloud Run

### 1. Probar Docker localmente

```bash
docker build -t licitaia .
docker run -p 8080:8080 --env-file .env licitaia
```

Verificar: `curl http://localhost:8080/`

### 2. Configurar GCP

```bash
# Habilitar APIs necesarias
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  secretmanager.googleapis.com containerregistry.googleapis.com

# Crear service account
gcloud iam service-accounts create licitaia-sa \
  --display-name="LicitaIA Service Account"

gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:licitaia-sa@$GCP_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.invoker"

gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:licitaia-sa@$GCP_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Crear secrets en Secret Manager

```bash
echo -n "tu_anthropic_key" | gcloud secrets create ANTHROPIC_API_KEY --data-file=-
echo -n "tu_pinecone_key"  | gcloud secrets create PINECONE_API_KEY --data-file=-
echo -n "tu_supabase_url"  | gcloud secrets create SUPABASE_URL --data-file=-
echo -n "tu_service_role"  | gcloud secrets create SUPABASE_SERVICE_ROLE_KEY --data-file=-
```

### 4. Deploy

```bash
gcloud run deploy licitaia \
  --source . \
  --region southamerica-west1 \
  --allow-unauthenticated \
  --set-secrets="ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest,\
    PINECONE_API_KEY=PINECONE_API_KEY:latest,\
    SUPABASE_URL=SUPABASE_URL:latest,\
    SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY:latest" \
  --memory 1Gi \
  --max-instances 10 \
  --timeout 60
```

## Costo estimado por 1.000 consultas

| Componente | Cálculo | Costo USD |
|---|---|---|
| Claude Sonnet 4.6 input | 1.000 × 1.200 tokens × $3/MTok | $3.60 |
| Claude Sonnet 4.6 output | 1.000 × 400 tokens × $15/MTok | $6.00 |
| Pinecone queries | 1.000 × $0.001/query | $1.00 |
| Cloud Run compute | 1.000 req × 3s × 1 vCPU × $0.000024/vCPU-s | $0.07 |
| OpenAI embeddings | 1.000 × 512 tokens × $0.02/MTok | $0.01 |
| **Total estimado** | | **~$10.68 USD** |

> Estimación en desarrollo (instancias mínimas = 0). En producción con tráfico constante, considerar instancia mínima = 1, lo que agrega ~$15 USD/mes.
