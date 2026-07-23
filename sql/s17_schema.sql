-- =============================================================
-- Esquema para el tipo de fichero S17
-- (log de eventos a nivel de concentrador)
-- =============================================================
-- Jerarquía del XML:  Report > Cnc > S17*
--   Similar a S09 (log de eventos) pero a nivel de Cnc, sin Cnt. Cada
--   S17 es un evento: Fh, Et (tipo de evento), C (código de evento),
--   con hijos opcionales D1/D2.
--
-- DIFERENCIA IMPORTANTE respecto a S09: aquí D1/D2 NO son fechas, son
-- cadenas con otro formato (p.ej. "0_0", "0_1;STG"), así que se
-- guardan como texto crudo sin intentar parsearlas como fecha-hora.
--
-- DESCUBRIMIENTO relevante para Fh en general: en S17 se ha observado
-- que el bloque de 3 dígitos intermedio de Fh (que en S02/S04/S09... 
-- siempre había salido "000") aquí SÍ trae valores reales (p.ej.
-- "777"), es decir, son milisegundos genuinos, no relleno. Por eso
-- aquí se guarda también en una columna "ms" además de fecha/hora.
-- Esto podría implicar que otros tipos de fichero ya implementados
-- también tengan milisegundos reales que se están descartando (ver
-- nota en el README) — pendiente de revisar caso por caso.
--
-- NOTA sobre supuestos pendientes de confirmar (ver README):
--   - Et/C: significado sin confirmar (igual que en S09).
--   - Al incluir "ms" en la clave de deduplicación, dos eventos con la
--     misma fecha/hora/et/c pero distinto milisegundo NO se
--     consideran duplicados.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_s17 (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,  -- informativo, no es FK
    cnc_id              VARCHAR(50) NOT NULL,   -- Cnc/@Id

    fecha               DATE NOT NULL,           -- de Fh
    hora                TIME NOT NULL,
    ms                  CHAR(3) NOT NULL,        -- milisegundos reales de Fh (ver nota arriba)
    flag_horario        CHAR(1),
    fh_raw              VARCHAR(20) NOT NULL,

    et                  INTEGER NOT NULL,        -- S17/@Et, tipo de evento
    c                   INTEGER NOT NULL,        -- S17/@C, código de evento

    d1_raw              VARCHAR(50),             -- contenido crudo de <D1> (no es fecha en S17)
    d2_raw              VARCHAR(50),             -- contenido crudo de <D2> (no es fecha en S17)

    -- Deduplicación atómica: un mismo evento (mismo instante hasta el
    -- milisegundo, tipo y código) no debería repetirse si el fichero
    -- se reprocesa
    CONSTRAINT uq_t_s17_cnc_fecha_hora_ms_et_c UNIQUE (cnc_id, fecha, hora, ms, et, c)
);

CREATE INDEX IF NOT EXISTS idx_t_s17_nombre_fichero ON :schema.t_s17(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s17_cnc_id          ON :schema.t_s17(cnc_id);
CREATE INDEX IF NOT EXISTS idx_t_s17_fecha           ON :schema.t_s17(fecha);
