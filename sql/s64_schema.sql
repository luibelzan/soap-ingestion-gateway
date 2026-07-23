-- =============================================================
-- Esquema para el tipo de fichero S64
-- (tensión/corriente por fase y potencia aparente, por línea de baja tensión)
-- =============================================================
-- Jerarquía del XML:  Report > Rtu > LVSLine > S64*
--   Mismos campos que S14 (V1-3, I1-3, In, Simp, Sexp, Bc) pero medidos
--   a nivel de línea de baja tensión, no de contador. Sin nivel Cnt,
--   así que no hay tabla de error (igual que S52/S53).
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_s64 (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,  -- informativo, no es FK
    rtu_id              VARCHAR(50) NOT NULL,   -- Rtu/@Id
    lvsline_id          VARCHAR(50) NOT NULL,   -- LVSLine/@Id
    pos                 VARCHAR(10) NOT NULL,   -- LVSLine/@Pos

    fecha               DATE NOT NULL,           -- de Fh
    hora                TIME NOT NULL,
    flag_horario        CHAR(1),
    fh_raw              VARCHAR(20) NOT NULL,
    bc                  VARCHAR(5),      -- bandera de calidad, sin decodificar

    v1                  NUMERIC(10,3),
    v2                  NUMERIC(10,3),
    v3                  NUMERIC(10,3),
    i1                  NUMERIC(10,3),
    i2                  NUMERIC(10,3),
    i3                  NUMERIC(10,3),
    in_neutro           NUMERIC(10,3),   -- In: corriente de neutro
    simp                NUMERIC(14,3),   -- potencia aparente importada
    sexp                NUMERIC(14,3),   -- potencia aparente exportada

    -- Deduplicación atómica: una misma línea + instante no debería
    -- repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_s64_line_fecha_hora UNIQUE (lvsline_id, fecha, hora)
);

CREATE INDEX IF NOT EXISTS idx_t_s64_nombre_fichero ON :schema.t_s64(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s64_lvsline_id      ON :schema.t_s64(lvsline_id);
CREATE INDEX IF NOT EXISTS idx_t_s64_fecha           ON :schema.t_s64(fecha);
