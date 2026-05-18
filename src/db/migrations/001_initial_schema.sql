-- LicitaIA — Migración inicial
-- Paso 07: Esquema completo de base de datos en Supabase
-- Ejecutar en el SQL Editor de Supabase

-- ─────────────────────────────────────────
-- TABLA: empresas
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS empresas (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at                TIMESTAMPTZ DEFAULT NOW(),
    rut                       VARCHAR(12) UNIQUE NOT NULL,
    razon_social              TEXT NOT NULL,
    nombre_fantasia           TEXT,
    giro                      TEXT,
    inicio_actividades        DATE,
    ventas_uf_anual           NUMERIC(10,2),
    num_trabajadores          INTEGER,
    clasificacion_pyme        VARCHAR(20),   -- micro|pequena|mediana|no_aplica
    tiene_deuda_previsional   BOOLEAN DEFAULT FALSE,
    tiene_deuda_tributaria    BOOLEAN DEFAULT FALSE,
    tiene_denuncia_laboral    BOOLEAN DEFAULT FALSE,
    tiene_litigio_proveedor   BOOLEAN DEFAULT FALSE,
    inscrita_chileproveedores BOOLEAN DEFAULT FALSE,
    certificaciones           TEXT[],
    estado_primer_filtro      VARCHAR(20),   -- califica|no_califica|pendiente
    score_completitud_ficha   INTEGER DEFAULT 0,
    user_id                   UUID REFERENCES auth.users(id)
);

-- ─────────────────────────────────────────
-- TABLA: concursos
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS concursos (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_mp             VARCHAR(50) UNIQUE,
    nombre                TEXT NOT NULL,
    organismo             TEXT NOT NULL,
    monto_estimado_uf     NUMERIC(10,2),
    fecha_apertura        DATE,
    fecha_cierre          TIMESTAMPTZ NOT NULL,
    estado                VARCHAR(20),       -- activo|cerrado|adjudicado|desierto
    documento_bases_path  TEXT,
    pinecone_namespace    TEXT
);

-- ─────────────────────────────────────────
-- TABLA: postulaciones
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS postulaciones (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id   UUID REFERENCES empresas(id),
    concurso_id  UUID REFERENCES concursos(id),
    estado       VARCHAR(30),
        -- guardado|en_progreso|completado|enviado|descalificado
    fecha_inicio TIMESTAMPTZ DEFAULT NOW(),
    fecha_envio  TIMESTAMPTZ,
    UNIQUE(empresa_id, concurso_id)
);

-- ─────────────────────────────────────────
-- TABLA: checklists
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checklists (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    postulacion_id          UUID REFERENCES postulaciones(id),
    requisito_nombre        TEXT NOT NULL,
    estado                  VARCHAR(20),     -- cumple|no_cumple|pendiente
    es_inhabilitante        BOOLEAN DEFAULT FALSE,
    gap_descripcion         TEXT,
    accion_sugerida         TEXT,
    documento_adjunto_path  TEXT,
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- TABLA: interactions (trazabilidad completa)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interactions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp               TIMESTAMPTZ DEFAULT NOW(),
    empresa_id              UUID REFERENCES empresas(id),
    concurso_id             UUID REFERENCES concursos(id),
    query                   TEXT NOT NULL,
    response                TEXT NOT NULL,
    corrected_response      TEXT,
    worker_usado            VARCHAR(50),
    fuente_citada           TEXT,
    tokens_input            INTEGER,
    tokens_output           INTEGER,
    latency_ms              INTEGER,
    confianza               NUMERIC(3,2),
    fiscalizador_ok         BOOLEAN,
    fiscalizador_issues     TEXT[],
    requiere_revision_admin BOOLEAN DEFAULT FALSE
);

-- ─────────────────────────────────────────
-- TABLA: feedbacks_admin
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedbacks_admin (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES empresas(id),
    admin_id   UUID REFERENCES auth.users(id),
    mensaje    TEXT NOT NULL,
    tipo       VARCHAR(20),                  -- informativo|alerta|urgente
    leido      BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- ÍNDICES
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_concursos_fecha_cierre ON concursos(fecha_cierre);
CREATE INDEX IF NOT EXISTS idx_interactions_empresa   ON interactions(empresa_id);
CREATE INDEX IF NOT EXISTS idx_checklists_postulacion ON checklists(postulacion_id);

-- ─────────────────────────────────────────
-- DATOS MOCK — Concursos
-- ─────────────────────────────────────────
INSERT INTO concursos (codigo_mp, nombre, organismo, monto_estimado_uf, fecha_cierre, estado, pinecone_namespace)
VALUES
(
  'MP-001-2025',
  'Servicio de limpieza dependencias MINSAL RM 2025',
  'Ministerio de Salud',
  800.00,
  NOW() + INTERVAL '5 days',
  'activo',
  'bases-concurso-001'
),
(
  'MP-002-2025',
  'Suministro equipos computacionales establecimientos municipales',
  'Municipalidad de Santiago',
  2200.00,
  NOW() + INTERVAL '15 days',
  'activo',
  'bases-concurso-002'
),
(
  'MP-003-2025',
  'Consultoría transformación digital servicios municipales — SUBDERE',
  'Subsecretaría de Desarrollo Regional',
  4500.00,
  NOW() + INTERVAL '2 days',
  'activo',
  'bases-concurso-003'
)
ON CONFLICT (codigo_mp) DO NOTHING;

-- ─────────────────────────────────────────
-- DATOS MOCK — Empresas
-- ─────────────────────────────────────────
INSERT INTO empresas (
  rut, razon_social, nombre_fantasia, giro,
  ventas_uf_anual, num_trabajadores, clasificacion_pyme,
  tiene_deuda_previsional, inscrita_chileproveedores,
  estado_primer_filtro, score_completitud_ficha
)
VALUES
(
  '76.543.210-K', 'TecnoServ Limitada', 'TecnoServ', 'Servicios de limpieza y mantención',
  8500.00, 12, 'pequena',
  FALSE, TRUE,
  'califica', 70
),
(
  '77.891.234-5', 'Construcciones Rápidas SpA', 'Construcciones Rápidas', 'Construcción y obras civiles',
  15000.00, 8, 'pequena',
  TRUE, TRUE,
  'no_califica', 45
)
ON CONFLICT (rut) DO NOTHING;
