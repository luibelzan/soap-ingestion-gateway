-- =============================================================
-- Esquema para el tipo de fichero G53
-- (posible tensión neutro-tierra, a nivel de RTU)
-- =============================================================
-- Jerarquía del XML:  Report > Rtu > G53*
--   Misma jerarquía simple que S93/S95/S98 (sin LVSLine).
--
-- NOTA sobre supuestos pendientes de confirmar (ver README):
--   - VTNMin/VTNAvg/VTNMax: interpretación tentativa como mínimo,
--     promedio y máximo de una magnitud "VTN" (posiblemente tensión
--     neutro-tierra), dado el patrón Min/Avg/Max ya visto en otros
--     tipos, sin confirmar qué es exactamente "VTN".
--   - VTNLSM: sin identificar; siempre 0.0 en el ejemplo visto, así
--     que no se puede inferir su significado a partir de los datos.
--   - Bc: bandera de calidad, sin decodificar.
--   - No se ha observado ningún caso de error en este tipo de fichero.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_g53 (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,  -- informativo, no es FK
    rtu_id              VARCHAR(50) NOT NULL,   -- Rtu/@Id

    fecha               DATE NOT NULL,           -- de Fh
    hora                TIME NOT NULL,
    flag_horario        CHAR(1),
    fh_raw              VARCHAR(20) NOT NULL,

    vtn_min             NUMERIC(10,3),   -- G53/@VTNMin
    vtn_avg             NUMERIC(10,3),   -- G53/@VTNAvg
    vtn_max             NUMERIC(10,3),   -- G53/@VTNMax
    vtn_lsm             NUMERIC(10,3),   -- G53/@VTNLSM, sin identificar
    bc                  VARCHAR(5),      -- bandera de calidad, sin decodificar

    -- Deduplicación atómica: un mismo Rtu + instante no debería
    -- repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_g53_rtu_fecha_hora UNIQUE (rtu_id, fecha, hora)
);

CREATE INDEX IF NOT EXISTS idx_t_g53_nombre_fichero ON :schema.t_g53(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_g53_rtu_id          ON :schema.t_g53(rtu_id);
CREATE INDEX IF NOT EXISTS idx_t_g53_fecha           ON :schema.t_g53(fecha);
