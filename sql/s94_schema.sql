-- =============================================================
-- Esquema para el tipo de fichero S94
-- (posible índice de flicker/parpadeo por fase, a nivel de RTU)
-- =============================================================
-- Jerarquía del XML:  Report > Rtu > S94*
--   Misma jerarquía simple que S93 (sin LVSLine).
--
-- NOTA sobre supuestos pendientes de confirmar (ver README):
--   - Tp: siempre "1" en el ejemplo visto, significado sin confirmar
--     (por analogía con Ctr en S04/S05).
--   - Fr/Fs/Ft: valores pequeños (0.15-0.17), interpretación tentativa
--     como índice de flicker/parpadeo por fase (R, S, T), dado el
--     rango típico de este tipo de medida (Pst suele moverse en un
--     rango similar). Sin confirmar.
--   - Bc: bandera de calidad, sin decodificar. Aquí se han visto
--     valores tipo "C0" además de "00", sin patrón claro todavía.
--   - No se ha observado ningún caso de error en este tipo de fichero.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_s94 (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,  -- informativo, no es FK
    rtu_id              VARCHAR(50) NOT NULL,   -- Rtu/@Id

    tp                  INTEGER,                 -- S94/@Tp, significado sin confirmar

    fecha               DATE NOT NULL,           -- de Fh
    hora                TIME NOT NULL,
    flag_horario        CHAR(1),
    fh_raw              VARCHAR(20) NOT NULL,

    fr                  NUMERIC(8,3),    -- S94/@Fr, fase R
    fs                  NUMERIC(8,3),    -- S94/@Fs, fase S
    ft                  NUMERIC(8,3),    -- S94/@Ft, fase T
    bc                  VARCHAR(5),      -- bandera de calidad, sin decodificar

    -- Deduplicación atómica: un mismo Rtu + instante no debería
    -- repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_s94_rtu_fecha_hora UNIQUE (rtu_id, fecha, hora)
);

CREATE INDEX IF NOT EXISTS idx_t_s94_nombre_fichero ON :schema.t_s94(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s94_rtu_id          ON :schema.t_s94(rtu_id);
CREATE INDEX IF NOT EXISTS idx_t_s94_fecha           ON :schema.t_s94(fecha);
