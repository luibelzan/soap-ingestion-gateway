-- =============================================================
-- Esquema para el tipo de fichero S97
-- (posible conteo de eventos/interrupciones por fase, a nivel de RTU)
-- =============================================================
-- Jerarquía del XML:  Report > Rtu > S97*
--   Misma jerarquía simple que S93/S94 (sin LVSLine).
--
-- NOTA sobre supuestos pendientes de confirmar (ver README):
--   - Nr/Ns/Nt: enteros, siempre 0 en el ejemplo visto. Interpretación
--     tentativa: número de eventos/interrupciones por fase (R, S, T),
--     por analogía con Vr/Vs/Vt de S93 y Fr/Fs/Ft de S94. Al ser
--     siempre 0 en el ejemplo, no hay forma de confirmar la semántica
--     con estos datos.
--   - Bc: bandera de calidad, sin decodificar.
--   - No se ha observado ningún caso de error en este tipo de fichero.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_s97 (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,  -- informativo, no es FK
    rtu_id              VARCHAR(50) NOT NULL,   -- Rtu/@Id

    fecha               DATE NOT NULL,           -- de Fh
    hora                TIME NOT NULL,
    flag_horario        CHAR(1),
    fh_raw              VARCHAR(20) NOT NULL,

    nr                  INTEGER,         -- S97/@Nr, fase R
    ns                  INTEGER,         -- S97/@Ns, fase S
    nt                  INTEGER,         -- S97/@Nt, fase T
    bc                  VARCHAR(5),      -- bandera de calidad, sin decodificar

    -- Deduplicación atómica: un mismo Rtu + instante no debería
    -- repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_s97_rtu_fecha_hora UNIQUE (rtu_id, fecha, hora)
);

CREATE INDEX IF NOT EXISTS idx_t_s97_nombre_fichero ON :schema.t_s97(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s97_rtu_id          ON :schema.t_s97(rtu_id);
CREATE INDEX IF NOT EXISTS idx_t_s97_fecha           ON :schema.t_s97(fecha);
