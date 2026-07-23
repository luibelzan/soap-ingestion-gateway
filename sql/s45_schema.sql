-- =============================================================
-- Esquema para el tipo de fichero S45
-- (máx/promedio/mín de corriente por fase y neutro, por contador)
-- =============================================================
-- Jerarquía del XML:  Report > Cnc > Cnt > S45*
--   Mismo patrón que S02: Cnt puede venir con lecturas (S45) o, por
--   analogía, en error (ErrCat/ErrCode), aunque no se ha visto ningún
--   caso en el ejemplo de S45.
--
-- NOTA: el Report de este tipo trae un atributo xmlns (namespace),
-- que se ignora al parsear (no se usa parsing consciente de
-- namespaces en este proyecto).
--
-- NOTA sobre supuestos pendientes de confirmar (ver README):
--   - Max_L1i/L2i/L3i, Av_L1i/L2i/L3i, Min_L1i/L2i/L3i: máximo,
--     promedio y mínimo de corriente por fase (asunción, "i" de
--     "intensidad/corriente").
--   - Max_IN/Av_IN/Min_IN: máximo, promedio y mínimo de corriente de
--     neutro (asunción).
--   - Bc: bandera de calidad, sin decodificar (aquí se ve "8A", valor
--     no visto en otros tipos).
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_s45 (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,  -- informativo, no es FK
    cnc_id              VARCHAR(50) NOT NULL,   -- Cnc/@Id
    cnt_id              VARCHAR(50) NOT NULL,   -- Cnt/@Id

    fecha               DATE NOT NULL,           -- de Fh
    hora                TIME NOT NULL,
    flag_horario        CHAR(1),
    fh_raw              VARCHAR(20) NOT NULL,
    bc                  VARCHAR(5),      -- bandera de calidad, sin decodificar

    max_l1i             NUMERIC(10,3),
    max_l2i             NUMERIC(10,3),
    max_l3i             NUMERIC(10,3),
    max_in              NUMERIC(10,3),
    av_l1i              NUMERIC(10,3),
    av_l2i              NUMERIC(10,3),
    av_l3i              NUMERIC(10,3),
    av_in               NUMERIC(10,3),
    min_l1i             NUMERIC(10,3),
    min_l2i             NUMERIC(10,3),
    min_l3i             NUMERIC(10,3),
    min_in              NUMERIC(10,3),

    -- Deduplicación atómica: un mismo contador + instante no debería
    -- repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_s45_cnt_fecha_hora UNIQUE (cnt_id, fecha, hora)
);

CREATE INDEX IF NOT EXISTS idx_t_s45_nombre_fichero ON :schema.t_s45(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s45_cnt_id          ON :schema.t_s45(cnt_id);
CREATE INDEX IF NOT EXISTS idx_t_s45_fecha           ON :schema.t_s45(fecha);

CREATE TABLE IF NOT EXISTS :schema.t_s45_error (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,
    cnc_id              VARCHAR(50) NOT NULL,
    cnt_id              VARCHAR(50) NOT NULL,
    err_cat             INTEGER,
    err_code            INTEGER,
    fecha_procesado     TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT uq_t_s45_error_fichero_cnt UNIQUE (nombre_fichero, cnt_id)
);

CREATE INDEX IF NOT EXISTS idx_t_s45_error_nombre_fichero ON :schema.t_s45_error(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s45_error_cnt_id         ON :schema.t_s45_error(cnt_id);
