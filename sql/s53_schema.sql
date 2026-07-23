-- =============================================================
-- Esquema para el tipo de fichero S53
-- (curva horaria de energía activa/reactiva por línea, desglosada por fase)
-- =============================================================
-- Jerarquía del XML:  Report > Rtu > LVSLine > S53*
--   Igual que S52 pero cada magnitud (AI, AE, R1-R4) viene desglosada
--   en 3 valores, uno por fase (sufijo 1/2/3): AI1/AI2/AI3, AE1/AE2/AE3,
--   R11/R12/R13, R21/R22/R23, R31/R32/R33, R41/R42/R43.
--
-- Sin tabla de error: no hay nivel Cnt en esta jerarquía (igual que en
-- S52/G56-G59).
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_s53 (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,  -- informativo, no es FK
    rtu_id              VARCHAR(50) NOT NULL,   -- Rtu/@Id
    lvsline_id          VARCHAR(50) NOT NULL,   -- LVSLine/@Id
    pos                 VARCHAR(10) NOT NULL,   -- LVSLine/@Pos
    magn                INTEGER,                -- LVSLine/@Magn

    fecha               DATE NOT NULL,           -- de Fh
    hora                TIME NOT NULL,
    flag_horario        CHAR(1),
    fh_raw              VARCHAR(20) NOT NULL,
    bc                  VARCHAR(5),      -- bandera de calidad, sin decodificar

    ai_ph1              NUMERIC(14,3) NOT NULL DEFAULT 0,  -- AI1
    ai_ph2              NUMERIC(14,3) NOT NULL DEFAULT 0,  -- AI2
    ai_ph3              NUMERIC(14,3) NOT NULL DEFAULT 0,  -- AI3
    ae_ph1              NUMERIC(14,3) NOT NULL DEFAULT 0,  -- AE1
    ae_ph2              NUMERIC(14,3) NOT NULL DEFAULT 0,  -- AE2
    ae_ph3              NUMERIC(14,3) NOT NULL DEFAULT 0,  -- AE3
    r1_ph1              NUMERIC(14,3) NOT NULL DEFAULT 0,  -- R11
    r1_ph2              NUMERIC(14,3) NOT NULL DEFAULT 0,  -- R12
    r1_ph3              NUMERIC(14,3) NOT NULL DEFAULT 0,  -- R13
    r2_ph1              NUMERIC(14,3) NOT NULL DEFAULT 0,  -- R21
    r2_ph2              NUMERIC(14,3) NOT NULL DEFAULT 0,  -- R22
    r2_ph3              NUMERIC(14,3) NOT NULL DEFAULT 0,  -- R23
    r3_ph1              NUMERIC(14,3) NOT NULL DEFAULT 0,  -- R31
    r3_ph2              NUMERIC(14,3) NOT NULL DEFAULT 0,  -- R32
    r3_ph3              NUMERIC(14,3) NOT NULL DEFAULT 0,  -- R33
    r4_ph1              NUMERIC(14,3) NOT NULL DEFAULT 0,  -- R41
    r4_ph2              NUMERIC(14,3) NOT NULL DEFAULT 0,  -- R42
    r4_ph3              NUMERIC(14,3) NOT NULL DEFAULT 0,  -- R43

    -- Deduplicación atómica: una misma línea + instante no debería
    -- repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_s53_rtu_line_fecha_hora UNIQUE (rtu_id, lvsline_id, fecha, hora)
);

CREATE INDEX IF NOT EXISTS idx_t_s53_nombre_fichero ON :schema.t_s53(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s53_lvsline_id      ON :schema.t_s53(lvsline_id);
CREATE INDEX IF NOT EXISTS idx_t_s53_fecha           ON :schema.t_s53(fecha);
