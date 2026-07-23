-- =============================================================
-- Esquema para el tipo de fichero S02
-- (curva horaria de energía activa/reactiva por contador)
-- =============================================================
-- Jerarquía del XML:  Report > Cnc > Cnt > S02*
--   Cnt puede venir con lecturas (S02) o, en su lugar, con
--   ErrCat/ErrCode si el contador dio error (mutuamente excluyente).
--
-- Decisión de diseño: sin tabla de cabecera de fichero ni tabla
-- intermedia de contador. El nombre de fichero (nombre_fichero) se
-- guarda como columna informativa directamente en cada tabla de
-- hechos, no como FK. La deduplicación se hace vía UNIQUE + ON
-- CONFLICT DO NOTHING sobre la clave de negocio (no sobre el fichero),
-- así un mismo fichero reenviado no duplica datos.
--
-- Fecha y hora van en columnas SEPARADAS (fecha DATE + hora TIME) en
-- vez de un único TIMESTAMP, a petición explícita, para todos los
-- tipos de fichero.
--
-- NOTA sobre supuestos pendientes de confirmar (ver README):
--   - Bc: bandera de calidad/estado de la lectura, sin decodificar aún.
--   - Magn: magnitud/escala del contador, significado exacto pendiente.
--   - Fh: AAAAMMDDHHmmss + 3 dígitos (descartados) + 1 letra, asumida
--     como indicador de horario verano/invierno.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_s02 (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,  -- informativo, no es FK
    cnc_id              VARCHAR(50) NOT NULL,   -- Cnc/@Id (del XML)
    cnt_id              VARCHAR(50) NOT NULL,   -- Cnt/@Id (contador)
    magnitud            INTEGER,                -- Cnt/@Magn

    fecha               DATE NOT NULL,
    hora                TIME NOT NULL,
    flag_horario        CHAR(1),                -- letra final de Fh (asunción: V/I/S)
    fh_raw              VARCHAR(20) NOT NULL,   -- Fh original completo, sin interpretar
    bc                  VARCHAR(5),             -- bandera de calidad/estado, sin decodificar
    ai                  NUMERIC(14,3) NOT NULL DEFAULT 0, -- activa entrante
    ae                  NUMERIC(14,3) NOT NULL DEFAULT 0, -- activa saliente
    r1                  NUMERIC(14,3) NOT NULL DEFAULT 0, -- reactiva cuadrante 1
    r2                  NUMERIC(14,3) NOT NULL DEFAULT 0, -- reactiva cuadrante 2
    r3                  NUMERIC(14,3) NOT NULL DEFAULT 0, -- reactiva cuadrante 3
    r4                  NUMERIC(14,3) NOT NULL DEFAULT 0, -- reactiva cuadrante 4

    -- Deduplicación atómica: si el fichero se reprocesa, estas filas
    -- ya no se vuelven a insertar (ON CONFLICT DO NOTHING en el repository)
    CONSTRAINT uq_t_s02_cnt_fecha_hora UNIQUE (cnt_id, fecha, hora)
);

CREATE INDEX IF NOT EXISTS idx_t_s02_nombre_fichero ON :schema.t_s02(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s02_fecha           ON :schema.t_s02(fecha);
CREATE INDEX IF NOT EXISTS idx_t_s02_cnt_id          ON :schema.t_s02(cnt_id);

CREATE TABLE IF NOT EXISTS :schema.t_s02_error (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,
    cnc_id              VARCHAR(50) NOT NULL,
    cnt_id              VARCHAR(50) NOT NULL,
    err_cat             INTEGER,
    err_code            INTEGER,
    fecha_procesado     TIMESTAMP NOT NULL DEFAULT now(),

    -- Evita duplicar el mismo error si el fichero se reprocesa
    CONSTRAINT uq_t_s02_error_fichero_cnt UNIQUE (nombre_fichero, cnt_id)
);

CREATE INDEX IF NOT EXISTS idx_t_s02_error_nombre_fichero ON :schema.t_s02_error(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s02_error_cnt_id         ON :schema.t_s02_error(cnt_id);
