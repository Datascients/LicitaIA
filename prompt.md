# Prompt LicitaIA — Versión Corregida y Validada
> Todos los 10 pasos validados. 5 correcciones aplicadas vs versión anterior.

---

```
Eres un arquitecto de software senior especializado en sistemas RAG
multi-agente y plataformas de gobierno electrónico. Tu tarea es
construir la plataforma "LicitaIA" de forma completa, siguiendo
estrictamente 10 pasos de construcción organizados en dos partes.

La plataforma resuelve el siguiente problema:
Las PYMEs chilenas sin abogados propios no saben si califican para
postular a licitaciones públicas en Mercado Público (ChileCompra).
Necesitan un sistema que les diga exactamente qué les falta, cuánto
tiempo tienen, y que responda sus preguntas legales citando las bases
del concurso.

El proyecto se desarrolla sobre Lovable como plataforma de desarrollo,
con Pinecone como base vectorial, Supabase como base de datos
relacional, y deploy en GCP Cloud Run.

═══════════════════════════════════════════════════════════════
PARTE 1 · FUNDAMENTOS Y ARQUITECTURA DEL AGENTE
═══════════════════════════════════════════════════════════════

────────────────────────────────────────────
PASO 01 · DOCUMENTOS DE NEGOCIO
────────────────────────────────────────────
Selecciona y prepara los siguientes 5 documentos representativos
que formarán la base de conocimiento del sistema. Todos deben
organizarse en la carpeta /docs con un README.md que explique
qué preguntas responde cada documento:

DOC-01: bases_generales_licitacion.pdf
  → Ley 19.886 + Reglamento Decreto 661/2024 de compras públicas,
    artículos clave sobre requisitos de postulación, inhabilidades,
    garantías y penalidades.
  → Preguntas que debe responder: "¿qué me inhabilita para
    postular?", "¿qué garantías se exigen?", "¿qué pasa si me
    atraso en la entrega?"

DOC-02: requisitos_pyme_ley20416.pdf
  → Clasificación oficial de empresas según ventas anuales en UF:
    Micro ≤2.400 UF / Pequeña 2.400–25.000 UF /
    Mediana 25.000–100.000 UF.
  → Preguntas: "¿soy PYME según la ley?", "¿qué tamaño de empresa
    califica para este concurso?"

DOC-03: bases_tecnicas_concurso_{id}.txt
  → Bases específicas de cada concurso activo. Estructura: objeto
    del contrato, requisitos técnicos, documentos obligatorios,
    criterios de evaluación, plazos, penalidades específicas.
    Una instancia por concurso activo en el sistema.
  → Preguntas: "¿qué documentos necesito?", "¿cuál es el plazo
    de entrega?", "¿cómo me evalúan?"

DOC-04: registro_proveedores_requisitos.pdf
  → Instructivo de inscripción en ChileProveedores: documentos
    requeridos, plazos de tramitación, categorías, estado de
    habilidad.
  → Preguntas: "¿cómo me inscribo?", "¿qué documentos necesito
    para quedar hábil?"

DOC-05: politica_inhabilitaciones.txt
  → Causales que impiden postular: deudas previsionales, deudas
    tributarias, sanciones de Inspección del Trabajo, condenas
    por corrupción, litigios activos contra el Estado.
  → Preguntas: "¿mis deudas me inhabilitan?", "¿una denuncia
    laboral me bloquea?"

Formatos válidos: .pdf, .docx, .txt
Cada documento debe tener metadatos asociados:
  fuente, fecha_vigencia, tipo_documento, concurso_id (si aplica)

────────────────────────────────────────────
PASO 02 · EMBEDDINGS → VECTOR DB (PINECONE)
────────────────────────────────────────────
Implementar el pipeline de indexación sobre Pinecone:

CHUNKING:
- Estrategia: por sección/cláusula legal, no por tamaño fijo
- Chunk size: 512 tokens con overlap de 64 tokens
- Separadores: por número de artículo, por título de cláusula
- Nunca cortar una cláusula a la mitad

EMBEDDINGS:
- Modelo principal: text-embedding-3-small (OpenAI)
- Modelo alternativo: voyage-3 (mayor precisión legal)
- Dimensión del vector: 1536

PINECONE CONFIG:
- Index name: "licitaia-docs"
- Metric: cosine
- Pods: starter (para desarrollo), cambiar a p2 en producción
- Namespace por tipo: "bases-generales", "requisitos-pyme",
  "bases-concurso-{id}", "registro-proveedores",
  "inhabilitaciones"

METADATOS POR CHUNK (almacenados en Pinecone metadata):
  {
    "fuente": "bases_tecnicas_concurso_001.txt",
    "tipo_documento": "bases_tecnicas",
    "concurso_id": "001",
    "articulo": "Cláusula 5.2",
    "fecha_vigencia": "2025-12-31",
    "seccion": "penalidades",
    "fecha_indexacion": "2025-05-17"
  }

PROCESO DE CARGA:
- Script /src/indexer/load_documents.py que:
  1. Lee todos los archivos en /docs
  2. Aplica chunking por cláusula
  3. Genera embeddings en batch de 100
  4. Sube a Pinecone con metadatos completos
  5. Loguea cuántos chunks se cargaron por documento

────────────────────────────────────────────
PASO 03 · AGENTE ORQUESTADOR
────────────────────────────────────────────
El Agente Orquestador es el cerebro del sistema. Implementar en
/src/agents/orchestrator.py con las siguientes definiciones:

ROL Y SYSTEM PROMPT:
  "Eres LicitaBot, un asesor especializado en licitaciones
  públicas chilenas para PYMEs. Tu función es responder
  preguntas sobre bases de licitaciones, requisitos de
  postulación e inhabilidades, siempre citando la cláusula
  o artículo exacto del que proviene la información.

  Contexto del usuario activo:
  - RUT empresa: {rut}
  - Clasificación: {clasificacion_pyme}
  - Concurso consultado: {concurso_id} — {nombre_concurso}
  - Estado de habilidad: {estado_habilidad}
  - Primer filtro IA: {resultado_filtro}

  Reglas estrictas:
  1. SIEMPRE citar la fuente: 'Según [Documento], [Cláusula X]:'
  2. Si no encuentras la respuesta en los documentos, declarar
     explícitamente que no está en las bases y sugerir consultar
     directamente con el organismo comprador.
  3. NUNCA inventar requisitos, fechas ni montos.
  4. Si detectas que el usuario no califica para algo, explicar
     por qué y qué debe hacer para resolverlo.
  5. Responder siempre en español chileno, tono profesional
     pero accesible."

LISTA DE WORKERS DISPONIBLES (el orquestador elige cuál activar):
  - worker_semantic_bases: búsqueda semántica en bases del
    concurso activo (Pinecone)
  - worker_semantic_general: búsqueda semántica en normativas
    generales, Ley 19.886, Ley 20.416 (Pinecone)
  - worker_sql_historial: consulta SQL sobre historial de
    postulaciones, estado de habilidad y datos de empresa
    (Supabase)
  - worker_checklist: genera o actualiza el checklist de
    requisitos de un concurso para una empresa específica
    (Supabase)

CRITERIOS DE DELEGACIÓN:
  - Pregunta sobre penalidades, plazos, documentos del concurso
    → worker_semantic_bases
  - Pregunta sobre si es PYME, inhabilidades, Ley 19.886/20.416
    → worker_semantic_general
  - Pregunta sobre "¿califico yo?", "¿cumplo con X requisito?",
    historial de postulaciones de la empresa
    → worker_sql_historial (requiere ficha del usuario en contexto)
  - Solicitud de ver o actualizar checklist
    → worker_checklist

FORMATO DE SALIDA ESTÁNDAR:
  {
    "respuesta": "texto de la respuesta al usuario",
    "fuente_citada": "Cláusula X de [documento]",
    "worker_usado": "worker_semantic_bases",
    "requiere_accion_usuario": true/false,
    "accion_sugerida": "texto de qué debe hacer el usuario",
    "confianza": 0.0–1.0
  }

────────────────────────────────────────────
PASO 04 · AGENTES WORKERS (4 workers)
────────────────────────────────────────────
Implementar 4 workers especializados en /src/agents/workers/:

WORKER 1 — worker_semantic_bases.py
  Propósito: responder preguntas específicas del concurso activo
  Fuente: Pinecone namespace "bases-concurso-{id}"
  Parámetros de entrada: query (str), concurso_id (str)
  Proceso:
    1. Genera embedding del query
    2. Busca en Pinecone filtrando por concurso_id en metadata
    3. Retorna top-5 chunks más relevantes con sus metadatos
    4. Construye contexto para el LLM con las cláusulas encontradas
  Manejo de errores: si k<2 resultados relevantes,
    escalar a worker_semantic_general automáticamente
  Reintentos: 3 intentos con backoff exponencial ante fallo de API

WORKER 2 — worker_semantic_general.py
  Propósito: responder sobre normativas generales (Ley 19.886,
    Ley 20.416, inhabilitaciones, ChileProveedores)
  Fuente: Pinecone namespaces "bases-generales",
    "requisitos-pyme", "inhabilitaciones",
    "registro-proveedores"
  Parámetros de entrada: query (str), tipo_consulta (str)
  Proceso:
    1. Genera embedding del query
    2. Busca en todos los namespaces generales simultáneamente
    3. Re-ranking por relevancia + fecha_vigencia del documento
    4. Retorna top-5 con fuente, artículo y texto de la cláusula
  Reintentos: 3 intentos con backoff exponencial

WORKER 3 — worker_sql_historial.py   ← WORKER DE CONSULTA SQL
  Propósito: consultar historial estructurado de la empresa,
    estado de habilidad y elegibilidad para un concurso
  Fuente: Supabase (tablas empresas, postulaciones, checklists)
  Parámetros de entrada: empresa_id (str), concurso_id (str)
  Proceso:
    1. Obtiene ficha completa de la empresa desde Supabase (SQL)
    2. Obtiene lista de requisitos del concurso desde Pinecone
    3. Evalúa campo a campo: cumple / no cumple / pendiente
    4. Para cada "no cumple", busca en DOC-05 si es inhabilitante
    5. Retorna lista de requisitos con estado y gap explicado
  Output:
    {
      "califica": true/false,
      "score_completitud": 0–100,
      "requisitos": [
        {
          "nombre": "Inscripción ChileProveedores",
          "estado": "cumple|no_cumple|pendiente",
          "gap": "descripción del problema si no cumple",
          "accion": "qué debe hacer para cumplirlo",
          "inhabilitante": true/false
        }
      ]
    }
  Conexión: cliente nativo de Supabase (supabase-py). Si en el
    futuro se migra a otro motor relacional, reemplazar por
    SQLAlchemy manteniendo la misma interfaz de métodos.
  Reintentos: 2 intentos en caso de fallo de Supabase

WORKER 4 — worker_checklist.py
  Propósito: generar y actualizar el checklist visual del
    dashboard de la PYME
  Fuente: output de worker_sql_historial + Supabase
  Parámetros de entrada: empresa_id (str), concurso_id (str)
  Proceso:
    1. Llama a worker_sql_historial para obtener estado actual
    2. Compara con checklist previo guardado en Supabase
    3. Actualiza estados que cambiaron
    4. Genera notificación si un ítem inhabilitante sigue sin
       resolver y el concurso vence en menos de 5 días
    5. Persiste el checklist actualizado en tabla
       "checklists" de Supabase
  Reintentos: 2 intentos

────────────────────────────────────────────
PASO 05 · AGENTE FISCALIZADOR
────────────────────────────────────────────
Implementar en /src/agents/fiscalizador.py como capa de
validación que envuelve TODA respuesta antes de ser
mostrada al usuario:

VALIDACIONES QUE DEBE REALIZAR:

1. CITA DE FUENTE: ¿la respuesta incluye referencia explícita
   a un artículo o cláusula? Si no → agregar "⚠️ Respuesta
   generada sin fuente verificada."

2. DATOS PII: ¿la respuesta incluye RUT, nombres, datos
   bancarios u otros datos personales de terceros?
   Si sí → redactar esos campos antes de entregar.

3. COHERENCIA CON LA PREGUNTA: ¿la respuesta responde
   realmente lo que se preguntó? Evaluar con score 0–1.
   Si score < 0.6 → marcar como "revisar manualmente".

4. DATOS SENSIBLES DEL CONCURSO: ¿la respuesta incluye
   información que no debería ser pública (evaluaciones
   de otras empresas, precios de competidores)?
   Si sí → filtrar y notificar al admin.

5. ALUCINACIONES: ¿la respuesta menciona montos, fechas
   o artículos que NO aparecen en los chunks recuperados?
   Validar que todo dato numérico en la respuesta esté
   presente en el contexto usado. Si no → corregir o
   eliminar ese dato.

OUTPUT ESTÁNDAR DEL FISCALIZADOR:
  {
    "ok": true/false,
    "issues": ["lista de problemas encontrados"],
    "corrected": "respuesta corregida lista para mostrar",
    "confianza_final": 0.0–1.0,
    "requiere_revision_admin": true/false
  }

Si ok=false y hay issues críticos → no mostrar la respuesta
al usuario. Mostrar en cambio: "No pude encontrar información
verificada sobre esto en las bases. Por favor consulta con
el administrador de la plataforma."

────────────────────────────────────────────
PASO 06 · BÚSQUEDA SEMÁNTICA (KNN — PINECONE)
────────────────────────────────────────────
Configurar el retriever en /src/retriever/semantic_search.py:

CONFIGURACIÓN BASE:
  - k=5 resultados por consulta
  - Score mínimo de similaridad: 0.72 (descartar bajo ese umbral)
  - Filtros de metadata activos por defecto:
    * concurso_id: filtrar por concurso del usuario activo
    * fecha_vigencia: solo documentos vigentes a la fecha actual

RE-RANKING POST-RECUPERACIÓN:
  - Criterio 1: score de similaridad coseno (peso: 60%)
  - Criterio 2: fecha_vigencia del documento (peso: 25%)
    (documento más reciente = mayor peso)
  - Criterio 3: tipo_documento jerarquía: bases_tecnicas >
    ley > instructivo (peso: 15%)
  - Implementar función rerank(results) que aplique estos pesos

HYBRID SEARCH:
  - Combinar búsqueda vectorial (KNN) con búsqueda keyword (BM25)
  - BM25 sobre el campo texto del chunk para términos legales
    exactos como "artículo 22 bis", "cláusula 5.2", "UF 2.400"
  - Alpha (balance KNN/BM25): 0.7 KNN + 0.3 BM25 por defecto
  - Si la query contiene un número de artículo explícito
    (ej: "artículo 22"), subir BM25 a 0.6 automáticamente

EVALUACIÓN (incluir en /tests/test_retriever.py):
  10 consultas de prueba predefinidas con respuesta esperada:
  1. "¿qué documentos necesito para postular?"
  2. "¿cuánto tiempo tengo para apelar una descalificación?"
  3. "¿qué penalidad aplica si me atraso 10 días?"
  4. "¿es obligatorio tener ISO 9001?"
  5. "¿cuál es el monto mínimo de la boleta de garantía?"
  6. "¿puedo postular si tengo deudas previsionales?"
  7. "¿qué es el registro de proveedores?"
  8. "¿cómo se evalúa la oferta técnica?"
  9. "¿qué pasa si no presento toda la documentación?"
  10. "¿puedo subcontratar parte del servicio?"
  Medir precisión@k manualmente: chunk correcto en top-5

═══════════════════════════════════════════════════════════════
PARTE 2 · PERSISTENCIA, VERSIONADO Y GO-LIVE
═══════════════════════════════════════════════════════════════

────────────────────────────────────────────
PASO 07 · SQL PARA REGISTROS (SUPABASE)
────────────────────────────────────────────
Diseñar el esquema completo en Supabase con las siguientes
tablas. Implementar migraciones en /src/db/migrations/:

NOTA DE ARQUITECTURA: Se usa el cliente nativo de Supabase
(supabase-py) en lugar de SQLAlchemy por coherencia con el
stack. Si en el futuro se migra a otro motor relacional
(PostgreSQL directo, MySQL), reemplazar por SQLAlchemy
manteniendo la misma interfaz de métodos del repositorio.

TABLA: empresas
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid()
  created_at              TIMESTAMPTZ DEFAULT NOW()
  rut                     VARCHAR(12) UNIQUE NOT NULL
  razon_social            TEXT NOT NULL
  nombre_fantasia         TEXT
  giro                    TEXT
  inicio_actividades      DATE
  ventas_uf_anual         NUMERIC(10,2)
  num_trabajadores        INTEGER
  clasificacion_pyme      VARCHAR(20)  -- micro|pequena|mediana|no_aplica
  tiene_deuda_previsional BOOLEAN DEFAULT FALSE
  tiene_deuda_tributaria  BOOLEAN DEFAULT FALSE
  tiene_denuncia_laboral  BOOLEAN DEFAULT FALSE
  tiene_litigio_proveedor BOOLEAN DEFAULT FALSE
  inscrita_chileproveedores BOOLEAN DEFAULT FALSE
  certificaciones         TEXT[]
  estado_primer_filtro    VARCHAR(20)  -- califica|no_califica|pendiente
  score_completitud_ficha INTEGER DEFAULT 0
  user_id                 UUID REFERENCES auth.users(id)

TABLA: concursos
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid()
  codigo_mp            VARCHAR(50) UNIQUE
  nombre               TEXT NOT NULL
  organismo            TEXT NOT NULL
  monto_estimado_uf    NUMERIC(10,2)
  fecha_apertura       DATE
  fecha_cierre         TIMESTAMPTZ NOT NULL
  estado               VARCHAR(20)  -- activo|cerrado|adjudicado|desierto
  documento_bases_path TEXT
  pinecone_namespace   TEXT

TABLA: postulaciones
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
  empresa_id   UUID REFERENCES empresas(id)
  concurso_id  UUID REFERENCES concursos(id)
  estado       VARCHAR(30)
    -- guardado|en_progreso|completado|enviado|descalificado
  fecha_inicio TIMESTAMPTZ DEFAULT NOW()
  fecha_envio  TIMESTAMPTZ
  UNIQUE(empresa_id, concurso_id)

TABLA: checklists
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid()
  postulacion_id         UUID REFERENCES postulaciones(id)
  requisito_nombre       TEXT NOT NULL
  estado                 VARCHAR(20)  -- cumple|no_cumple|pendiente
  es_inhabilitante       BOOLEAN DEFAULT FALSE
  gap_descripcion        TEXT
  accion_sugerida        TEXT
  documento_adjunto_path TEXT
  updated_at             TIMESTAMPTZ DEFAULT NOW()

TABLA: interactions   ← TRAZABILIDAD COMPLETA DEL AGENTE
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid()
  timestamp                TIMESTAMPTZ DEFAULT NOW()
  empresa_id               UUID REFERENCES empresas(id)
  concurso_id              UUID REFERENCES concursos(id)
  query                    TEXT NOT NULL
  response                 TEXT NOT NULL
  corrected_response       TEXT
  worker_usado             VARCHAR(50)
  fuente_citada            TEXT
  tokens_input             INTEGER
  tokens_output            INTEGER
  latency_ms               INTEGER
  confianza                NUMERIC(3,2)
  fiscalizador_ok          BOOLEAN
  fiscalizador_issues      TEXT[]
  requiere_revision_admin  BOOLEAN DEFAULT FALSE
  -- Registrar CADA interacción del orquestador sin excepción

TABLA: feedbacks_admin
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid()
  empresa_id UUID REFERENCES empresas(id)
  admin_id   UUID REFERENCES auth.users(id)
  mensaje    TEXT NOT NULL
  tipo       VARCHAR(20)  -- informativo|alerta|urgente
  leido      BOOLEAN DEFAULT FALSE
  created_at TIMESTAMPTZ DEFAULT NOW()

ÍNDICES:
  CREATE INDEX idx_concursos_fecha_cierre ON concursos(fecha_cierre);
  CREATE INDEX idx_interactions_empresa   ON interactions(empresa_id);
  CREATE INDEX idx_checklists_postulacion ON checklists(postulacion_id);

────────────────────────────────────────────
PASO 08 · SUBIR A GITHUB
────────────────────────────────────────────
El repositorio debe seguir esta estructura exacta:

licitaia/
├── .env.example
├── .gitignore        ← incluir .env, __pycache__, .venv,
│                        node_modules, *.pyc
├── README.md
├── Dockerfile
├── requirements.txt
├── src/
│   ├── agents/
│   │   ├── orchestrator.py
│   │   ├── fiscalizador.py
│   │   └── workers/
│   │       ├── worker_semantic_bases.py
│   │       ├── worker_semantic_general.py
│   │       ├── worker_sql_historial.py
│   │       └── worker_checklist.py
│   ├── retriever/
│   │   └── semantic_search.py
│   ├── indexer/
│   │   └── load_documents.py
│   ├── db/
│   │   ├── supabase_client.py
│   │   └── migrations/
│   │       └── 001_initial_schema.sql
│   └── api/
│       └── main.py
├── docs/
│   ├── README.md
│   ├── bases_generales_licitacion.pdf
│   ├── requisitos_pyme_ley20416.pdf
│   ├── registro_proveedores_requisitos.pdf
│   └── politica_inhabilitaciones.txt
└── tests/
    ├── test_retriever.py
    ├── test_workers.py
    └── test_fiscalizador.py

README.md debe contener:
  1. Descripción del proyecto (2 párrafos)
  2. Arquitectura del sistema (texto + link al diagrama)
  3. Variables de entorno requeridas (lista completa)
  4. Instrucciones de instalación paso a paso
  5. Cómo cargar documentos a Pinecone (comando exacto)
  6. Cómo correr tests
  7. Cómo hacer deploy a Cloud Run
  8. Costo estimado por 1.000 consultas

.env.example debe incluir TODAS estas variables:
  ANTHROPIC_API_KEY=
  PINECONE_API_KEY=
  PINECONE_ENVIRONMENT=
  PINECONE_INDEX_NAME=licitaia-docs
  SUPABASE_URL=
  SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  GCP_PROJECT_ID=
  ENVIRONMENT=development

COMMITS — IMPORTANTE: Realizar exactamente 3 git commits
separados con los mensajes indicados a continuación.
NO hacer commit único ni squash al finalizar el trabajo.
Cada commit debe hacerse en el orden indicado:

  COMMIT 1: "feat: initial project structure and Supabase schema"
    → Incluye: estructura de carpetas, migraciones SQL,
      .env.example, .gitignore, README.md base

  COMMIT 2: "feat: RAG pipeline with Pinecone indexer and 4 workers"
    → Incluye: load_documents.py, semantic_search.py,
      orchestrator.py, fiscalizador.py, los 4 workers,
      supabase_client.py, todos los tests

  COMMIT 3: "feat: FastAPI endpoints + fiscalizador + Cloud Run config"
    → Incluye: main.py con todos los endpoints, Dockerfile,
      requirements.txt finalizado

────────────────────────────────────────────
PASO 09 · CONECTAR GCP CLOUD RUN
────────────────────────────────────────────
Implementar en Dockerfile y configurar GCP:

DOCKERFILE:
  FROM python:3.11-slim
  WORKDIR /app
  COPY requirements.txt .
  RUN pip install --no-cache-dir -r requirements.txt
  COPY src/ ./src/
  COPY docs/ ./docs/
  EXPOSE 8080
  CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0",
       "--port", "8080", "--workers", "2"]

Probar localmente antes del deploy:
  docker build -t licitaia .
  docker run -p 8080:8080 --env-file .env licitaia
  Ejecutar los 10 queries de prueba contra localhost:8080

APIs DE GCP A HABILITAR:
  - Cloud Run API
  - Cloud Build API
  - Secret Manager API
  - Container Registry API

SERVICE ACCOUNT:
  - Nombre: licitaia-sa
  - Roles: Cloud Run Invoker, Secret Manager Secret Accessor

SECRET MANAGER — crear estos secrets:
  ANTHROPIC_API_KEY        → desde .env real
  PINECONE_API_KEY         → desde .env real
  SUPABASE_URL             → desde .env real
  SUPABASE_SERVICE_ROLE_KEY → desde .env real

CLOUD RUN CONFIG:
  - Región: southamerica-west1 (Santiago)
  - Memoria: 1GB
  - CPU: 1
  - Concurrencia máxima: 80 requests por instancia
  - Mínimo instancias: 0 (cold start aceptable en dev)
  - Máximo instancias: 10
  - Timeout: 60 segundos
  - Límite de costo mensual: $50 USD (configurar budget alert)

ENDPOINTS FASTAPI a implementar en /src/api/main.py:
  POST /query          → recibe {query, empresa_id, concurso_id}
                         retorna respuesta del orquestador
  POST /eligibility    → recibe {empresa_id, concurso_id}
                         retorna checklist completo
  GET  /concursos      → lista concursos activos con semáforo
  GET  /empresa/{id}   → ficha + estado filtro + postulaciones
  POST /empresa        → crear/actualizar ficha empresa
  GET  /admin/empresas → listado admin con filtros
  POST /admin/feedback → enviar feedback a empresa

────────────────────────────────────────────
PASO 10 · DEPLOY & GO LIVE
────────────────────────────────────────────
Ejecutar el deploy y verificar:

COMANDO DE DEPLOY:
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

PRUEBAS POST-DEPLOY (5 consultas reales contra URL pública):
  1. POST /query: "¿qué documentos necesito para postular
     al concurso de limpieza del MINSAL?"
  2. POST /query: "¿puedo postular si tengo deudas
     previsionales de hace 2 meses?"
  3. POST /eligibility: empresa_id real contra concurso real
  4. GET /concursos: verificar semáforo de fechas correcto
  5. GET /admin/empresas: verificar datos de empresas mock

MONITOREO EN CLOUD CONSOLE:
  - Verificar latencia P50 < 3s y P95 < 8s
  - Revisar logs de errores en los primeros 30 minutos
  - Configurar alerta si error rate > 5%
  - Activar Cloud Monitoring dashboard básico

═══════════════════════════════════════════════════════════════
INTERFAZ DE USUARIO (LOVABLE)
═══════════════════════════════════════════════════════════════
La UI se construye en Lovable y consume la API de Cloud Run.
Stack: React + TypeScript + Tailwind CSS + Supabase Auth

DISEÑO VISUAL:
- Paleta: azul marino institucional (#0F2D5C) primario,
  blanco roto (#F8F7F4) fondo, rojo borgoña (#8B1A2A) acento
- Tipografía: DM Sans (cuerpo) + Fraunces (títulos)
- Sistema de semáforo SIEMPRE visible en tarjetas de concurso:
  🟢 >10 días | 🟡 3–10 días | 🔴 <3 días | ⚫ vencido

VISTA 1 — LANDING / LOGIN / REGISTRO
  - Registro con: email, contraseña, nombre, cargo
  - Login con Supabase Auth
  - Al primer login → redirigir a completar ficha empresa

VISTA 2 — FICHA EMPRESA (onboarding multi-paso)
  Formulario en 4 pasos con barra de progreso:
  PASO A: Datos básicos
    RUT con validación dígito verificador chileno en tiempo real,
    razón social, giro, fecha inicio actividades
  PASO B: Clasificación PYME
    Ventas UF anuales, n° trabajadores. Mostrar inmediatamente
    la clasificación calculada: micro/pequeña/mediana/no aplica
  PASO C: Estado de habilidad
    Deudas previsionales/tributarias, denuncias laborales,
    litigios, inscripción ChileProveedores, certificaciones
  PASO D: Representante legal + adjuntar documentos

  Al completar → trigger automático de worker_sql_historial
    con animación "IA analizando tu perfil..."
  Mostrar resultado del PRIMER FILTRO IA con:
    ✅ "Tu empresa califica como PYME para postular"
    ❌ "Tienes X impedimentos — ver detalle"

VISTA 3 — DASHBOARD PYME
  Sección A: ESTADO DEL PERFIL
    - Barra de progreso completitud (0–100%)
    - Indicador Primer Filtro IA (califica/no califica)
    - Alertas de feedback del administrador

  Sección B: MIS CONCURSOS
    - Grid de tarjetas ordenadas por urgencia (🔴 primero)
    - Cada tarjeta: nombre, organismo, monto, fecha cierre,
      semáforo, barra de avance en 5 etapas:
      Ficha completa → Primer filtro IA → Revisión admin
      → Documentos completos → Postulación enviada

  Sección C: CHECKLIST DEL CONCURSO (vista detalle)
    - Lista animada de requisitos con estados:
      ✅ Verde: cumple
      ❌ Rojo: no cumple + gap + acción sugerida
      ⚠️ Naranja: pendiente + qué falta
      📎 Azul: adjuntar documento
    - Botón "Actualizar análisis IA" para re-evaluar

VISTA 4 — PANEL ADMINISTRADOR
  Sección A: LISTA DE PYMES
    - Tabla con filtros: RUT, estado filtro IA, completitud,
      fecha registro
    - Click en fila → ficha completa + checklist + campo feedback
    - Tipos de feedback: informativo / alerta / urgente

  Sección B: GESTIÓN DE CONCURSOS
    - Grid semaforizado ordenado por vencimiento ascendente
    - N° de PYMEs postuladas por concurso
    - Botón "Agregar concurso" con upload de bases

  Sección C: MÉTRICAS
    - Total PYMEs registradas
    - Total postulaciones activas
    - Consultas al chatbot hoy
    - Tasa de calificación primer filtro IA

CHATBOT LICITABOT (widget flotante en toda la app)
  - Esquina inferior derecha, siempre visible
  - Placeholder: "Pregunta sobre las bases del concurso activo..."
  - Indicador mientras procesa: "LicitaBot analizando bases... ⏳"
  - Cada respuesta muestra la fuente citada en bloque diferenciado:
    [Cláusula 5.2 — Bases Técnicas Concurso 001]
  - Botón "Ver concurso completo" al pie de cada respuesta
  - Historial de los últimos 3 mensajes al abrir

═══════════════════════════════════════════════════════════════
DATOS MOCK (precargar desde el inicio)
═══════════════════════════════════════════════════════════════

CONCURSO-001:
  Nombre: "Servicio de limpieza dependencias MINSAL RM 2025"
  Organismo: Ministerio de Salud
  Monto estimado: 800 UF
  Cierre: TODAY + 5 días  ← semáforo rojo
  Requisitos clave:
    - Ventas anuales entre 2.400 y 25.000 UF
    - Sin deudas previsionales últimos 12 meses
    - Inscripción vigente en ChileProveedores
    - Mínimo 5 trabajadores con contrato
    - Certificado SUSESO de cumplimiento laboral
    - No haber sido multado por la DT en últimos 24 meses

CONCURSO-002:
  Nombre: "Suministro equipos computacionales establecimientos
           municipales"
  Organismo: Municipalidad de Santiago
  Monto estimado: 2.200 UF
  Cierre: TODAY + 15 días  ← semáforo verde
  Requisitos clave:
    - Distribuidor autorizado o carta del fabricante
    - Garantía mínima de equipos: 36 meses
    - Soporte técnico en sitio en 48 horas
    - Sin litigios con organismos públicos últimos 3 años
    - Boleta de garantía por 5% del valor adjudicado

CONCURSO-003:
  Nombre: "Consultoría transformación digital servicios
           municipales — SUBDERE"
  Organismo: Subsecretaría de Desarrollo Regional
  Monto estimado: 4.500 UF
  Cierre: TODAY + 2 días  ← semáforo rojo URGENTE
  Requisitos clave:
    - Giro en consultoría o tecnología
    - Al menos 1 profesional titulado en el equipo
    - Experiencia en mínimo 2 proyectos similares con el Estado
    - ISO 9001 vigente (deseable)
    - Sin sanciones del Consejo para la Transparencia

EMPRESA MOCK A — TecnoServ Ltda:
  RUT: 76.543.210-K
  Califica como PYME pequeña (ventas 8.500 UF)
  Todas las habilitaciones ok
  Checklist CONCURSO-001 al 70% — falta certificado SUSESO
  Estado: en_progreso

EMPRESA MOCK B — Construcciones Rápidas SpA:
  RUT: 77.891.234-5
  NO califica — tiene deuda previsional activa
  Checklist bloqueado en ítems inhabilitantes
  Feedback admin pendiente: "Regulariza deuda previsional
  en www.previred.com antes de postular"

═══════════════════════════════════════════════════════════════
ENTREGABLE FINAL
═══════════════════════════════════════════════════════════════
Al completar el paso 10, consolidar y entregar los siguientes
4 ítems. Sin estos 4 ítems, el proyecto no se considera
terminado:

1. URL PÚBLICA DEL AGENTE
   URL de Cloud Run en southamerica-west1 donde el endpoint
   /query responde correctamente a las 5 pruebas definidas.

2. URL DE LA APP LOVABLE
   URL de la interfaz desplegada en Lovable funcionando
   contra la API de Cloud Run.

3. REPOSITORIO GITHUB
   Link al repositorio con la estructura completa, los 3
   commits significativos y el README documentado.

4. REPORTE /docs/reporte_golive.md con:
   - URL pública del agente desplegado
   - Latencia promedio medida en las 5 pruebas (en ms)
   - Tokens promedio por consulta (input + output)
   - Costo estimado por 1.000 consultas en USD
     (fórmula: tokens × precio Anthropic +
      Pinecone queries × precio + Cloud Run compute)
   - 2 mejoras técnicas prioritarias identificadas
     durante las pruebas de go-live
```