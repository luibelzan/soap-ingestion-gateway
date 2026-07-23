-- =============================================================
-- Esquema para el tipo de fichero G58
-- (calidad de suministro en baja tensión, por RTU y línea — MÍNIMOS)
-- =============================================================
-- Jerarquía del XML:  Report > Rtu > LVSLine > G58*
--   Estructuralmente idéntico a G56/G57, pero con valores MÍNIMOS del
--   periodo, y sin el campo Temp (igual que G57). Ver sql/g56_schema.sql
--   para las mismas asunciones sobre el significado de cada magnitud.
--
-- PARTICULARIDAD DEL XML ORIGINAL: el atributo de corriente de neutro
-- se llama "MimCn" (con "m"), no "MinCn" como el resto de atributos
-- ("Min..."). Parece una errata del propio fichero de origen, pero es
-- consistente en todos los ejemplos vistos, así que el parser lee
-- literalmente "MimCn". La columna en base de datos se llama de forma
-- normal (min_cn) para no arrastrar la errata al esquema.
--
-- Al igual que en G56/G57, no se ha observado ningún caso de error,
-- así que no existe tabla "t_g58_error".
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_g58 (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,  -- informativo, no es FK
    rtu_id              VARCHAR(50) NOT NULL,   -- Rtu/@Id
    lvsline_id          VARCHAR(50) NOT NULL,   -- LVSLine/@Id
    pos                 VARCHAR(10) NOT NULL,   -- LVSLine/@Pos (texto, preserva ceros a la izquierda)

    fecha               DATE NOT NULL,           -- de Fh
    hora                TIME NOT NULL,
    flag_horario        CHAR(1),
    fh_raw              VARCHAR(20) NOT NULL,

    -- Fase 1
    min_c_ph1           NUMERIC(10,3),   -- MinCph1
    min_v_ph1           NUMERIC(10,3),   -- MinVph1
    min_pimp_ph1        NUMERIC(14,3),   -- MinPimph1
    min_pexp_ph1        NUMERIC(14,3),   -- MinPexph1
    min_qimp_ph1        NUMERIC(14,3),   -- MinQimph1
    min_qexp_ph1        NUMERIC(14,3),   -- MinQexph1
    min_pf_ph1          NUMERIC(6,3),    -- MinPF1

    -- Fase 2
    min_c_ph2           NUMERIC(10,3),
    min_v_ph2           NUMERIC(10,3),
    min_pimp_ph2        NUMERIC(14,3),
    min_pexp_ph2        NUMERIC(14,3),
    min_qimp_ph2        NUMERIC(14,3),
    min_qexp_ph2        NUMERIC(14,3),
    min_pf_ph2          NUMERIC(6,3),

    -- Fase 3
    min_c_ph3           NUMERIC(10,3),
    min_v_ph3           NUMERIC(10,3),
    min_pimp_ph3        NUMERIC(14,3),
    min_pexp_ph3        NUMERIC(14,3),
    min_qimp_ph3        NUMERIC(14,3),
    min_qexp_ph3        NUMERIC(14,3),
    min_pf_ph3          NUMERIC(6,3),

    -- Tensiones de línea (fase-fase)
    min_v12             NUMERIC(10,3),   -- MinV12
    min_v23             NUMERIC(10,3),   -- MinV23
    min_v31             NUMERIC(10,3),   -- MinV31

    min_cn              NUMERIC(10,3),   -- MimCn (sic) en el XML de origen
    bc                  VARCHAR(5),      -- bandera de calidad, sin decodificar

    -- Deduplicación atómica: una misma línea + instante no debería
    -- repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_g58_rtu_line_fecha_hora UNIQUE (rtu_id, lvsline_id, fecha, hora)
);

CREATE INDEX IF NOT EXISTS idx_t_g58_nombre_fichero ON :schema.t_g58(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_g58_lvsline_id      ON :schema.t_g58(lvsline_id);
CREATE INDEX IF NOT EXISTS idx_t_g58_fecha           ON :schema.t_g58(fecha);
