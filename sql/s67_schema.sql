-- =============================================================
-- Esquema para el tipo de fichero S67
-- (log de eventos a nivel de RTU, con milisegundos reales)
-- =============================================================
-- Jerarquía del XML:  Report > Rtu > S67*
--   Mismo patrón que S17 (log de eventos con milisegundos reales en
--   Fh, D1/D2 opcionales de contenido variable). Aquí D1/D2 tienen
--   formato de lista separada por ";" (p.ej. "5;2;230",
--   "50;4,1;1;0;0" -- nótese la coma como separador decimal dentro
--   de un campo). Se guardan tal cual, sin descomponer la lista.
--
-- D1 puede venir como elemento vacío (<D1></D1>), que se guarda como
-- NULL, no como cadena vacía.
--
-- NOTA sobre supuestos pendientes de confirmar (ver README):
--   - Et/C: significado sin confirmar (igual que en S09/S17/S59).
--   - D1/D2: formato de lista separada por ";", sin descomponer en
--     columnas individuales al no conocer el significado de cada
--     posición.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_s67 (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,  -- informativo, no es FK
    rtu_id              VARCHAR(50) NOT NULL,   -- Rtu/@Id

    fecha               DATE NOT NULL,           -- de Fh
    hora                TIME NOT NULL,
    ms                  CHAR(3) NOT NULL,        -- milisegundos reales de Fh
    flag_horario        CHAR(1),
    fh_raw              VARCHAR(20) NOT NULL,

    et                  INTEGER NOT NULL,        -- S67/@Et, tipo de evento
    c                   INTEGER NOT NULL,        -- S67/@C, código de evento

    d1_raw              VARCHAR(50),             -- contenido crudo de <D1> (lista separada por ";"), NULL si vacío
    d2_raw              VARCHAR(50),             -- contenido crudo de <D2>, NULL si vacío

    -- Deduplicación atómica: un mismo evento (mismo instante hasta el
    -- milisegundo, tipo y código) no debería repetirse si el fichero
    -- se reprocesa
    CONSTRAINT uq_t_s67_rtu_fecha_hora_ms_et_c UNIQUE (rtu_id, fecha, hora, ms, et, c)
);

CREATE INDEX IF NOT EXISTS idx_t_s67_nombre_fichero ON :schema.t_s67(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s67_rtu_id          ON :schema.t_s67(rtu_id);
CREATE INDEX IF NOT EXISTS idx_t_s67_fecha           ON :schema.t_s67(fecha);
