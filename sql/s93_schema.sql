-- =============================================================
-- Esquema para el tipo de fichero S93
-- (tensiones por fase a nivel de RTU)
-- =============================================================
-- Jerarquía del XML:  Report > Rtu > S93*
--   Más simple que G56/G57/G58: no hay nivel LVSLine, los datos son
--   directamente por Rtu. Cada S93 trae la tensión de cada fase
--   (nomenclatura R/S/T en vez de 1/2/3) y una bandera de calidad.
--
-- NOTA sobre supuestos pendientes de confirmar (ver README):
--   - Vr/Vs/Vt: tensión de cada fase (R, S, T), asunción por analogía
--     con AvgVph1/2/3 de G56.
--   - Bc: bandera de calidad, sin decodificar (igual que en S02/G56).
--   - No se ha observado ningún caso de error en este tipo de fichero.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_s93 (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,  -- informativo, no es FK
    rtu_id              VARCHAR(50) NOT NULL,   -- Rtu/@Id

    fecha               DATE NOT NULL,           -- de Fh
    hora                TIME NOT NULL,
    flag_horario        CHAR(1),
    fh_raw              VARCHAR(20) NOT NULL,

    vr                  NUMERIC(10,3),   -- S93/@Vr, tensión fase R
    vs                  NUMERIC(10,3),   -- S93/@Vs, tensión fase S
    vt                  NUMERIC(10,3),   -- S93/@Vt, tensión fase T
    bc                  VARCHAR(5),      -- bandera de calidad, sin decodificar

    -- Deduplicación atómica: un mismo Rtu + instante no debería
    -- repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_s93_rtu_fecha_hora UNIQUE (rtu_id, fecha, hora)
);

CREATE INDEX IF NOT EXISTS idx_t_s93_nombre_fichero ON :schema.t_s93(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s93_rtu_id          ON :schema.t_s93(rtu_id);
CREATE INDEX IF NOT EXISTS idx_t_s93_fecha           ON :schema.t_s93(fecha);
