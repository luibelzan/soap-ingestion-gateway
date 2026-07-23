-- =============================================================
-- Esquema para el tipo de fichero S62
-- (snapshot de configuración del RTU + tareas programadas)
-- =============================================================
-- Jerarquía del XML:  Report > Rtu > S62 > TP* > TpPro
--   Equivalente a S12 pero para el RTU en vez del concentrador (Cnc).
--   TpPro aquí es autocontenido (sin TpAttr, a diferencia de S12).
--
-- NOTA sobre supuestos pendientes de confirmar (ver README):
--   - La inmensa mayoría de los ~90 atributos son de configuración de
--     red/FTP/NTP/timeouts/umbrales cuyo significado exacto no está
--     documentado; se guardan tal cual, tipados de forma conservadora.
--   - S62/@Id duplica Rtu/@Id (el mismo valor). Se guarda de todas
--     formas como "id_attr" por fidelidad, aunque en la práctica es
--     redundante con rtu_id.
--   - dateConf: SÍ tiene el formato completo de Fh (con letra final,
--     aquí "W"), a diferencia de TpPer que de nuevo carece de ella.
--   - Las máscaras CfgRTUEvMask*/SptRTUEvMask* son cadenas hexadecimales
--     largas, se guardan como TEXT sin decodificar.
--   - Sin nivel Cnt, así que no hay tabla de error.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_s62 (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,  -- informativo, no es FK
    rtu_id              VARCHAR(50) NOT NULL,   -- Rtu/@Id
    id_attr             VARCHAR(50),             -- S62/@Id (duplica Rtu/@Id)

    fecha               DATE NOT NULL,           -- de Fh
    hora                TIME NOT NULL,
    flag_horario        CHAR(1),
    fh_raw              VARCHAR(20) NOT NULL,

    part_number         VARCHAR(100),
    mod                 VARCHAR(100),
    af                  INTEGER,
    te                  VARCHAR(50),
    vf                  VARCHAR(50),
    rev_conf            VARCHAR(50),

    fecha_conf          DATE,                    -- de dateConf (formato Fh completo)
    hora_conf           TIME,
    flag_horario_conf   CHAR(1),
    date_conf_raw       VARCHAR(20),

    nom_instal          VARCHAR(200),
    cod_instal          VARCHAR(100),
    serial_baud_rate    INTEGER,

    ip_com              VARCHAR(50),
    port_ws             INTEGER,
    ip_mask             VARCHAR(50),
    ip_gtw              VARCHAR(50),
    ip_dhcp             VARCHAR(5),
    t_retry_dhcp        INTEGER,
    ip_local            VARCHAR(50),
    ip_mask_local       VARCHAR(50),
    priority            VARCHAR(5),

    ip_auth             VARCHAR(100),
    n_retry_auth        INTEGER,
    t_retry_auth        INTEGER,

    ldap_cat1           VARCHAR(100),
    ldap_cat2           VARCHAR(100),
    ldap_cat3           VARCHAR(100),
    ldap_cat4           VARCHAR(100),
    ldap_cat5           VARCHAR(100),
    ldap_cat6           VARCHAR(100),
    ldap_cat7           VARCHAR(100),
    ldap_cat8           VARCHAR(100),

    ip_stg              VARCHAR(100),
    port_stg            INTEGER,
    ip_ntp              VARCHAR(100),
    n_retry_ntp         INTEGER,
    t_retry_ntp         INTEGER,
    time_sincro_ntp     INTEGER,
    t_zone              VARCHAR(50),

    ip_ftp              VARCHAR(100),
    ftp_user_report     VARCHAR(100),
    ip_ftp_rtu_upg      VARCHAR(100),
    user_ftp_rtu_upg    VARCHAR(100),
    ip_ftp_lsv_upg      VARCHAR(100),
    user_ftp_lsv_upg    VARCHAR(100),
    time_out_ftp_fw_u   INTEGER,
    time_out_ls_fw_u    INTEGER,
    n_retry_ftp         INTEGER,
    t_retry_ftp         INTEGER,
    tout_ftp            INTEGER,
    n_retry_ws          INTEGER,
    t_retry_ws          INTEGER,
    tout_ws             INTEGER,

    time_dev            INTEGER,
    report_format       INTEGER,
    num_lsv_cards       INTEGER,
    time_send_req       INTEGER,
    time_discon_lvs_card INTEGER,
    n_retry_lvs_card    INTEGER,
    t_retry_lvs_card    INTEGER,
    tout_lvs_card       INTEGER,
    tout_hdlc_polling   INTEGER,
    check_polling       INTEGER,
    values_check_delay  INTEGER,
    max_order_outdate   INTEGER,
    tout_rtu_config     INTEGER,
    ntp_max_deviation   INTEGER,
    acc_inac_timeout    INTEGER,
    acc_simul_max       INTEGER,

    ift                 NUMERIC(10,3),
    tft_t_act           INTEGER,
    hft                 INTEGER,
    tft_t_deact         INTEGER,
    vr                  NUMERIC(10,3),
    uin_t               INTEGER,
    uin_h               INTEGER,
    udip_t              INTEGER,
    udip_h              INTEGER,
    uover_t             INTEGER,
    uover_h             INTEGER,
    over_temp           INTEGER,

    cfg_rtu_ev_mask1    TEXT,
    spt_rtu_ev_mask1    TEXT,
    cfg_rtu_ev_mask2    TEXT,
    spt_rtu_ev_mask2    TEXT,
    cfg_rtu_ev_mask4    TEXT,
    spt_rtu_ev_mask4    TEXT,
    cfg_rtu_ev_mask5    TEXT,
    spt_rtu_ev_mask5    TEXT,
    cfg_rtu_ev_mask8    TEXT,
    spt_rtu_ev_mask8    TEXT,
    cfg_rtu_ev_mask9    TEXT,
    spt_rtu_ev_mask9    TEXT,

    -- Deduplicación atómica: un mismo RTU + instante no debería
    -- repetirse si el fichero se reprocesa
    CONSTRAINT uq_t_s62_rtu_fecha_hora UNIQUE (rtu_id, fecha, hora)
);

