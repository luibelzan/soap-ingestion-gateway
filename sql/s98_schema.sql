-- =============================================================
-- Esquema para el tipo de fichero S98
-- (posible índice/ratio por fase, a nivel de RTU)
-- =============================================================
-- Jerarquía del XML:  Report > Rtu > S98*
--   Misma jerarquía simple que S93/S94/S97 (sin LVSLine).
--
-- NOTA sobre supuestos pendientes de confirmar (ver README):
--   - Ift1/Ift2/Ift3: valores pequeños (~0.06), significado sin
--     confirmar. Por analogía con Fr/Fs/Ft de S94, podría ser otro
--     índice de calidad eléctrica por fase (posiblemente relacionado
--     con corriente de fuga o desequilibrio, dado el prefijo "If"),
--     pero es una conjetura sin verificar.
--   - Bc: bandera de calidad, sin decodificar.
--   - No se ha observado ningún caso de error en este tipo de fichero.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_s98 (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,  -- informativo, no es FK
    rtu_id              VARCHAR(50) NOT NULL,   -- Rtu/@Id

    fecha               DATE NOT NULL,           -- de Fh
    hora                TIME NOT NULL,
    flag_horario        CHAR(1),
    fh_raw              VARCHAR(20) NOT NULL,

    ift1                NUMERIC(10,4),   -- S98/@Ift1, fase 1
    ift2                NUMERIC(10,4),   -- S98/@Ift2, fase 2
    ift3                NUMERIC(10,4),   -- S98/@Ift3, fase 3
    bc                  VARCHAR(5),      -- bandera de calidad, sin decodificar

    -- Deduplicación atómica: un mismo Rtu + instante no debería
    -- repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_s98_rtu_fecha_hora UNIQUE (rtu_id, fecha, hora)
);

CREATE INDEX IF NOT EXISTS idx_t_s98_nombre_fichero ON :schema.t_s98(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s98_rtu_id          ON :schema.t_s98(rtu_id);
CREATE INDEX IF NOT EXISTS idx_t_s98_fecha           ON :schema.t_s98(fecha);
