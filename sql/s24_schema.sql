-- =============================================================
-- Esquema para el tipo de fichero S24
-- (snapshot de estado de comunicación por contador)
-- =============================================================
-- Jerarquía del XML:  Report > Cnc > S24 > Meter*
--   Cada S24 es un instante (Fh) del concentrador, con una lista de
--   Meter (uno por contador): estado de comunicación (ComStatus), su
--   propio instante (Date, mismo formato que Fh, con milisegundos
--   reales igual que en S17) y si está activo (Active, Y/N).
--
-- Se aplana Cnc > S24 > Meter en una fila por (Cnc, Fh, Meter), en
-- vez de normalizar en dos tablas, siguiendo el mismo criterio usado
-- en el resto del proyecto (evitar tablas de cabecera/FK).
--
-- NOTA sobre supuestos pendientes de confirmar (ver README):
--   - ComStatus: entero, significado exacto sin confirmar (valor "2"
--     en todos los ejemplos vistos; posible código de estado de
--     comunicación).
--   - Active: asunción de que es un flag Y/N de contador activo/dado
--     de baja.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_s24 (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,  -- informativo, no es FK
    cnc_id              VARCHAR(50) NOT NULL,   -- Cnc/@Id

    -- Instante del propio informe S24 (Fh)
    fecha               DATE NOT NULL,
    hora                TIME NOT NULL,
    ms                  CHAR(3) NOT NULL,
    flag_horario        CHAR(1),
    fh_raw              VARCHAR(20) NOT NULL,

    meter_id            VARCHAR(50) NOT NULL,   -- Meter/@MeterId
    com_status          INTEGER,                -- Meter/@ComStatus

    -- Instante propio del Meter (Date), independiente del Fh del S24
    meter_fecha         DATE,
    meter_hora          TIME,
    meter_ms            CHAR(3),
    meter_flag_horario  CHAR(1),
    meter_date_raw      VARCHAR(20),

    active              VARCHAR(5),             -- Meter/@Active (Y/N)

    -- Deduplicación atómica: un mismo concentrador + instante + contador
    -- no debería repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_s24_cnc_fecha_hora_ms_meter UNIQUE (cnc_id, fecha, hora, ms, meter_id)
);

CREATE INDEX IF NOT EXISTS idx_t_s24_nombre_fichero ON :schema.t_s24(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s24_cnc_id          ON :schema.t_s24(cnc_id);
CREATE INDEX IF NOT EXISTS idx_t_s24_meter_id        ON :schema.t_s24(meter_id);
CREATE INDEX IF NOT EXISTS idx_t_s24_fecha           ON :schema.t_s24(fecha);
