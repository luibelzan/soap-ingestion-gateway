-- =============================================================
-- Esquema para el tipo de fichero G03
-- (medidas promediadas de un transformador: lado BT + lado MT +
--  componentes simétricas de tensión, por contador/punto de medida)
-- =============================================================
-- Jerarquía del XML:  Report > Cnc > Cnt > G03*
--   Mismo patrón que S02: Cnt puede venir con lecturas (G03) o, por
--   analogía, en error (ErrCat/ErrCode), aunque no se ha visto ningún
--   caso en el ejemplo de G03.
--
-- NOTA sobre supuestos pendientes de confirmar (ver README):
--   - Sufijo "_lv": lado de baja tensión (low voltage) del
--     transformador (asunción).
--   - Sufijo "_mv": lado de media tensión (medium voltage) (asunción).
--   - AvVph1/2/3_lv, AvIph1/2/3_lv: tensión/corriente media por fase,
--     lado BT.
--   - AvPplus_triph/AvPminus_triph: potencia activa media trifásica,
--     import/export (asunción, por el patrón plus/minus ~ imp/exp).
--   - AvQplus_triph/AvQminus_triph: potencia reactiva media trifásica,
--     import/export (misma asunción).
--   - AvVph1/2/3_mv: tensión media por fase, lado MT.
--   - AvIneutral: corriente de neutro media.
--   - AvVo_comp/AvV1_comp/AvV2_comp: se interpretan como componentes
--     simétricas de tensión (V0=homopolar, V1=secuencia positiva,
--     V2=secuencia negativa) — asunción, típico en análisis de
--     desequilibrio. "Vo" se asume errata de "V0" (letra O vs. dígito
--     0), dado que va seguido de V1_comp/V2_comp.
--   - AvVhs: sin identificar con seguridad ("hs" podría ser "high
--     side", pero no está claro cómo se distingue de "_mv").
--   - Bc: bandera de calidad, sin decodificar.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_g03 (
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
    av_vph1_lv          NUMERIC(10,3),
    av_vph2_lv          NUMERIC(10,3),
    av_vph3_lv          NUMERIC(10,3),
    av_iph1_lv          NUMERIC(10,3),
    av_iph2_lv          NUMERIC(10,3),
    av_iph3_lv          NUMERIC(10,3),

    -- Potencia trifásica (import/export)
    av_pplus_triph      NUMERIC(14,3),
    av_pminus_triph     NUMERIC(14,3),
    av_qplus_triph      NUMERIC(14,3),
    av_qminus_triph     NUMERIC(14,3),

    -- Lado de media tensión (MT / "_mv")
    av_vph1_mv          NUMERIC(10,3),
    av_vph2_mv          NUMERIC(10,3),
    av_vph3_mv          NUMERIC(10,3),

    av_ineutral         NUMERIC(10,3),

    -- Componentes simétricas de tensión (asunción)
    av_v0_comp          NUMERIC(10,3),   -- de "AvVo_comp" (asumido V0, no "Vo")
    av_v1_comp          NUMERIC(10,3),
    av_v2_comp          NUMERIC(10,3),

    av_vhs              NUMERIC(10,3),   -- sin identificar con seguridad

    -- Deduplicación atómica: un mismo contador + instante no debería
    -- repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_g03_cnt_fecha_hora UNIQUE (cnt_id, fecha, hora)
);

CREATE INDEX IF NOT EXISTS idx_t_g03_nombre_fichero ON :schema.t_g03(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_g03_cnt_id          ON :schema.t_g03(cnt_id);
CREATE INDEX IF NOT EXISTS idx_t_g03_fecha           ON :schema.t_g03(fecha);

CREATE TABLE IF NOT EXISTS :schema.t_g03_error (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,
    cnc_id              VARCHAR(50) NOT NULL,
    cnt_id              VARCHAR(50) NOT NULL,
    err_cat             INTEGER,
    err_code            INTEGER,
    fecha_procesado     TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT uq_t_g03_error_fichero_cnt UNIQUE (nombre_fichero, cnt_id)
);

CREATE INDEX IF NOT EXISTS idx_t_g03_error_nombre_fichero ON :schema.t_g03_error(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_g03_error_cnt_id         ON :schema.t_g03_error(cnt_id);