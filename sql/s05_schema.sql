-- =============================================================
-- Esquema para el tipo de fichero S05
-- (lecturas por periodo tarifario, sin máximetro)
-- =============================================================
-- Jerarquía del XML:  Report > Cnc > Cnt > S05* > Value
--   Cada S05 representa un periodo tarifario (Pt) en un instante (Fh),
--   con un único bloque Value (sufijo "a": AIa, AEa, R1a-R4a). A
--   diferencia de S04, no trae ventana Fhi/Fhf ni máximetro Mx/Fx, y
--   solo un bloque Value (no hay "i").
--
-- NOTA sobre supuestos pendientes de confirmar (ver README):
--   - Ctr: siempre "1" en los ejemplos vistos, significado sin
--     confirmar (igual que en S04).
--   - Se asume que Cnt puede venir en error (ErrCat/ErrCode) igual
--     que en S02, aunque no se ha visto ningún caso en el ejemplo.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_s05 (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,  -- informativo, no es FK
    cnc_id              VARCHAR(50) NOT NULL,   -- Cnc/@Id
    cnt_id              VARCHAR(50) NOT NULL,   -- Cnt/@Id
    ctr                 INTEGER,                -- S05/@Ctr, significado sin confirmar
    pt                  INTEGER NOT NULL,        -- S05/@Pt, periodo tarifario

    fecha               DATE NOT NULL,           -- de Fh
    hora                TIME NOT NULL,
    flag_horario        CHAR(1),
    fh_raw              VARCHAR(20) NOT NULL,

    ai_a                NUMERIC(14,3) NOT NULL DEFAULT 0,
    ae_a                NUMERIC(14,3) NOT NULL DEFAULT 0,
    r1_a                NUMERIC(14,3) NOT NULL DEFAULT 0,
    r2_a                NUMERIC(14,3) NOT NULL DEFAULT 0,
    r3_a                NUMERIC(14,3) NOT NULL DEFAULT 0,
    r4_a                NUMERIC(14,3) NOT NULL DEFAULT 0,

    -- Deduplicación atómica: un mismo contador + instante + periodo
    -- tarifario no debería repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_s05_cnt_fecha_hora_pt UNIQUE (cnt_id, fecha, hora, pt)
);

CREATE INDEX IF NOT EXISTS idx_t_s05_nombre_fichero ON :schema.t_s05(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s05_cnt_id          ON :schema.t_s05(cnt_id);
CREATE INDEX IF NOT EXISTS idx_t_s05_fecha           ON :schema.t_s05(fecha);

CREATE TABLE IF NOT EXISTS :schema.t_s05_error (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,
    cnc_id              VARCHAR(50) NOT NULL,
    cnt_id              VARCHAR(50) NOT NULL,
    err_cat             INTEGER,
    err_code            INTEGER,
    fecha_procesado     TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT uq_t_s05_error_fichero_cnt UNIQUE (nombre_fichero, cnt_id)
);

CREATE INDEX IF NOT EXISTS idx_t_s05_error_nombre_fichero ON :schema.t_s05_error(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s05_error_cnt_id         ON :schema.t_s05_error(cnt_id);
