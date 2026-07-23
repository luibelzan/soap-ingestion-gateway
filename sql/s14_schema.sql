-- =============================================================
-- Esquema para el tipo de fichero S14
-- (curva horaria de tensión/corriente por fase y potencia aparente)
-- =============================================================
-- Jerarquía del XML:  Report > Cnc > Cnt > S14*
--   Mismo patrón que S02: Cnt puede venir con lecturas (S14) o, por
--   analogía, en error (ErrCat/ErrCode), aunque no se ha visto ningún
--   caso en el ejemplo de S14.
--
-- NOTA sobre supuestos pendientes de confirmar (ver README):
--   - V1/V2/V3: tensión por fase (asunción por analogía con Vph1-3 de
--     G56 y Vr/Vs/Vt de S93).
--   - I1/I2/I3: corriente por fase (asunción).
--   - In: corriente de neutro (asunción, por analogía con AvgCn/MimCn
--     de G56/G58).
--   - Simp/Sexp: potencia aparente importada/exportada (asunción, por
--     el patrón Imp/Exp ya visto en AI/AE de S02 y Pimph/Pexph de G56).
--   - Bc: bandera de calidad, sin decodificar.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_s14 (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,  -- informativo, no es FK
    cnc_id              VARCHAR(50) NOT NULL,   -- Cnc/@Id
    cnt_id              VARCHAR(50) NOT NULL,   -- Cnt/@Id

    fecha               DATE NOT NULL,           -- de Fh
    hora                TIME NOT NULL,
    flag_horario        CHAR(1),
    fh_raw              VARCHAR(20) NOT NULL,
    bc                  VARCHAR(5),      -- bandera de calidad, sin decodificar

    v1                  NUMERIC(10,3),   -- tensión fase 1
    v2                  NUMERIC(10,3),   -- tensión fase 2
    v3                  NUMERIC(10,3),   -- tensión fase 3
    i1                  NUMERIC(10,3),   -- corriente fase 1
    i2                  NUMERIC(10,3),   -- corriente fase 2
    i3                  NUMERIC(10,3),   -- corriente fase 3
    in_neutro           NUMERIC(10,3),   -- In: corriente de neutro ("in" es palabra reservada en SQL)
    simp                NUMERIC(14,3),   -- potencia aparente importada
    sexp                NUMERIC(14,3),   -- potencia aparente exportada

    -- Deduplicación atómica: un mismo contador + instante no debería
    -- repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_s14_cnt_fecha_hora UNIQUE (cnt_id, fecha, hora)
);

CREATE INDEX IF NOT EXISTS idx_t_s14_nombre_fichero ON :schema.t_s14(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s14_cnt_id          ON :schema.t_s14(cnt_id);
CREATE INDEX IF NOT EXISTS idx_t_s14_fecha           ON :schema.t_s14(fecha);

CREATE TABLE IF NOT EXISTS :schema.t_s14_error (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,
    cnc_id              VARCHAR(50) NOT NULL,
    cnt_id              VARCHAR(50) NOT NULL,
    err_cat             INTEGER,
    err_code            INTEGER,
    fecha_procesado     TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT uq_t_s14_error_fichero_cnt UNIQUE (nombre_fichero, cnt_id)
);

CREATE INDEX IF NOT EXISTS idx_t_s14_error_nombre_fichero ON :schema.t_s14_error(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s14_error_cnt_id         ON :schema.t_s14_error(cnt_id);
