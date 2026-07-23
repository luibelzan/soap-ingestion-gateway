-- =============================================================
-- Esquema para el tipo de fichero S07
-- (posibles contadores de corte/fraude por contador)
-- =============================================================
-- Jerarquía del XML:  Report > Cnc > Cnt > S07*
--   Mismo patrón que S02. Hc trae una segunda fecha-hora en formato Fh.
--
-- NOTA sobre supuestos pendientes de confirmar (ver README):
--   - Dc: entero, significado sin confirmar (posible "días de corte").
--   - Nc: entero, significado sin confirmar (posible "número de
--     cortes").
--   - Df: entero, significado sin confirmar (posible "días de fraude"
--     o similar).
--   - Hc: fecha-hora relacionada (posible "hora de corte" o última
--     vez que ocurrió el evento que cuentan Dc/Nc/Df), sin confirmar.
--   - Se asume que Cnt puede venir en error (ErrCat/ErrCode) igual que
--     en S02, aunque no se ha visto ningún caso en el ejemplo de S07.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_s07 (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,  -- informativo, no es FK
    cnc_id              VARCHAR(50) NOT NULL,   -- Cnc/@Id
    cnt_id              VARCHAR(50) NOT NULL,   -- Cnt/@Id

    fecha               DATE NOT NULL,           -- de Fh
    hora                TIME NOT NULL,
    flag_horario        CHAR(1),
    fh_raw              VARCHAR(20) NOT NULL,

    dc                  INTEGER,         -- S07/@Dc, significado sin confirmar
    nc                  INTEGER,         -- S07/@Nc, significado sin confirmar
    df                  INTEGER,         -- S07/@Df, significado sin confirmar

    hc_fecha            DATE,            -- de Hc (formato Fh completo)
    hc_hora             TIME,
    hc_flag_horario     CHAR(1),
    hc_raw              VARCHAR(20),

    -- Deduplicación atómica: un mismo contador + instante no debería
    -- repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_s07_cnt_fecha_hora UNIQUE (cnt_id, fecha, hora)
);

CREATE INDEX IF NOT EXISTS idx_t_s07_nombre_fichero ON :schema.t_s07(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s07_cnt_id          ON :schema.t_s07(cnt_id);
CREATE INDEX IF NOT EXISTS idx_t_s07_fecha           ON :schema.t_s07(fecha);

CREATE TABLE IF NOT EXISTS :schema.t_s07_error (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,
    cnc_id              VARCHAR(50) NOT NULL,
    cnt_id              VARCHAR(50) NOT NULL,
    err_cat             INTEGER,
    err_code            INTEGER,
    fecha_procesado     TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT uq_t_s07_error_fichero_cnt UNIQUE (nombre_fichero, cnt_id)
);

CREATE INDEX IF NOT EXISTS idx_t_s07_error_nombre_fichero ON :schema.t_s07_error(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s07_error_cnt_id         ON :schema.t_s07_error(cnt_id);
