-- =============================================================
-- Esquema para el tipo de fichero S52
-- (curva horaria de energía activa/reactiva por línea de baja tensión)
-- =============================================================
-- Jerarquía del XML:  Report > Rtu > LVSLine > S52*
--   Mismas magnitudes que S02 (AI, AE, R1-R4, Bc) pero medidas a nivel
--   de línea de baja tensión (LVSLine), no de contador individual.
--   LVSLine trae además Magn (igual que Cnt/@Magn en S02).
--
-- Sin tabla de error: no hay nivel Cnt en esta jerarquía (igual que en
-- G56/G57/G58/G59), así que no se ha observado ningún caso de error.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_s52 (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,  -- informativo, no es FK
    rtu_id              VARCHAR(50) NOT NULL,   -- Rtu/@Id
    lvsline_id          VARCHAR(50) NOT NULL,   -- LVSLine/@Id
    pos                 VARCHAR(10) NOT NULL,   -- LVSLine/@Pos (texto, preserva ceros a la izquierda)
    magn                INTEGER,                -- LVSLine/@Magn

    fecha               DATE NOT NULL,           -- de Fh
    hora                TIME NOT NULL,
    flag_horario        CHAR(1),
    fh_raw              VARCHAR(20) NOT NULL,
    bc                  VARCHAR(5),      -- bandera de calidad, sin decodificar

    ai                  NUMERIC(14,3) NOT NULL DEFAULT 0, -- activa entrante
    ae                  NUMERIC(14,3) NOT NULL DEFAULT 0, -- activa saliente
    r1                  NUMERIC(14,3) NOT NULL DEFAULT 0, -- reactiva cuadrante 1
    r2                  NUMERIC(14,3) NOT NULL DEFAULT 0, -- reactiva cuadrante 2
    r3                  NUMERIC(14,3) NOT NULL DEFAULT 0, -- reactiva cuadrante 3
    r4                  NUMERIC(14,3) NOT NULL DEFAULT 0, -- reactiva cuadrante 4

    -- Deduplicación atómica: una misma línea + instante no debería
    -- repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_s52_rtu_line_fecha_hora UNIQUE (rtu_id, lvsline_id, fecha, hora)
);

CREATE INDEX IF NOT EXISTS idx_t_s52_nombre_fichero ON :schema.t_s52(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s52_lvsline_id      ON :schema.t_s52(lvsline_id);
CREATE INDEX IF NOT EXISTS idx_t_s52_fecha           ON :schema.t_s52(fecha);
