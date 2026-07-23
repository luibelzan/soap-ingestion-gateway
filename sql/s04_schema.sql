-- =============================================================
-- Esquema para el tipo de fichero S04
-- (cierres por periodo tarifario con máximetro)
-- =============================================================
-- Jerarquía del XML:  Report > Cnc > Cnt > S04* > Value x2
--   Cada S04 representa un periodo tarifario (Pt) dentro de una
--   ventana de facturación (Fhi-Fhf), con su máximetro (Mx/Fx) y
--   dos bloques Value: uno con sufijo "a" (AIa, AEa, R1a-R4a) y
--   otro con sufijo "i" (AIi, AEi, R1i-R4i).
--
-- Fecha y hora van en columnas SEPARADAS (fecha_x DATE + hora_x TIME)
-- en vez de un único TIMESTAMP, a petición explícita, para todos los
-- tipos de fichero.
--
-- NOTA sobre supuestos pendientes de confirmar (ver README):
--   - Ctr: siempre "1" en los ejemplos vistos, significado sin
--     confirmar.
--   - Los sufijos "a" / "i" de los dos bloques Value: se guardan
--     ambos conjuntos de columnas tal cual, sin asumir su
--     significado (¿activa/incremento? ¿actual/anterior?).
--   - Se asume que Cnt puede venir en error (ErrCat/ErrCode) igual
--     que en S02, aunque no se ha visto ningún caso en el ejemplo.
--   - Fhi/Fhf/Fx: mismo formato que Fh en S02 (AAAAMMDDHHmmss + 3
--     dígitos + 1 letra).
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_s04 (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,  -- informativo, no es FK
    cnc_id              VARCHAR(50) NOT NULL,   -- Cnc/@Id
    cnt_id              VARCHAR(50) NOT NULL,   -- Cnt/@Id
    ctr                 INTEGER,                -- S04/@Ctr, significado sin confirmar
    pt                  INTEGER NOT NULL,        -- S04/@Pt, periodo tarifario

    fecha_inicio        DATE NOT NULL,           -- de Fhi
    hora_inicio         TIME NOT NULL,
    flag_horario_inicio CHAR(1),
    fhi_raw             VARCHAR(20) NOT NULL,

    fecha_fin           DATE NOT NULL,           -- de Fhf
    hora_fin            TIME NOT NULL,
    flag_horario_fin    CHAR(1),
    fhf_raw             VARCHAR(20) NOT NULL,

    mx                  NUMERIC(14,3),           -- máximetro (potencia máxima)
    fecha_max           DATE,                    -- de Fx
    hora_max            TIME,
    flag_horario_max    CHAR(1),
    fx_raw              VARCHAR(20),

    -- Bloque Value con sufijo "a"
    ai_a                NUMERIC(14,3) NOT NULL DEFAULT 0,
    ae_a                NUMERIC(14,3) NOT NULL DEFAULT 0,
    r1_a                NUMERIC(14,3) NOT NULL DEFAULT 0,
    r2_a                NUMERIC(14,3) NOT NULL DEFAULT 0,
    r3_a                NUMERIC(14,3) NOT NULL DEFAULT 0,
    r4_a                NUMERIC(14,3) NOT NULL DEFAULT 0,

    -- Bloque Value con sufijo "i"
    ai_i                NUMERIC(14,3) NOT NULL DEFAULT 0,
    ae_i                NUMERIC(14,3) NOT NULL DEFAULT 0,
    r1_i                NUMERIC(14,3) NOT NULL DEFAULT 0,
    r2_i                NUMERIC(14,3) NOT NULL DEFAULT 0,
    r3_i                NUMERIC(14,3) NOT NULL DEFAULT 0,
    r4_i                NUMERIC(14,3) NOT NULL DEFAULT 0,

    -- Deduplicación atómica: un mismo contador + ventana + periodo tarifario
    -- no debería repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_s04_cnt_ventana_pt
        UNIQUE (cnt_id, fecha_inicio, hora_inicio, fecha_fin, hora_fin, pt)
);

CREATE INDEX IF NOT EXISTS idx_t_s04_nombre_fichero ON :schema.t_s04(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s04_cnt_id          ON :schema.t_s04(cnt_id);
CREATE INDEX IF NOT EXISTS idx_t_s04_fecha_inicio     ON :schema.t_s04(fecha_inicio);

CREATE TABLE IF NOT EXISTS :schema.t_s04_error (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,
    cnc_id              VARCHAR(50) NOT NULL,
    cnt_id              VARCHAR(50) NOT NULL,
    err_cat             INTEGER,
    err_code            INTEGER,
    fecha_procesado     TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT uq_t_s04_error_fichero_cnt UNIQUE (nombre_fichero, cnt_id)
);

CREATE INDEX IF NOT EXISTS idx_t_s04_error_nombre_fichero ON :schema.t_s04_error(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s04_error_cnt_id         ON :schema.t_s04_error(cnt_id);
