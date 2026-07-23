-- =============================================================
-- Esquema para el tipo de fichero S06
-- (snapshot de configuración/inventario del contador)
-- =============================================================
-- Jerarquía del XML:  Report > Cnc > Cnt > S06
--   A diferencia de S02/S04/S05/S09, aquí S06 no es una serie temporal
--   de medidas sino una FOTO de la configuración/identificación del
--   contador en el momento Fh: fabricante, modelo, firmware, MAC,
--   umbrales de tensión, etc. Muchos campos vienen vacíos en los
--   ejemplos vistos (Tp, Ts, Ip, Is), su propósito no está claro.
--
-- NOTA sobre supuestos pendientes de confirmar (ver README):
--   - Fab/Mod/Vf/VPrime/Pro: se han recortado espacios en blanco
--     (p.ej. " Q" -> "Q") por parecer relleno de un formato de ancho
--     fijo original, no parte real del valor.
--   - Usag/Uswell/Ut/UsubT/UsobT/UcorteT: umbrales relacionados con
--     tensión (Umbral Subtensión / Sobretensión / Corte), asunción por
--     los nombres, sin confirmar unidades exactas.
--   - Per: periodo en segundos (asunción, dado el valor 3600 = 1h).
--   - Dctcp: sin identificar, valor tipo porcentaje (95.00).
--   - AutMothBill: posible flag de facturación mensual automática
--     (Y/N), asunción por el nombre.
--   - ScrollDispMode/ScrollDispTime: configuración de la pantalla del
--     contador (modo y tiempo de scroll), asunción.
--   - Se asume que Cnt puede venir en error (ErrCat/ErrCode) igual que
--     en S02, aunque no se ha visto ningún caso en el ejemplo de S06.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_s06 (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,  -- informativo, no es FK
    cnc_id              VARCHAR(50) NOT NULL,   -- Cnc/@Id
    cnt_id              VARCHAR(50) NOT NULL,   -- Cnt/@Id

    fecha               DATE NOT NULL,           -- de Fh
    hora                TIME NOT NULL,
    flag_horario        CHAR(1),
    fh_raw              VARCHAR(20) NOT NULL,

    ns                  VARCHAR(50),     -- número de serie (S06/@NS)
    fab                 VARCHAR(50),     -- fabricante (recortado de espacios)
    mod                 VARCHAR(50),     -- modelo
    af                  INTEGER,         -- año de fabricación
    te                  VARCHAR(50),     -- tipo de equipo
    vf                  VARCHAR(50),     -- versión firmware
    vprime              VARCHAR(50),     -- "VPrime", significado sin confirmar
    pro                 VARCHAR(50),     -- protocolo (p.ej. DLMS0105)
    idm                 VARCHAR(100),    -- identificador largo, sin confirmar propósito
    mac                 VARCHAR(20),     -- dirección MAC del equipo

    tp                  VARCHAR(50),     -- vacío en los ejemplos vistos
    ts                  VARCHAR(50),     -- vacío en los ejemplos vistos
    ip                  VARCHAR(50),     -- vacío en los ejemplos vistos
    is_                 VARCHAR(50),     -- "Is" en el XML; renombrado is_ (palabra reservada en algunos motores)

    usag                NUMERIC(10,3),
    uswell              NUMERIC(10,3),
    per                 INTEGER,         -- periodo en segundos (asunción)
    dctcp               NUMERIC(10,3),
    vr                  NUMERIC(10,3),   -- tensión de referencia
    ut                  NUMERIC(10,3),
    usubt               NUMERIC(10,3),   -- umbral subtensión (asunción)
    usobt               NUMERIC(10,3),   -- umbral sobretensión (asunción)
    ucortet              NUMERIC(10,3),   -- umbral corte (asunción)

    autmothbill         VARCHAR(5),      -- posible flag facturación mensual automática (Y/N)
    scrolldispmode      VARCHAR(10),     -- modo de scroll de pantalla
    scrolldisptime      INTEGER,         -- tiempo de scroll de pantalla (segundos)

    -- Deduplicación atómica: un mismo contador + instante no debería
    -- repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_s06_cnt_fecha_hora UNIQUE (cnt_id, fecha, hora)
);

CREATE INDEX IF NOT EXISTS idx_t_s06_nombre_fichero ON :schema.t_s06(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s06_cnt_id          ON :schema.t_s06(cnt_id);
CREATE INDEX IF NOT EXISTS idx_t_s06_fecha           ON :schema.t_s06(fecha);

CREATE TABLE IF NOT EXISTS :schema.t_s06_error (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,
    cnc_id              VARCHAR(50) NOT NULL,
    cnt_id              VARCHAR(50) NOT NULL,
    err_cat             INTEGER,
    err_code            INTEGER,
    fecha_procesado     TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT uq_t_s06_error_fichero_cnt UNIQUE (nombre_fichero, cnt_id)
);

CREATE INDEX IF NOT EXISTS idx_t_s06_error_nombre_fichero ON :schema.t_s06_error(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s06_error_cnt_id         ON :schema.t_s06_error(cnt_id);
