-- =============================================================
-- Esquema para el tipo de fichero S24B
-- (snapshot detallado de estado de comunicación por contador)
-- =============================================================
-- Jerarquía del XML:  Report > Cnc > S24B > Meter*
--   Versión más rica de S24: además del estado de comunicación, trae
--   versión de firmware, dirección MAC, tiempo de respuesta medio,
--   número de cambios de estado y tiempo activo (%).
--
-- Se aplana Cnc > S24B > Meter en una fila por (Cnc, Fh, Meter), igual
-- que en S24.
--
-- NOTA: LastCommunication y DateTF pueden venir vacíos ("") si el
-- contador nunca ha comunicado (se guardan como NULL). El Report de
-- este tipo trae un atributo xmlns, que se ignora al parsear.
--
-- NOTA sobre supuestos pendientes de confirmar (ver README):
--   - Present: flag de estado, valores vistos "A", "PF", "A (AE)" —
--     formato compuesto sin decodificar, se guarda tal cual.
--   - AvgResponseTime: tiempo de respuesta medio en segundos (asunción
--     por el nombre y los valores observados, 0.3-19.5).
--   - StatusChanges: número de cambios de estado (asunción).
--   - ActiveTime: porcentaje de tiempo activo (asunción, valores 0-100).
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_s24b (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,  -- informativo, no es FK
    cnc_id              VARCHAR(50) NOT NULL,   -- Cnc/@Id

    -- Instante del propio informe S24B (Fh)
    fecha               DATE NOT NULL,
    hora                TIME NOT NULL,
    ms                  CHAR(3) NOT NULL,
    flag_horario        CHAR(1),
    fh_raw              VARCHAR(20) NOT NULL,

    serial              VARCHAR(50) NOT NULL,   -- Meter/@Serial
    address             VARCHAR(20),            -- Meter/@Address (MAC)
    version             VARCHAR(20),            -- Meter/@Version
    prime_version       VARCHAR(50),            -- Meter/@PrimeVersion
    present             VARCHAR(20),            -- Meter/@Present, formato compuesto sin decodificar

    -- Instante de LastCommunication (puede venir vacío)
    last_comm_fecha     DATE,
    last_comm_hora      TIME,
    last_comm_ms        CHAR(3),
    last_comm_flag_horario CHAR(1),
    last_comm_raw       VARCHAR(20),

    -- Instante de DateTF (puede venir vacío)
    date_tf_fecha       DATE,
    date_tf_hora        TIME,
    date_tf_ms          CHAR(3),
    date_tf_flag_horario CHAR(1),
    date_tf_raw         VARCHAR(20),

    avg_response_time   NUMERIC(10,3),
    status_changes      INTEGER,
    active_time         NUMERIC(6,2),

    -- Deduplicación atómica: un mismo concentrador + instante + contador
    -- no debería repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_s24b_cnc_fecha_hora_ms_serial UNIQUE (cnc_id, fecha, hora, ms, serial)
);

CREATE INDEX IF NOT EXISTS idx_t_s24b_nombre_fichero ON :schema.t_s24b(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s24b_cnc_id          ON :schema.t_s24b(cnc_id);
CREATE INDEX IF NOT EXISTS idx_t_s24b_serial          ON :schema.t_s24b(serial);
CREATE INDEX IF NOT EXISTS idx_t_s24b_fecha           ON :schema.t_s24b(fecha);
