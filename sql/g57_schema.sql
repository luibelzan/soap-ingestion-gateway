-- =============================================================
-- Esquema para el tipo de fichero G57
-- (calidad de suministro en baja tensión, por RTU y línea — MÁXIMOS)
-- =============================================================
-- Jerarquía del XML:  Report > Rtu > LVSLine > G57*
--   Estructuralmente idéntico a G56, pero con valores MÁXIMOS del
--   periodo en vez de promedios, y sin el campo Temp (no aparece en
--   el ejemplo). Ver sql/g56_schema.sql para las mismas asunciones
--   sobre el significado de cada magnitud (Cph/Vph/Pimph/Pexph/
--   Qimph/Qexph/PF/V12/V23/V31/Cn), que aquí aplican igual.
--
-- Al igual que en G56, no se ha observado ningún caso de error, así
-- que no existe tabla "t_g57_error".
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_g57 (
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
    max_c_ph1           NUMERIC(10,3),   -- MaxCph1
    max_v_ph1           NUMERIC(10,3),   -- MaxVph1
    max_pimp_ph1        NUMERIC(14,3),   -- MaxPimph1
    max_pexp_ph1        NUMERIC(14,3),   -- MaxPexph1
    max_qimp_ph1        NUMERIC(14,3),   -- MaxQimph1
    max_qexp_ph1        NUMERIC(14,3),   -- MaxQexph1
    max_pf_ph1          NUMERIC(6,3),    -- MaxPF1

    -- Fase 2
    max_c_ph2           NUMERIC(10,3),
    max_v_ph2           NUMERIC(10,3),
    max_pimp_ph2        NUMERIC(14,3),
    max_pexp_ph2        NUMERIC(14,3),
    max_qimp_ph2        NUMERIC(14,3),
    max_qexp_ph2        NUMERIC(14,3),
    max_pf_ph2          NUMERIC(6,3),

    -- Fase 3
    max_c_ph3           NUMERIC(10,3),
    max_v_ph3           NUMERIC(10,3),
    max_pimp_ph3        NUMERIC(14,3),
    max_pexp_ph3        NUMERIC(14,3),
    max_qimp_ph3        NUMERIC(14,3),
    max_qexp_ph3        NUMERIC(14,3),
    max_pf_ph3          NUMERIC(6,3),

    -- Tensiones de línea (fase-fase)
    max_v12             NUMERIC(10,3),   -- MaxV12
    max_v23             NUMERIC(10,3),   -- MaxV23
    max_v31             NUMERIC(10,3),   -- MaxV31

    max_cn              NUMERIC(10,3),   -- MaxCn: corriente de neutro máxima
    bc                  VARCHAR(5),      -- bandera de calidad, sin decodificar

    -- Deduplicación atómica: una misma línea + instante no debería
    -- repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_g57_rtu_line_fecha_hora UNIQUE (rtu_id, lvsline_id, fecha, hora)
);

CREATE INDEX IF NOT EXISTS idx_t_g57_nombre_fichero ON :schema.t_g57(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_g57_lvsline_id      ON :schema.t_g57(lvsline_id);
CREATE INDEX IF NOT EXISTS idx_t_g57_fecha           ON :schema.t_g57(fecha);
