-- =============================================================
-- Esquema para el tipo de fichero S08
-- (número de eventos y tiempo acumulado de subtensión/sobretensión/
--  corte, total y por fase, por contador)
-- =============================================================
-- Jerarquía del XML:  Report > Cnc > Cnt > S08 > (Sub, Sob, Corte)
--   Cada uno de los tres bloques (Sub, Sob, Corte) trae el mismo
--   conjunto de 12 atributos: número de eventos (N*) y tiempo (T*),
--   total (Tt/Ta) y por fase (Tf1/Tf2/Tf3 + su variante "a").
--
-- DECISIÓN DE DISEÑO: igual que en S96, se usa una tabla "larga"/tidy
-- (una fila por categoría: Sub/Sob/Corte) en vez de una fila ancha con
-- 36 columnas (12 x 3 categorías).
--
-- NOTA sobre supuestos pendientes de confirmar (ver README):
--   - Sub = subtensión, Sob = sobretensión, Corte = corte de
--     suministro (asunción por el nombre).
--   - N{x}Tt: número total de eventos de ese tipo (asunción).
--   - T{x}Tt: tiempo total acumulado de ese tipo (asunción, unidad sin
--     confirmar — ¿segundos? ¿minutos?).
--   - T{x}Ta: sin identificar con seguridad (¿tiempo medio?).
--   - N{x}Tf1/2/3, T{x}Tf1/2/3: número de eventos y tiempo por fase.
--   - T{x}Tf1a/2a/3a: sin identificar con seguridad (¿tiempo medio por
--     fase?).
--   - Se asume que Cnt puede venir en error (ErrCat/ErrCode) igual que
--     en S02, aunque no se ha visto ningún caso en el ejemplo de S08.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_s08 (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,  -- informativo, no es FK
    cnc_id              VARCHAR(50) NOT NULL,   -- Cnc/@Id
    cnt_id              VARCHAR(50) NOT NULL,   -- Cnt/@Id

    fecha               DATE NOT NULL,           -- de Fh
    hora                TIME NOT NULL,
    flag_horario        CHAR(1),
    fh_raw              VARCHAR(20) NOT NULL,

    categoria           VARCHAR(10) NOT NULL,    -- 'Sub', 'Sob' o 'Corte'

    n_tt                INTEGER,
    t_tt                NUMERIC(14,3),
    t_ta                NUMERIC(14,3),
    n_tf1               INTEGER,
    t_tf1               NUMERIC(14,3),
    t_tf1a              NUMERIC(14,3),
    n_tf2               INTEGER,
    t_tf2               NUMERIC(14,3),
    t_tf2a              NUMERIC(14,3),
    n_tf3               INTEGER,
    t_tf3               NUMERIC(14,3),
    t_tf3a              NUMERIC(14,3),

    -- Deduplicación atómica: un mismo contador + instante + categoría
    -- no debería repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_s08_cnt_fecha_hora_categoria UNIQUE (cnt_id, fecha, hora, categoria)
);

CREATE INDEX IF NOT EXISTS idx_t_s08_nombre_fichero ON :schema.t_s08(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s08_cnt_id          ON :schema.t_s08(cnt_id);
CREATE INDEX IF NOT EXISTS idx_t_s08_fecha           ON :schema.t_s08(fecha);
CREATE INDEX IF NOT EXISTS idx_t_s08_categoria       ON :schema.t_s08(categoria);

CREATE TABLE IF NOT EXISTS :schema.t_s08_error (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,
    cnc_id              VARCHAR(50) NOT NULL,
    cnt_id              VARCHAR(50) NOT NULL,
    err_cat             INTEGER,
    err_code            INTEGER,
    fecha_procesado     TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT uq_t_s08_error_fichero_cnt UNIQUE (nombre_fichero, cnt_id)
);

CREATE INDEX IF NOT EXISTS idx_t_s08_error_nombre_fichero ON :schema.t_s08_error(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s08_error_cnt_id         ON :schema.t_s08_error(cnt_id);
