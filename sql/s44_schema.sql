-- =============================================================
-- Esquema para el tipo de fichero S44
-- (máx/promedio/mín de tensión por fase, por contador)
-- =============================================================
-- Jerarquía del XML:  Report > Cnc > Cnt > S44*
--   Mismo patrón que S02/S45. Las fases 2 y 3 pueden venir vacías
--   ("") si el contador es monofásico, lo que se guarda como NULL
--   (el mismo tratamiento que cualquier otro valor numérico vacío).
--
-- NOTA sobre supuestos pendientes de confirmar (ver README):
--   - Max_L1v/L2v/L3v, Av_L1v/L2v/L3v, Min_L1v/L2v/L3v: máximo,
--     promedio y mínimo de tensión por fase (asunción, "v" de
--     "voltaje/tensión", por analogía con "i" de S45).
--   - Bc: bandera de calidad, sin decodificar.
--   - Se asume que Cnt puede venir en error (ErrCat/ErrCode) igual
--     que en S02, aunque no se ha visto ningún caso en el ejemplo.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_s44 (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,  -- informativo, no es FK
    cnc_id              VARCHAR(50) NOT NULL,   -- Cnc/@Id
    cnt_id              VARCHAR(50) NOT NULL,   -- Cnt/@Id

    fecha               DATE NOT NULL,           -- de Fh
    hora                TIME NOT NULL,
    flag_horario        CHAR(1),
    fh_raw              VARCHAR(20) NOT NULL,
    bc                  VARCHAR(5),      -- bandera de calidad, sin decodificar

    max_l1v             NUMERIC(10,3),
    max_l2v             NUMERIC(10,3),   -- NULL si el contador es monofásico
    max_l3v             NUMERIC(10,3),   -- NULL si el contador es monofásico
    av_l1v              NUMERIC(10,3),
    av_l2v              NUMERIC(10,3),
    av_l3v              NUMERIC(10,3),
    min_l1v             NUMERIC(10,3),
    min_l2v             NUMERIC(10,3),
    min_l3v             NUMERIC(10,3),

    -- Deduplicación atómica: un mismo contador + instante no debería
    -- repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_s44_cnt_fecha_hora UNIQUE (cnt_id, fecha, hora)
);

CREATE INDEX IF NOT EXISTS idx_t_s44_nombre_fichero ON :schema.t_s44(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s44_cnt_id          ON :schema.t_s44(cnt_id);
CREATE INDEX IF NOT EXISTS idx_t_s44_fecha           ON :schema.t_s44(fecha);

CREATE TABLE IF NOT EXISTS :schema.t_s44_error (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,
    cnc_id              VARCHAR(50) NOT NULL,
    cnt_id              VARCHAR(50) NOT NULL,
    err_cat             INTEGER,
    err_code            INTEGER,
    fecha_procesado     TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT uq_t_s44_error_fichero_cnt UNIQUE (nombre_fichero, cnt_id)
);

CREATE INDEX IF NOT EXISTS idx_t_s44_error_nombre_fichero ON :schema.t_s44_error(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s44_error_cnt_id         ON :schema.t_s44_error(cnt_id);
