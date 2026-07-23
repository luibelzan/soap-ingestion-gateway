-- =============================================================
-- Esquema para el tipo de fichero S95
-- (posible desequilibrio de tensión, a nivel de RTU)
-- =============================================================
-- Jerarquía del XML:  Report > Rtu > S95*
--   Misma jerarquía simple que S93/S94/S97/S98 (sin LVSLine).
--
-- NOTA sobre supuestos pendientes de confirmar (ver README):
--   - Vu: valor pequeño (~0.28-0.37), interpretación tentativa como
--     porcentaje de desequilibrio de tensión ("V" + "u" de
--     "unbalance"), sin confirmar.
--   - Pi: flag de texto, siempre "Y" en el ejemplo visto. Significado
--     sin confirmar.
--   - Bc: bandera de calidad, sin decodificar (aquí se ven valores
--     "C0" y "00", igual que en S94).
--   - No se ha observado ningún caso de error en este tipo de fichero.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_s95 (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,  -- informativo, no es FK
    rtu_id              VARCHAR(50) NOT NULL,   -- Rtu/@Id

    fecha               DATE NOT NULL,           -- de Fh
    hora                TIME NOT NULL,
    flag_horario        CHAR(1),
    fh_raw              VARCHAR(20) NOT NULL,

    vu                  NUMERIC(10,4),   -- S95/@Vu
    pi                  VARCHAR(5),      -- S95/@Pi (Y/N observado)
    bc                  VARCHAR(5),      -- bandera de calidad, sin decodificar

    -- Deduplicación atómica: un mismo Rtu + instante no debería
    -- repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_s95_rtu_fecha_hora UNIQUE (rtu_id, fecha, hora)
);

CREATE INDEX IF NOT EXISTS idx_t_s95_nombre_fichero ON :schema.t_s95(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s95_rtu_id          ON :schema.t_s95(rtu_id);
CREATE INDEX IF NOT EXISTS idx_t_s95_fecha           ON :schema.t_s95(fecha);