CREATE INDEX IF NOT EXISTS idx_t_s62_nombre_fichero ON :schema.t_s62(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s62_rtu_id          ON :schema.t_s62(rtu_id);
CREATE INDEX IF NOT EXISTS idx_t_s62_fecha           ON :schema.t_s62(fecha);

-- Una fila por tarea programada (TP) + informe solicitado (TpPro),
-- igual patrón que t_s12_tarea.
CREATE TABLE IF NOT EXISTS :schema.t_s62_tarea (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,
    rtu_id              VARCHAR(50) NOT NULL,
    fecha               DATE NOT NULL,           -- fecha/hora del S62 padre (Fh)
    hora                TIME NOT NULL,

    tp_tar              INTEGER NOT NULL,

    tp_hi_fecha         DATE,
    tp_hi_hora          TIME,
    tp_hi_flag_horario  CHAR(1),
    tp_hi_raw           VARCHAR(20),

    tp_per_raw          VARCHAR(20),
    tp_compl            VARCHAR(5),
    tp_lvscard          VARCHAR(50),             -- TP/@TpLVSCard, vacío en los ejemplos vistos
    tp_prio             INTEGER,

    tp_req              VARCHAR(20) NOT NULL,
    tp_send             VARCHAR(5),
    tp_store            VARCHAR(5),

    CONSTRAINT uq_t_s62_tarea_rtu_fecha_hora_tar_req
        UNIQUE (rtu_id, fecha, hora, tp_tar, tp_req)
);

CREATE INDEX IF NOT EXISTS idx_t_s62_tarea_nombre_fichero ON :schema.t_s62_tarea(nombre_fichero);
CREATE INDEX IF NOT EXISTS idx_t_s62_tarea_rtu_id          ON :schema.t_s62_tarea(rtu_id);
CREATE INDEX IF NOT EXISTS idx_t_s62_tarea_tp_req          ON :schema.t_s62_tarea(tp_req);
