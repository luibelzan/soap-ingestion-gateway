-- =============================================================
-- Esquema para el tipo de fichero S12
-- (snapshot de configuración del concentrador + tareas programadas)
-- =============================================================
-- Jerarquía del XML:  Report > Cnc > S12 > TP* > TpPro > TpAttr
--   S12 es, como S06 para el contador, una FOTO de la configuración
--   del concentrador (red, FTP, NTP, timeouts...), no una serie de
--   medidas. Además trae una lista de tareas programadas (TP): qué
--   tipos de informe (S02, S04, S05...) genera el concentrador y con
--   qué periodicidad. TpAttr aparece siempre vacío en los ejemplos
--   vistos, así que no se modela (no hay datos que extraer de él).
--
-- NOTA sobre supuestos pendientes de confirmar (ver README):
--   - La inmensa mayoría de los ~50 atributos de S12 son de
--     configuración de red/FTP/NTP/timeouts cuyo significado exacto
--     no está documentado; se guardan tal cual, tipados de forma
--     conservadora (texto salvo que el valor sea claramente numérico).
--   - TpPer: formato de 14 dígitos SIN la letra final que sí tiene Fh
--     (p.ej. "00000100000000"). No encaja con el formato de Fh, así
--     que se guarda como texto crudo sin interpretar como fecha-hora.
--     Probablemente codifica una duración/periodicidad (días-horas-
--     minutos-segundos o similar), sin confirmar.
--   - No hay nivel Cnt en S12 (es configuración de concentrador, no de
--     contador), así que no aplica una tabla de error por contador.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_s12 (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,  -- informativo, no es FK
    cnc_id              VARCHAR(50) NOT NULL,   -- Cnc/@Id

    fecha               DATE NOT NULL,           -- de Fh
    hora                TIME NOT NULL,
    flag_horario        CHAR(1),
    fh_raw              VARCHAR(20) NOT NULL,

    mod                 VARCHAR(100),    -- modelo
    af                  INTEGER,         -- año de fabricación
    te                  VARCHAR(50),     -- tipo de equipo
    vf                  VARCHAR(50),     -- versión firmware
    vf_comm             VARCHAR(50),     -- VfComm
    pro                 VARCHAR(50),     -- protocolo
    com                 VARCHAR(50),     -- tipo de comunicación (p.ej. PLC)
    bat                 INTEGER,         -- nivel de batería (%)

    ip_com              VARCHAR(50),
    port_ws             INTEGER,
    ip_mask             VARCHAR(50),
    ip_gtw              VARCHAR(50),
    ip_dhcp             VARCHAR(5),      -- Y/N
    slave1              VARCHAR(100),
    slave2              VARCHAR(100),
    slave3              VARCHAR(100),
    ip_loc              VARCHAR(50),
    ip_mask_loc         VARCHAR(50),
    mac_plc             VARCHAR(20),
    pse                 INTEGER,         -- velocidad de comunicación (baudios), asunción
    priority            VARCHAR(5),      -- Y/N

    ip_stg              VARCHAR(100),
    ip_ntp              VARCHAR(100),
    ip_ftp              VARCHAR(100),
    ftp_user_report     VARCHAR(100),
    ip_ftp_dc_upg       VARCHAR(100),
    user_ftp_dc_upg     VARCHAR(100),
    ip_ftp_meter_upg    VARCHAR(100),
    user_ftp_meter_upg  VARCHAR(100),
    retry_ftp           INTEGER,
    time_betw_ftp       INTEGER,         -- segundos, asunción
    ip_ftp_cycles       VARCHAR(100),
    user_ftp_cycles     VARCHAR(100),
    dest_dir_cycles     VARCHAR(200),

    sync_meter          VARCHAR(5),      -- Y/N
    time_out_meter_fw_u INTEGER,         -- segundos, asunción
    time_dev_over       INTEGER,
    time_dev            INTEGER,
    reset_msg           VARCHAR(5),      -- Y/N
    num_meters          INTEGER,
    time_send_req       INTEGER,
    time_discon_meter   INTEGER,
    retry_discon_meter  INTEGER,
    time_retry_interval INTEGER,

    meter_reg_data      TEXT,            -- cadena hexadecimal larga, sin interpretar
    report_format       INTEGER,
    s26_content         VARCHAR(200),    -- lista de campos (p.ej. "Pimp,AIa,L1v")
    values_check_delay  INTEGER,
    max_order_outdate   INTEGER,
    time_delay_restart  INTEGER,
    ntp_max_deviation   INTEGER,
    acc_inac_timeout    INTEGER,
    acc_simul_max       INTEGER,

    -- Deduplicación atómica: un mismo concentrador + instante no debería
    -- repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_s12_cnc_fecha_hora UNIQUE (cnc_id, fecha, hora)
);

CREATE INDEX IF NOT EXISTS idx_t_s12_nombre_fichero ON :schema.t_s12(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s12_cnc_id          ON :schema.t_s12(cnc_id);
CREATE INDEX IF NOT EXISTS idx_t_s12_fecha           ON :schema.t_s12(fecha);

-- Una fila por tarea programada (TP) + informe solicitado (TpPro). En
-- los ejemplos vistos cada TP trae exactamente un TpPro; si un TP
-- trajera varios, cada uno genera una fila adicional repitiendo los
-- campos de TP.
CREATE TABLE IF NOT EXISTS :schema.t_s12_tarea (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,
    cnc_id              VARCHAR(50) NOT NULL,
    fecha               DATE NOT NULL,           -- fecha/hora del S12 padre (Fh)
    hora                TIME NOT NULL,

    tp_tar              INTEGER NOT NULL,        -- TP/@TpTar, identificador de tarea

    tp_hi_fecha         DATE,                    -- de TP/@TpHi (formato Fh completo, con letra)
    tp_hi_hora          TIME,
    tp_hi_flag_horario  CHAR(1),
    tp_hi_raw           VARCHAR(20),

    tp_per_raw          VARCHAR(20),             -- TP/@TpPer, sin interpretar (ver nota arriba)
    tp_compl            VARCHAR(5),              -- TP/@TpCompl (Y/N)
    tp_met              VARCHAR(50),             -- TP/@TpMet, vacío en los ejemplos vistos
    tp_prio             INTEGER,                 -- TP/@TpPrio

    tp_req              VARCHAR(20) NOT NULL,     -- TpPro/@TpReq (p.ej. "S04")
    tp_send             VARCHAR(5),              -- TpPro/@TpSend (Y/N)
    tp_store            VARCHAR(5),              -- TpPro/@TpStore (Y/N)

    CONSTRAINT uq_t_s12_tarea_cnc_fecha_hora_tar_req
        UNIQUE (cnc_id, fecha, hora, tp_tar, tp_req)
);

CREATE INDEX IF NOT EXISTS idx_t_s12_tarea_nombre_fichero ON :schema.t_s12_tarea(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s12_tarea_cnc_id          ON :schema.t_s12_tarea(cnc_id);
CREATE INDEX IF NOT EXISTS idx_t_s12_tarea_tp_req          ON :schema.t_s12_tarea(tp_req);
