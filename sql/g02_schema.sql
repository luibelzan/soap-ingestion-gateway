-- =============================================================
-- Esquema para el tipo de fichero G02
-- (disponibilidad/conectividad del contador respecto al concentrador)
-- =============================================================
-- Jerarquía del XML:  Report > Cnc > Cnt > G02*
--   A diferencia de G01, aquí SÍ hay nivel Cnt: la disponibilidad se
--   mide por contador, no por concentrador.
--
-- NOTA sobre supuestos pendientes de confirmar (ver README):
--   - Atime: minutos que el contador estuvo disponible/conectado en el
--     periodo (asunción, dado que Aconc=1440 coincide con minutos de
--     un día y Atimeperc ≈ Atime/Aconc×100).
--   - Nchanges: número de cambios de estado de conectividad (asunción).
--   - Aconc: minutos totales del periodo de medida (asunción, siempre
--     1440 en el ejemplo = 24h).
--   - Atimeperc: porcentaje de disponibilidad (asunción).
--   - Se asume que Cnt puede venir en error (ErrCat/ErrCode) igual que
--     en S02, aunque no se ha visto ningún caso en el ejemplo de G02.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_g02 (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,  -- informativo, no es FK
    cnc_id              VARCHAR(50) NOT NULL,   -- Cnc/@Id
    cnt_id              VARCHAR(50) NOT NULL,   -- Cnt/@Id

    fecha               DATE NOT NULL,           -- de Fh
    hora                TIME NOT NULL,
    flag_horario        CHAR(1),
    fh_raw              VARCHAR(20) NOT NULL,

    atime               INTEGER NOT NULL,        -- G02/@Atime
    nchanges            INTEGER NOT NULL,        -- G02/@Nchanges
    aconc               INTEGER NOT NULL,        -- G02/@Aconc
    atimeperc           NUMERIC(6,2) NOT NULL,   -- G02/@Atimeperc

    -- Deduplicación atómica: un mismo contador + instante no debería
    -- repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_g02_cnt_fecha_hora UNIQUE (cnt_id, fecha, hora)
);

CREATE INDEX IF NOT EXISTS idx_t_g02_nombre_fichero ON :schema.t_g02(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_g02_cnt_id          ON :schema.t_g02(cnt_id);
CREATE INDEX IF NOT EXISTS idx_t_g02_fecha           ON :schema.t_g02(fecha);

CREATE TABLE IF NOT EXISTS :schema.t_g02_error (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,
    cnc_id              VARCHAR(50) NOT NULL,
    cnt_id              VARCHAR(50) NOT NULL,
    err_cat             INTEGER,
    err_code            INTEGER,
    fecha_procesado     TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT uq_t_g02_error_fichero_cnt UNIQUE (nombre_fichero, cnt_id)
);

CREATE INDEX IF NOT EXISTS idx_t_g02_error_nombre_fichero ON :schema.t_g02_error(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_g02_error_cnt_id         ON :schema.t_g02_error(cnt_id);
