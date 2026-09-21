-- =============================================================
-- Esquema para el tipo de fichero G05
-- (medidas MÍNIMAS de un transformador: lado BT + lado MT +
--  componentes simétricas de tensión, por contador/punto de medida)
-- =============================================================
-- Jerarquía del XML:  Report > Cnc > Cnt > G05*
--   Estructura idéntica a G03; cambia únicamente el prefijo de los
--   atributos: "Av" (average / promedio) -> "Min" (mínimo).
--   Cnt puede venir con lecturas (G05) o, por analogía con S02/G03,
--   en error (ErrCat/ErrCode); en el ejemplo de G05 no aparece
--   ningún Cnt en error.
--
-- NOTA sobre supuestos pendientes de confirmar (ver README):
--   - Prefijo "Min": valor mínimo registrado en el periodo de
--     integración (asunción, por simetría con "Av" de G03).
--   - Sufijo "_lv": lado de baja tensión (low voltage) (asunción).
--   - Sufijo "_mv": lado de media tensión (medium voltage) (asunción).
--   - MinVph1/2/3_lv, MinIph1/2/3_lv: tensión/corriente mínima por
--     fase, lado BT.
--   - MinPplus_triph/MinPminus_triph: potencia activa mínima
--     trifásica, import/export (asunción plus/minus ~ imp/exp).
--   - MinQplus_triph/MinQminus_triph: potencia reactiva mínima
--     trifásica, import/export (misma asunción).
--   - MinVph1/2/3_mv: tensión mínima por fase, lado MT.
--   - MinIneutral: corriente de neutro mínima.
--   - MinVo_comp/MinV1_comp/MinV2_comp: componentes simétricas de
--     tensión (V0=homopolar, V1=secuencia positiva, V2=secuencia
--     negativa) — asunción. "Vo" se asume errata de "V0" (letra O
--     vs. dígito 0), dado que va seguido de V1_comp/V2_comp.
--   - MinVhs: sin identificar con seguridad ("hs" podría ser "high
--     side", pero no está claro cómo se distingue de "_mv").
--   - Bc: bandera de calidad, sin decodificar. En el ejemplo aparece
--     "00" en lecturas normales y "82" en tramos con todos los
--     valores a 0 (posible indisponibilidad de medida).
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_g05 (
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
    min_vph1_lv         NUMERIC(10,3),
    min_vph2_lv         NUMERIC(10,3),
    min_vph3_lv         NUMERIC(10,3),
    min_iph1_lv         NUMERIC(10,3),
    min_iph2_lv         NUMERIC(10,3),
    min_iph3_lv         NUMERIC(10,3),

    -- Potencia trifásica (import/export)
    min_pplus_triph     NUMERIC(14,3),
    min_pminus_triph    NUMERIC(14,3),
    min_qplus_triph     NUMERIC(14,3),
    min_qminus_triph    NUMERIC(14,3),

    -- Lado de media tensión (MT / "_mv")
    min_vph1_mv         NUMERIC(10,3),
    min_vph2_mv         NUMERIC(10,3),
    min_vph3_mv         NUMERIC(10,3),

    min_ineutral        NUMERIC(10,3),

    -- Componentes simétricas de tensión (asunción)
    min_v0_comp         NUMERIC(10,3),   -- de "MinVo_comp" (asumido V0, no "Vo")
    min_v1_comp         NUMERIC(10,3),
    min_v2_comp         NUMERIC(10,3),

    min_vhs             NUMERIC(10,3),   -- sin identificar con seguridad

    -- Deduplicación atómica: un mismo contador + instante no debería
    -- repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_g05_cnt_fecha_hora UNIQUE (cnt_id, fecha, hora)
);

CREATE INDEX IF NOT EXISTS idx_t_g05_nombre_fichero ON :schema.t_g05(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_g05_cnt_id          ON :schema.t_g05(cnt_id);
CREATE INDEX IF NOT EXISTS idx_t_g05_fecha           ON :schema.t_g05(fecha);

CREATE TABLE IF NOT EXISTS :schema.t_g05_error (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,
    cnc_id              VARCHAR(50) NOT NULL,
    cnt_id              VARCHAR(50) NOT NULL,
    err_cat             INTEGER,
    err_code            INTEGER,
    fecha_procesado     TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT uq_t_g05_error_fichero_cnt UNIQUE (nombre_fichero, cnt_id)
);

CREATE INDEX IF NOT EXISTS idx_t_g05_error_nombre_fichero ON :schema.t_g05_error(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_g05_error_cnt_id         ON :schema.t_g05_error(cnt_id);