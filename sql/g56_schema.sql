-- =============================================================
-- Esquema para el tipo de fichero G56
-- (calidad de suministro en baja tensión, por RTU y línea)
-- =============================================================
-- Jerarquía del XML:  Report > Rtu > LVSLine > G56*
--   A diferencia de todos los tipos anteriores, aquí NO hay Cnc/Cnt.
--   Las entidades son Rtu (equipo remoto) y LVSLine (línea de baja
--   tensión dentro de ese Rtu, identificada además por una posición
--   Pos). Cada G56 es una medida promediada (cada 5 minutos en el
--   ejemplo) por fase.
--
-- NOTA sobre supuestos pendientes de confirmar (ver README):
--   - Pos: posición de la línea dentro del Rtu, se guarda como texto
--     para preservar ceros a la izquierda ("01"), no como número.
--   - AvgPimph* / AvgPexph*: potencia activa media importada/exportada
--     por fase (asunción, dado el patrón Imp/Exp ya visto en AI/AE).
--   - AvgQimph* / AvgQexph*: potencia reactiva media importada/
--     exportada por fase (misma asunción).
--   - AvgPF*: factor de potencia medio por fase (asunción).
--   - AvgV12/V23/V31: tensiones de línea (fase-fase) medias (asunción).
--   - AvgCn: corriente de neutro media (asunción).
--   - Temp: temperatura (¿ambiente? ¿del equipo?), sin confirmar
--     unidad (asumido °C dados los valores ~19-20).
--   - Bc: bandera de calidad, sin decodificar (igual que en S02).
--   - No se ha visto ningún caso de error en este tipo de fichero, así
--     que no existe tabla "t_g56_error" (igual que en G01).
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_g56 (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,  -- informativo, no es FK
    rtu_id              VARCHAR(50) NOT NULL,   -- Rtu/@Id
    lvsline_id          VARCHAR(50) NOT NULL,   -- LVSLine/@Id
    pos                 VARCHAR(10) NOT NULL,   -- LVSLine/@Pos (texto, preserva ceros a la izquierda)

    fecha               DATE NOT NULL,           -- de Fh
    hora                TIME NOT NULL,
    flag_horario        CHAR(1),
    fh_raw              VARCHAR(20) NOT NULL,

    -- Fase 1
    avg_c_ph1           NUMERIC(10,3),   -- AvgCph1: corriente media fase 1
    avg_v_ph1           NUMERIC(10,3),   -- AvgVph1: tensión media fase 1
    avg_pimp_ph1        NUMERIC(14,3),   -- AvgPimph1: potencia activa media importada fase 1
    avg_pexp_ph1        NUMERIC(14,3),   -- AvgPexph1: potencia activa media exportada fase 1
    avg_qimp_ph1        NUMERIC(14,3),   -- AvgQimph1: potencia reactiva media importada fase 1
    avg_qexp_ph1        NUMERIC(14,3),   -- AvgQexph1: potencia reactiva media exportada fase 1
    avg_pf_ph1          NUMERIC(6,3),    -- AvgPF1: factor de potencia medio fase 1

    -- Fase 2
    avg_c_ph2           NUMERIC(10,3),
    avg_v_ph2           NUMERIC(10,3),
    avg_pimp_ph2        NUMERIC(14,3),
    avg_pexp_ph2        NUMERIC(14,3),
    avg_qimp_ph2        NUMERIC(14,3),
    avg_qexp_ph2        NUMERIC(14,3),
    avg_pf_ph2          NUMERIC(6,3),

    -- Fase 3
    avg_c_ph3           NUMERIC(10,3),
    avg_v_ph3           NUMERIC(10,3),
    avg_pimp_ph3        NUMERIC(14,3),
    avg_pexp_ph3        NUMERIC(14,3),
    avg_qimp_ph3        NUMERIC(14,3),
    avg_qexp_ph3        NUMERIC(14,3),
    avg_pf_ph3          NUMERIC(6,3),

    -- Tensiones de línea (fase-fase)
    avg_v12             NUMERIC(10,3),   -- AvgV12
    avg_v23             NUMERIC(10,3),   -- AvgV23
    avg_v31             NUMERIC(10,3),   -- AvgV31

    avg_cn              NUMERIC(10,3),   -- AvgCn: corriente de neutro media
    temp                NUMERIC(6,2),    -- Temp
    bc                  VARCHAR(5),      -- bandera de calidad, sin decodificar

    -- Deduplicación atómica: una misma línea + instante no debería
    -- repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_g56_rtu_line_fecha_hora UNIQUE (rtu_id, lvsline_id, fecha, hora)
);

CREATE INDEX IF NOT EXISTS idx_t_g56_nombre_fichero ON :schema.t_g56(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_g56_lvsline_id      ON :schema.t_g56(lvsline_id);
CREATE INDEX IF NOT EXISTS idx_t_g56_fecha           ON :schema.t_g56(fecha);
