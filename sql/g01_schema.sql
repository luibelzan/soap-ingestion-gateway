-- =============================================================
-- Esquema para el tipo de fichero G01
-- (estadística de cobertura/disponibilidad de lectura del concentrador)
-- =============================================================
-- Jerarquía del XML:  Report > Cnc > G01*
--   A diferencia de S02/S04/S05/S09, aquí NO hay nivel Cnt: los datos
--   son directamente por concentrador (Cnc), una fila por hora (Fh).
--
-- NOTA sobre supuestos pendientes de confirmar (ver README):
--   - Amed: valor medio de contadores leídos en la hora (asunción).
--   - Amax: valor máximo de contadores leídos en la hora (asunción).
--   - Tot: total de contadores esperados/asociados al concentrador
--     (asunción).
--   - Aperc: porcentaje de cobertura/disponibilidad (Amed/Tot*100,
--     asunción, dado que los valores observados son coherentes con
--     ese cálculo).
--   - Al no existir Cnt en este tipo de fichero, no aplica una tabla
--     "t_g01_error" por contador como en los tipos anteriores.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_g01 (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,  -- informativo, no es FK
    cnc_id              VARCHAR(50) NOT NULL,   -- Cnc/@Id

    fecha               DATE NOT NULL,           -- de Fh
    hora                TIME NOT NULL,
    flag_horario        CHAR(1),
    fh_raw              VARCHAR(20) NOT NULL,

    amed                INTEGER NOT NULL,        -- G01/@Amed
    amax                INTEGER NOT NULL,        -- G01/@Amax
    tot                 INTEGER NOT NULL,        -- G01/@Tot
    aperc               NUMERIC(6,2) NOT NULL,   -- G01/@Aperc (porcentaje)

    -- Deduplicación atómica: un mismo concentrador + instante no
    -- debería repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_g01_cnc_fecha_hora UNIQUE (cnc_id, fecha, hora)
);

CREATE INDEX IF NOT EXISTS idx_t_g01_nombre_fichero ON :schema.t_g01(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_g01_cnc_id          ON :schema.t_g01(cnc_id);
CREATE INDEX IF NOT EXISTS idx_t_g01_fecha           ON :schema.t_g01(fecha);
