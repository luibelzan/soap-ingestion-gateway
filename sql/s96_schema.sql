-- =============================================================
-- Esquema para el tipo de fichero S96
-- (armónicos por fase, a nivel de RTU)
-- =============================================================
-- Jerarquía del XML:  Report > Rtu > S96* > (Hr, Hs, Ht)
--   Cada S96 es un instante (Fh) con tres bloques de armónicos, uno
--   por fase (Hr, Hs, Ht = fase R, S, T), cada uno con 25 componentes
--   armónicos (h1..h25) + THD (distorsión armónica total) + Bc.
--
-- DECISIÓN DE DISEÑO: en vez de una tabla "ancha" con 25 columnas por
-- fase (75+ columnas en total), se usa una tabla "larga"/tidy: una fila
-- por combinación (fase, orden de armónico). Esto facilita consultas
-- por armónico concreto y evita tener que ampliar el esquema si
-- cambiara el número de armónicos. El coste es cierta redundancia
-- (thd y bc se repiten en las 25 filas de cada fase+instante).
--
-- NOTA sobre supuestos pendientes de confirmar (ver README):
--   - h1: valor bastante más grande que el resto (~230, coherente con
--     una tensión) — probablemente el propio valor fundamental (la
--     tensión), no un "armónico" en sentido estricto. h2..h25 parecen
--     ser los armónicos 2º a 25º, como porcentaje o valor absoluto
--     sin confirmar unidad.
--   - THD: distorsión armónica total, asunción por el nombre estándar
--     en calidad eléctrica.
--   - Bc: bandera de calidad, sin decodificar.
--   - No se ha observado ningún caso de error en este tipo de fichero.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_s96 (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,  -- informativo, no es FK
    rtu_id              VARCHAR(50) NOT NULL,   -- Rtu/@Id

    fecha               DATE NOT NULL,           -- de Fh
    hora                TIME NOT NULL,
    flag_horario        CHAR(1),
    fh_raw              VARCHAR(20) NOT NULL,

    fase                CHAR(1) NOT NULL,        -- 'R', 'S' o 'T' (de Hr/Hs/Ht)
    orden               INTEGER NOT NULL,         -- número de armónico (1 a 25, de h1..h25)
    valor               NUMERIC(10,3),            -- valor de ese armónico

    thd                 NUMERIC(8,3),             -- distorsión armónica total de esa fase+instante
    bc                  VARCHAR(5),               -- bandera de calidad, sin decodificar

    -- Deduplicación atómica: un mismo Rtu + instante + fase + armónico
    -- no debería repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_s96_rtu_fecha_hora_fase_orden UNIQUE (rtu_id, fecha, hora, fase, orden)
);

CREATE INDEX IF NOT EXISTS idx_t_s96_nombre_fichero ON :schema.t_s96(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s96_rtu_id          ON :schema.t_s96(rtu_id);
CREATE INDEX IF NOT EXISTS idx_t_s96_fecha           ON :schema.t_s96(fecha);
CREATE INDEX IF NOT EXISTS idx_t_s96_fase_orden       ON :schema.t_s96(fase, orden);
