-- =============================================================
-- Esquema para el tipo de fichero S59
-- (log de eventos a nivel de línea de baja tensión)
-- =============================================================
-- Jerarquía del XML:  Report > Rtu > LVSLine > S59*
--   Igual patrón que S09 (log de eventos con D1/D2 opcionales, donde
--   D1 puede ser una fecha-hora) pero a nivel de LVSLine en vez de Cnt.
--
-- NOTA: se ha confirmado que la letra final de Fh/D1 no es siempre
-- "S" (aquí aparece "W" en un valor de D1: "19700101010241000W",
-- fecha época 1970-01-01). El parser ya soportaba cualquier letra.
--
-- NOTA sobre supuestos pendientes de confirmar (ver README):
--   - Et/C: significado sin confirmar (igual que en S09/S17).
--   - D1/D2: igual que en S09, se guarda el crudo y, si D1 encaja con
--     el formato de fecha-hora, se parsea además en columnas separadas.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_s59 (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,  -- informativo, no es FK
    rtu_id              VARCHAR(50) NOT NULL,   -- Rtu/@Id
    lvsline_id          VARCHAR(50) NOT NULL,   -- LVSLine/@Id
    pos                 VARCHAR(10) NOT NULL,   -- LVSLine/@Pos

    fecha               DATE NOT NULL,           -- de Fh
    hora                TIME NOT NULL,
    flag_horario        CHAR(1),
    fh_raw              VARCHAR(20) NOT NULL,

    et                  INTEGER NOT NULL,        -- S59/@Et, tipo de evento
    c                   INTEGER NOT NULL,        -- S59/@C, código de evento

    d1_raw              VARCHAR(30),             -- contenido crudo de <D1>
    fecha_d1            DATE,                    -- si D1 parece fecha-hora
    hora_d1             TIME,
    flag_horario_d1     CHAR(1),

    d2_raw              VARCHAR(30),             -- contenido crudo de <D2>

    -- Deduplicación atómica: un mismo evento (mismo instante, tipo y
    -- código) no debería repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_s59_line_fecha_hora_et_c UNIQUE (lvsline_id, fecha, hora, et, c)
);

CREATE INDEX IF NOT EXISTS idx_t_s59_nombre_fichero ON :schema.t_s59(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s59_lvsline_id      ON :schema.t_s59(lvsline_id);
CREATE INDEX IF NOT EXISTS idx_t_s59_fecha           ON :schema.t_s59(fecha);
