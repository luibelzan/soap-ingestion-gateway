-- =============================================================
-- Esquema para el tipo de fichero S29
-- (medida eléctrica completa por fase: tensión, corriente, potencia,
--  factor de potencia y ángulos, por contador)
-- =============================================================
-- Jerarquía del XML:  Report > Cnc > Cnt > S29*
--   Mismo patrón que S02 (Cnt puede venir con lecturas o en error).
--   A diferencia de la mayoría de tipos anteriores, S29 NO trae Bc.
--   Las fases 2 y 3 pueden venir vacías ("") en contadores
--   monofásicos, tratadas como NULL igual que en S44.
--
-- NOTA sobre supuestos pendientes de confirmar (ver README):
--   - L1v/L2v/L3v, L1i/L2i/L3i: tensión y corriente por fase.
--   - Isum: suma de corrientes (asunción).
--   - In: corriente de neutro (asunción, por analogía con otros tipos).
--   - Id: corriente diferencial/de derivación (asunción, por el
--     contexto de protección diferencial habitual en contadores).
--   - Psigned/L1P/L2P/L3P: potencia activa con signo, total y por fase
--     (asunción).
--   - Qsigned/L1Q/L2Q/L3Q: potencia reactiva con signo, total y por
--     fase (asunción).
--   - PF/L1PF/L2PF/L3PF: factor de potencia, total y por fase.
--   - PhaseSeq: secuencia de fases, vacío en el ejemplo, sin confirmar
--     formato.
--   - L1vAng/L2vAng/L3vAng, L1iAng/L2iAng/L3iAng, InAng/IdAng: ángulos
--     de fase de cada magnitud (grados, asunción).
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_s29 (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,  -- informativo, no es FK
    cnc_id              VARCHAR(50) NOT NULL,   -- Cnc/@Id
    cnt_id              VARCHAR(50) NOT NULL,   -- Cnt/@Id

    fecha               DATE NOT NULL,           -- de Fh
    hora                TIME NOT NULL,
    flag_horario        CHAR(1),
    fh_raw              VARCHAR(20) NOT NULL,

    l1v                 NUMERIC(10,3),
    l1i                 NUMERIC(10,3),
    l2v                 NUMERIC(10,3),
    l2i                 NUMERIC(10,3),
    l3v                 NUMERIC(10,3),
    l3i                 NUMERIC(10,3),

    isum                NUMERIC(10,3),
    in_neutro           NUMERIC(10,3),   -- In
    id_dif              NUMERIC(10,3),   -- Id (corriente diferencial, asunción)

    psigned             NUMERIC(14,3),
    l1p                 NUMERIC(14,3),
    l2p                 NUMERIC(14,3),
    l3p                 NUMERIC(14,3),

    qsigned             NUMERIC(14,3),
    l1q                 NUMERIC(14,3),
    l2q                 NUMERIC(14,3),
    l3q                 NUMERIC(14,3),

    pf                  NUMERIC(6,3),
    l1pf                NUMERIC(6,3),
    l2pf                NUMERIC(6,3),
    l3pf                NUMERIC(6,3),

    phase_seq           VARCHAR(20),     -- sin confirmar formato, vacío en el ejemplo

    l1v_ang             NUMERIC(8,3),
    l2v_ang             NUMERIC(8,3),
    l3v_ang             NUMERIC(8,3),
    l1i_ang             NUMERIC(8,3),
    l2i_ang             NUMERIC(8,3),
    l3i_ang             NUMERIC(8,3),
    in_ang              NUMERIC(8,3),
    id_ang              NUMERIC(8,3),

    -- Deduplicación atómica: un mismo contador + instante no debería
    -- repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_s29_cnt_fecha_hora UNIQUE (cnt_id, fecha, hora)
);

CREATE INDEX IF NOT EXISTS idx_t_s29_nombre_fichero ON :schema.t_s29(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s29_cnt_id          ON :schema.t_s29(cnt_id);
CREATE INDEX IF NOT EXISTS idx_t_s29_fecha           ON :schema.t_s29(fecha);

CREATE TABLE IF NOT EXISTS :schema.t_s29_error (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,
    cnc_id              VARCHAR(50) NOT NULL,
    cnt_id              VARCHAR(50) NOT NULL,
    err_cat             INTEGER,
    err_code            INTEGER,
    fecha_procesado     TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT uq_t_s29_error_fichero_cnt UNIQUE (nombre_fichero, cnt_id)
);

CREATE INDEX IF NOT EXISTS idx_t_s29_error_nombre_fichero ON :schema.t_s29_error(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s29_error_cnt_id         ON :schema.t_s29_error(cnt_id);
