-- =============================================================
-- Esquema para el tipo de fichero G59
-- (calidad de suministro en baja tensión, por RTU y línea — INSTANTÁNEOS)
-- =============================================================
-- Jerarquía del XML:  Report > Rtu > LVSLine > G59*
--   Estructuralmente idéntico a G56/G57/G58, pero con valores
--   INSTANTÁNEOS/MOMENTÁNEOS del periodo (Mom*), sin el campo Temp
--   (igual que G57/G58). Ver sql/g56_schema.sql para las mismas
--   asunciones sobre el significado de cada magnitud.
--
-- Al igual que en G56/G57/G58, no se ha observado ningún caso de
-- error, así que no existe tabla "t_g59_error".
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_g59 (
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
    mom_c_ph1           NUMERIC(10,3),   -- MomCph1
    mom_v_ph1           NUMERIC(10,3),   -- MomVph1
    mom_pimp_ph1        NUMERIC(14,3),   -- MomPimph1
    mom_pexp_ph1        NUMERIC(14,3),   -- MomPexph1
    mom_qimp_ph1        NUMERIC(14,3),   -- MomQimph1
    mom_qexp_ph1        NUMERIC(14,3),   -- MomQexph1
    mom_pf_ph1          NUMERIC(6,3),    -- MomPF1

    -- Fase 2
    mom_c_ph2           NUMERIC(10,3),
    mom_v_ph2           NUMERIC(10,3),
    mom_pimp_ph2        NUMERIC(14,3),
    mom_pexp_ph2        NUMERIC(14,3),
    mom_qimp_ph2        NUMERIC(14,3),
    mom_qexp_ph2        NUMERIC(14,3),
    mom_pf_ph2          NUMERIC(6,3),

    -- Fase 3
    mom_c_ph3           NUMERIC(10,3),
    mom_v_ph3           NUMERIC(10,3),
    mom_pimp_ph3        NUMERIC(14,3),
    mom_pexp_ph3        NUMERIC(14,3),
    mom_qimp_ph3        NUMERIC(14,3),
    mom_qexp_ph3        NUMERIC(14,3),
    mom_pf_ph3          NUMERIC(6,3),

    -- Tensiones de línea (fase-fase)
    mom_v12             NUMERIC(10,3),   -- MomV12
    mom_v23             NUMERIC(10,3),   -- MomV23
    mom_v31             NUMERIC(10,3),   -- MomV31

    mom_cn              NUMERIC(10,3),   -- MomCn: corriente de neutro instantánea
    bc                  VARCHAR(5),      -- bandera de calidad, sin decodificar

    -- Deduplicación atómica: una misma línea + instante no debería
    -- repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_g59_rtu_line_fecha_hora UNIQUE (rtu_id, lvsline_id, fecha, hora)
);

CREATE INDEX IF NOT EXISTS idx_t_g59_nombre_fichero ON :schema.t_g59(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_g59_lvsline_id      ON :schema.t_g59(lvsline_id);
CREATE INDEX IF NOT EXISTS idx_t_g59_fecha           ON :schema.t_g59(fecha);
