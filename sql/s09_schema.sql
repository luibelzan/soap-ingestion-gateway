-- =============================================================
-- Esquema para el tipo de fichero S09
-- (log de eventos del contador)
-- =============================================================
-- Jerarquía del XML:  Report > Cnc > Cnt > S09*
--   Cada S09 es un evento: Fh (fecha-hora del evento), Et (tipo de
--   evento), C (código de evento). Opcionalmente trae hijos D1/D2 con
--   contenido variable: a veces valores pequeños (1, 2), a veces otra
--   fecha-hora en el mismo formato que Fh.
--
-- NOTA sobre supuestos pendientes de confirmar (ver README):
--   - Et / C: significado exacto de "tipo de evento" y "código" sin
--     confirmar. Se guardan tal cual.
--   - D1 / D2: se guarda el valor crudo como texto (d1_raw / d2_raw).
--     Si D1 encaja con el formato de fecha-hora de Fh, ADEMÁS se
--     guarda parseado en fecha_d1/hora_d1; si no encaja (p.ej. es solo
--     "1" o "2"), esas columnas quedan NULL y solo queda el texto.
--   - Se asume que Cnt puede venir en error (ErrCat/ErrCode) igual que
--     en S02, aunque no se ha visto ningún caso en el ejemplo de S09.
--
-- Deduplicación: la clave de negocio incluye et y c además de
-- fecha/hora, porque un mismo Cnt puede tener eventos simultáneos
-- (mismo Fh) con Et/C distintos.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_s09 (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,  -- informativo, no es FK
    cnc_id              VARCHAR(50) NOT NULL,   -- Cnc/@Id
    cnt_id              VARCHAR(50) NOT NULL,   -- Cnt/@Id

    fecha               DATE NOT NULL,           -- de Fh
    hora                TIME NOT NULL,
    flag_horario        CHAR(1),
    fh_raw              VARCHAR(20) NOT NULL,

    et                  INTEGER NOT NULL,        -- S09/@Et, tipo de evento
    c                   INTEGER NOT NULL,        -- S09/@C, código de evento

    d1_raw              VARCHAR(30),             -- contenido crudo de <D1>
    fecha_d1            DATE,                    -- si D1 parece fecha-hora
    hora_d1             TIME,
    flag_horario_d1     CHAR(1),

    d2_raw              VARCHAR(30),             -- contenido crudo de <D2>

    -- Deduplicación atómica: un mismo evento (mismo instante, tipo y
    -- código) no debería repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_s09_cnt_fecha_hora_et_c UNIQUE (cnt_id, fecha, hora, et, c)
);

CREATE INDEX IF NOT EXISTS idx_t_s09_nombre_fichero ON :schema.t_s09(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s09_cnt_id          ON :schema.t_s09(cnt_id);
CREATE INDEX IF NOT EXISTS idx_t_s09_fecha           ON :schema.t_s09(fecha);

CREATE TABLE IF NOT EXISTS :schema.t_s09_error (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,
    cnc_id              VARCHAR(50) NOT NULL,
    cnt_id              VARCHAR(50) NOT NULL,
    err_cat             INTEGER,
    err_code            INTEGER,
    fecha_procesado     TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT uq_t_s09_error_fichero_cnt UNIQUE (nombre_fichero, cnt_id)
);

CREATE INDEX IF NOT EXISTS idx_t_s09_error_nombre_fichero ON :schema.t_s09_error(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s09_error_cnt_id         ON :schema.t_s09_error(cnt_id);
