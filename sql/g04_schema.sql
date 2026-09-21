-- =============================================================
-- Esquema para el tipo de fichero G04
-- (máximos de un transformador: lado BT + lado MT + componentes
--  simétricas de tensión, por contador/punto de medida)
-- =============================================================
-- Jerarquía del XML:  Report > Cnc > Cnt > G04*
--   Estructuralmente idéntico a G03, pero con valores MÁXIMOS del
--   periodo (Max*) en vez de promedios (Av*). Ver sql/g03_schema.sql
--   para las mismas asunciones sobre el significado de cada magnitud.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_g04 (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,  -- informativo, no es FK
    cnc_id              VARCHAR(50) NOT NULL,   -- Cnc/@Id
    cnt_id              VARCHAR(50) NOT NULL,   -- Cnt/@Id

    fecha               DATE NOT NULL,           -- de Fh
    hora                TIME NOT NULL,
    flag_horario        CHAR(1),
    fh_raw              VARCHAR(20) NOT NULL,
    bc                  VARCHAR(5),      -- bandera de calidad, sin decodificar

    -- Lado de baja tensión (BT / "_lv")
    max_vph1_lv         NUMERIC(10,3),
    max_vph2_lv         NUMERIC(10,3),
    max_vph3_lv         NUMERIC(10,3),
    max_iph1_lv         NUMERIC(10,3),
    max_iph2_lv         NUMERIC(10,3),
    max_iph3_lv         NUMERIC(10,3),

    -- Potencia trifásica (import/export)
    max_pplus_triph     NUMERIC(14,3),
    max_pminus_triph    NUMERIC(14,3),
    max_qplus_triph     NUMERIC(14,3),
    max_qminus_triph    NUMERIC(14,3),

    -- Lado de media tensión (MT / "_mv")
    max_vph1_mv         NUMERIC(10,3),
    max_vph2_mv         NUMERIC(10,3),
    max_vph3_mv         NUMERIC(10,3),

    max_ineutral        NUMERIC(10,3),

    -- Componentes simétricas de tensión (asunción)
    max_v0_comp         NUMERIC(10,3),   -- de "MaxVo_comp" (asumido V0, no "Vo")
    max_v1_comp         NUMERIC(10,3),
    max_v2_comp         NUMERIC(10,3),

    max_vhs             NUMERIC(10,3),   -- sin identificar con seguridad

    -- Deduplicación atómica: un mismo contador + instante no debería
    -- repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_g04_cnt_fecha_hora UNIQUE (cnt_id, fecha, hora)
);

CREATE INDEX IF NOT EXISTS idx_t_g04_nombre_fichero ON :schema.t_g04(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_g04_cnt_id          ON :schema.t_g04(cnt_id);
CREATE INDEX IF NOT EXISTS idx_t_g04_fecha           ON :schema.t_g04(fecha);

CREATE TABLE IF NOT EXISTS :schema.t_g04_error (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,
    cnc_id              VARCHAR(50) NOT NULL,
    cnt_id              VARCHAR(50) NOT NULL,
    err_cat             INTEGER,
    err_code            INTEGER,
    fecha_procesado     TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT uq_t_g04_error_fichero_cnt UNIQUE (nombre_fichero, cnt_id)
);

CREATE INDEX IF NOT EXISTS idx_t_g04_error_nombre_fichero ON :schema.t_g04_error(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_g04_error_cnt_id         ON :schema.t_g04_error(cnt_id);