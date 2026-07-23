-- =============================================================
-- Esquema para el tipo de fichero S26
-- (valores instantáneos configurables, formato clave-valor)
-- =============================================================
-- Jerarquía del XML:  Report > Cnc > Cnt > S26 > (DataId, DataValue)*
--   A diferencia de todos los tipos anteriores, S26 no trae atributos
--   fijos: trae una lista de pares <DataId>/<DataValue> alternados,
--   donde DataId es el NOMBRE del campo (p.ej. "L1v", "Pimp", "AIa") y
--   DataValue es su valor. El conjunto de campos reportados es
--   variable de fichero en fichero — coincide con el atributo
--   S26Content visto en la configuración de S12/S62 (p.ej.
--   "Pimp,AIa,L1v"), que parece configurar justo esto.
--
-- En vez de una tabla "larga"/tidy (como en S96/S08), aquí se usa una
-- tabla ANCHA con una columna fija por cada campo posible conocido:
-- cada DataId se traduce a su columna (en minúsculas) y solo se
-- rellenan las columnas de los campos que traiga ese fichero en
-- concreto; el resto quedan NULL.
--
-- Aparte de eso, sigue el MISMO patrón que el resto de tipos con
-- jerarquía Cnc > Cnt (como S02): nombre_fichero informativo,
-- fecha/hora/flag_horario/fh_raw, deduplicación vía UNIQUE + ON
-- CONFLICT DO NOTHING, y tabla t_s26_error para el caso de contador
-- en error (por analogía; no se ha visto ningún caso en el ejemplo).
--
-- NOTA sobre supuestos pendientes de confirmar (ver README):
--   - Significado de cada campo: se ha asumido por analogía con otros
--     tipos ya vistos (l1v/l2v/l3v = tensión por fase, l1i/l2i/l3i =
--     corriente por fase, pimp/pexp = potencia activa import/export,
--     qimp/qexp = potencia reactiva import/export, pf = factor de
--     potencia, aia/aea = activa entrante/saliente, r1a-r4a = reactiva
--     por cuadrante). ca, pp, fc, eacti, eanti, i3: sin identificar
--     con seguridad.
--   - pp es el único campo de texto (VARCHAR); el resto son numéricos.
--   - Si llega un DataId que no coincide con ninguna columna conocida,
--     el parser lo descarta con un aviso en vez de fallar.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_s26 (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,  -- informativo, no es FK
    cnc_id              VARCHAR(50) NOT NULL,   -- Cnc/@Id
    cnt_id              VARCHAR(50) NOT NULL,   -- Cnt/@Id

    fecha               DATE NOT NULL,           -- de Fh
    hora                TIME NOT NULL,
    flag_horario        CHAR(1),
    fh_raw              VARCHAR(20) NOT NULL,

    l1v         NUMERIC,
    l1i         NUMERIC,
    l2v         NUMERIC,
    l2i         NUMERIC,
    l3v         NUMERIC,
    l3i         NUMERIC,
    i3          NUMERIC,
    pimp        NUMERIC,
    pexp        NUMERIC,
    qimp        NUMERIC,
    qexp        NUMERIC,
    pf          NUMERIC,
    ca          NUMERIC,
    pp          VARCHAR(9),  -- único campo de texto; el resto son numéricos
    fc          NUMERIC,
    eacti       NUMERIC,
    eanti       NUMERIC,
    aia         NUMERIC,
    aea         NUMERIC,
    r1a         NUMERIC,
    r2a         NUMERIC,
    r3a         NUMERIC,
    r4a         NUMERIC,

    -- Deduplicación atómica: un mismo contador + instante no debería
    -- repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_s26_cnt_fecha_hora UNIQUE (cnt_id, fecha, hora)
);

CREATE INDEX IF NOT EXISTS idx_t_s26_nombre_fichero ON :schema.t_s26(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s26_cnt_id          ON :schema.t_s26(cnt_id);
CREATE INDEX IF NOT EXISTS idx_t_s26_fecha           ON :schema.t_s26(fecha);

CREATE TABLE IF NOT EXISTS :schema.t_s26_error (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,
    cnc_id              VARCHAR(50) NOT NULL,
    cnt_id              VARCHAR(50) NOT NULL,
    err_cat             INTEGER,
    err_code            INTEGER,
    fecha_procesado     TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT uq_t_s26_error_fichero_cnt UNIQUE (nombre_fichero, cnt_id)
);

CREATE INDEX IF NOT EXISTS idx_t_s26_error_nombre_fichero ON :schema.t_s26_error(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s26_error_cnt_id         ON :schema.t_s26_error(cnt_id);
