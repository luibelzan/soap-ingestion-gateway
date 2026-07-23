import { Pool, PoolClient } from 'pg';
import { FileRepository, ProcessResult } from '../../core/types';
import { validateSqlIdentifier } from '../../core/sqlIdentifier';
import { S62File } from './s62.types';

interface FicheroContext {
  rawFileName: string;
  cncId: string;
  fecha: string;
  hora: string;
}

/**
 * Repository de S62: dos INSERT masivos en total por fichero (t_s62 y
 * t_s62_tarea). Sin tabla de error (no hay nivel Cnt en este tipo).
 * El esquema se recibe como parámetro explícito.
 */
export class S62Repository implements FileRepository<S62File> {
  async insert(
    pool: Pool,
    fileNameInfo: FicheroContext,
    schema: string,
    data: S62File
  ): Promise<ProcessResult> {
    const safeSchema = validateSqlIdentifier(schema);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const filasPrincipales = await this.insertSnapshots(client, safeSchema, fileNameInfo, data);
      const filasTareas = await this.insertTareas(client, safeSchema, fileNameInfo, data);

      await client.query('COMMIT');

      return {
        tipo: 'S62',
        nombreFichero: fileNameInfo.rawFileName,
        filasPrincipales,
        filasError: filasTareas, // reutilizamos el campo para reportar las tareas insertadas
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  private async insertSnapshots(
    client: PoolClient,
    schema: string,
    fileNameInfo: FicheroContext,
    data: S62File
  ): Promise<number> {
    const cols = {
      nombreFichero: [] as string[],
      rtuId: [] as string[],
      idAttr: [] as (string | null)[],
      fecha: [] as string[],
      hora: [] as string[],
      flagHorario: [] as (string | null)[],
      fhRaw: [] as string[],
      partNumber: [] as (string | null)[],
      mod: [] as (string | null)[],
      af: [] as (number | null)[],
      te: [] as (string | null)[],
      vf: [] as (string | null)[],
      revConf: [] as (string | null)[],
      fechaConf: [] as (string | null)[],
      horaConf: [] as (string | null)[],
      flagHorarioConf: [] as (string | null)[],
      dateConfRaw: [] as (string | null)[],
      nomInstal: [] as (string | null)[],
      codInstal: [] as (string | null)[],
      serialBaudRate: [] as (number | null)[],
      ipCom: [] as (string | null)[],
      portWs: [] as (number | null)[],
      ipMask: [] as (string | null)[],
      ipGtw: [] as (string | null)[],
      ipDhcp: [] as (string | null)[],
      tRetryDhcp: [] as (number | null)[],
      ipLocal: [] as (string | null)[],
      ipMaskLocal: [] as (string | null)[],
      priority: [] as (string | null)[],
      ipAuth: [] as (string | null)[],
      nRetryAuth: [] as (number | null)[],
      tRetryAuth: [] as (number | null)[],
      ldapCat1: [] as (string | null)[],
      ldapCat2: [] as (string | null)[],
      ldapCat3: [] as (string | null)[],
      ldapCat4: [] as (string | null)[],
      ldapCat5: [] as (string | null)[],
      ldapCat6: [] as (string | null)[],
      ldapCat7: [] as (string | null)[],
      ldapCat8: [] as (string | null)[],
      ipStg: [] as (string | null)[],
      portStg: [] as (number | null)[],
      ipNtp: [] as (string | null)[],
      nRetryNtp: [] as (number | null)[],
      tRetryNtp: [] as (number | null)[],
      timeSincroNtp: [] as (number | null)[],
      tZone: [] as (string | null)[],
      ipFtp: [] as (string | null)[],
      ftpUserReport: [] as (string | null)[],
      ipFtpRtuUpg: [] as (string | null)[],
      userFtpRtuUpg: [] as (string | null)[],
      ipFtpLsvUpg: [] as (string | null)[],
      userFtpLsvUpg: [] as (string | null)[],
      timeOutFtpFwU: [] as (number | null)[],
      timeOutLsFwU: [] as (number | null)[],
      nRetryFtp: [] as (number | null)[],
      tRetryFtp: [] as (number | null)[],
      toutFtp: [] as (number | null)[],
      nRetryWs: [] as (number | null)[],
      tRetryWs: [] as (number | null)[],
      toutWs: [] as (number | null)[],
      timeDev: [] as (number | null)[],
      reportFormat: [] as (number | null)[],
      numLsvCards: [] as (number | null)[],
      timeSendReq: [] as (number | null)[],
      timeDisconLvsCard: [] as (number | null)[],
      nRetryLvsCard: [] as (number | null)[],
      tRetryLvsCard: [] as (number | null)[],
      toutLvsCard: [] as (number | null)[],
      toutHdlcPolling: [] as (number | null)[],
      checkPolling: [] as (number | null)[],
      valuesCheckDelay: [] as (number | null)[],
      maxOrderOutdate: [] as (number | null)[],
      toutRtuConfig: [] as (number | null)[],
      ntpMaxDeviation: [] as (number | null)[],
      accInacTimeout: [] as (number | null)[],
      accSimulMax: [] as (number | null)[],
      ift: [] as (number | null)[],
      tftTAct: [] as (number | null)[],
      hft: [] as (number | null)[],
      tftTDeact: [] as (number | null)[],
      vr: [] as (number | null)[],
      uinT: [] as (number | null)[],
      uinH: [] as (number | null)[],
      udipT: [] as (number | null)[],
      udipH: [] as (number | null)[],
      uoverT: [] as (number | null)[],
      uoverH: [] as (number | null)[],
      overTemp: [] as (number | null)[],
      cfgRtuEvMask1: [] as (string | null)[],
      sptRtuEvMask1: [] as (string | null)[],
      cfgRtuEvMask2: [] as (string | null)[],
      sptRtuEvMask2: [] as (string | null)[],
      cfgRtuEvMask4: [] as (string | null)[],
      sptRtuEvMask4: [] as (string | null)[],
      cfgRtuEvMask5: [] as (string | null)[],
      sptRtuEvMask5: [] as (string | null)[],
      cfgRtuEvMask8: [] as (string | null)[],
      sptRtuEvMask8: [] as (string | null)[],
      cfgRtuEvMask9: [] as (string | null)[],
      sptRtuEvMask9: [] as (string | null)[],
    };

    for (const rtu of data.rtus) {
      for (const s of rtu.snapshots) {
        cols.nombreFichero.push(fileNameInfo.rawFileName);
        cols.rtuId.push(rtu.rtuId);
        cols.idAttr.push(s.idAttr);
        cols.fecha.push(s.fecha);
        cols.hora.push(s.hora);
        cols.flagHorario.push(s.flagHorario);
        cols.fhRaw.push(s.fhRaw);
        cols.partNumber.push(s.partNumber);
        cols.mod.push(s.mod);
        cols.af.push(s.af);
        cols.te.push(s.te);
        cols.vf.push(s.vf);
        cols.revConf.push(s.revConf);
        cols.fechaConf.push(s.fechaConf);
        cols.horaConf.push(s.horaConf);
        cols.flagHorarioConf.push(s.flagHorarioConf);
        cols.dateConfRaw.push(s.dateConfRaw);
        cols.nomInstal.push(s.nomInstal);
        cols.codInstal.push(s.codInstal);
        cols.serialBaudRate.push(s.serialBaudRate);
        cols.ipCom.push(s.ipCom);
        cols.portWs.push(s.portWs);
        cols.ipMask.push(s.ipMask);
        cols.ipGtw.push(s.ipGtw);
        cols.ipDhcp.push(s.ipDhcp);
        cols.tRetryDhcp.push(s.tRetryDhcp);
        cols.ipLocal.push(s.ipLocal);
        cols.ipMaskLocal.push(s.ipMaskLocal);
        cols.priority.push(s.priority);
        cols.ipAuth.push(s.ipAuth);
        cols.nRetryAuth.push(s.nRetryAuth);
        cols.tRetryAuth.push(s.tRetryAuth);
        cols.ldapCat1.push(s.ldapCat1);
        cols.ldapCat2.push(s.ldapCat2);
        cols.ldapCat3.push(s.ldapCat3);
        cols.ldapCat4.push(s.ldapCat4);
        cols.ldapCat5.push(s.ldapCat5);
        cols.ldapCat6.push(s.ldapCat6);
        cols.ldapCat7.push(s.ldapCat7);
        cols.ldapCat8.push(s.ldapCat8);
        cols.ipStg.push(s.ipStg);
        cols.portStg.push(s.portStg);
        cols.ipNtp.push(s.ipNtp);
        cols.nRetryNtp.push(s.nRetryNtp);
        cols.tRetryNtp.push(s.tRetryNtp);
        cols.timeSincroNtp.push(s.timeSincroNtp);
        cols.tZone.push(s.tZone);
        cols.ipFtp.push(s.ipFtp);
        cols.ftpUserReport.push(s.ftpUserReport);
        cols.ipFtpRtuUpg.push(s.ipFtpRtuUpg);
        cols.userFtpRtuUpg.push(s.userFtpRtuUpg);
        cols.ipFtpLsvUpg.push(s.ipFtpLsvUpg);
        cols.userFtpLsvUpg.push(s.userFtpLsvUpg);
        cols.timeOutFtpFwU.push(s.timeOutFtpFwU);
        cols.timeOutLsFwU.push(s.timeOutLsFwU);
        cols.nRetryFtp.push(s.nRetryFtp);
        cols.tRetryFtp.push(s.tRetryFtp);
        cols.toutFtp.push(s.toutFtp);
        cols.nRetryWs.push(s.nRetryWs);
        cols.tRetryWs.push(s.tRetryWs);
        cols.toutWs.push(s.toutWs);
        cols.timeDev.push(s.timeDev);
        cols.reportFormat.push(s.reportFormat);
        cols.numLsvCards.push(s.numLsvCards);
        cols.timeSendReq.push(s.timeSendReq);
        cols.timeDisconLvsCard.push(s.timeDisconLvsCard);
        cols.nRetryLvsCard.push(s.nRetryLvsCard);
        cols.tRetryLvsCard.push(s.tRetryLvsCard);
        cols.toutLvsCard.push(s.toutLvsCard);
        cols.toutHdlcPolling.push(s.toutHdlcPolling);
        cols.checkPolling.push(s.checkPolling);
        cols.valuesCheckDelay.push(s.valuesCheckDelay);
        cols.maxOrderOutdate.push(s.maxOrderOutdate);
        cols.toutRtuConfig.push(s.toutRtuConfig);
        cols.ntpMaxDeviation.push(s.ntpMaxDeviation);
        cols.accInacTimeout.push(s.accInacTimeout);
        cols.accSimulMax.push(s.accSimulMax);
        cols.ift.push(s.ift);
        cols.tftTAct.push(s.tftTAct);
        cols.hft.push(s.hft);
        cols.tftTDeact.push(s.tftTDeact);
        cols.vr.push(s.vr);
        cols.uinT.push(s.uinT);
        cols.uinH.push(s.uinH);
        cols.udipT.push(s.udipT);
        cols.udipH.push(s.udipH);
        cols.uoverT.push(s.uoverT);
        cols.uoverH.push(s.uoverH);
        cols.overTemp.push(s.overTemp);
        cols.cfgRtuEvMask1.push(s.cfgRtuEvMask1);
        cols.sptRtuEvMask1.push(s.sptRtuEvMask1);
        cols.cfgRtuEvMask2.push(s.cfgRtuEvMask2);
        cols.sptRtuEvMask2.push(s.sptRtuEvMask2);
        cols.cfgRtuEvMask4.push(s.cfgRtuEvMask4);
        cols.sptRtuEvMask4.push(s.sptRtuEvMask4);
        cols.cfgRtuEvMask5.push(s.cfgRtuEvMask5);
        cols.sptRtuEvMask5.push(s.sptRtuEvMask5);
        cols.cfgRtuEvMask8.push(s.cfgRtuEvMask8);
        cols.sptRtuEvMask8.push(s.sptRtuEvMask8);
        cols.cfgRtuEvMask9.push(s.cfgRtuEvMask9);
        cols.sptRtuEvMask9.push(s.sptRtuEvMask9);
      }
    }

    if (cols.nombreFichero.length === 0) return 0;

    const result = await client.query(
      `INSERT INTO ${schema}.t_s62
         (nombre_fichero, rtu_id, id_attr, fecha, hora, flag_horario, fh_raw,
          part_number, mod, af, te, vf, rev_conf,
          fecha_conf, hora_conf, flag_horario_conf, date_conf_raw,
          nom_instal, cod_instal, serial_baud_rate,
          ip_com, port_ws, ip_mask, ip_gtw, ip_dhcp, t_retry_dhcp, ip_local, ip_mask_local, priority,
          ip_auth, n_retry_auth, t_retry_auth,
          ldap_cat1, ldap_cat2, ldap_cat3, ldap_cat4, ldap_cat5, ldap_cat6, ldap_cat7, ldap_cat8,
          ip_stg, port_stg, ip_ntp, n_retry_ntp, t_retry_ntp, time_sincro_ntp, t_zone,
          ip_ftp, ftp_user_report, ip_ftp_rtu_upg, user_ftp_rtu_upg, ip_ftp_lsv_upg, user_ftp_lsv_upg,
          time_out_ftp_fw_u, time_out_ls_fw_u, n_retry_ftp, t_retry_ftp, tout_ftp,
          n_retry_ws, t_retry_ws, tout_ws,
          time_dev, report_format, num_lsv_cards, time_send_req, time_discon_lvs_card,
          n_retry_lvs_card, t_retry_lvs_card, tout_lvs_card, tout_hdlc_polling, check_polling,
          values_check_delay, max_order_outdate, tout_rtu_config, ntp_max_deviation,
          acc_inac_timeout, acc_simul_max,
          ift, tft_t_act, hft, tft_t_deact, vr, uin_t, uin_h, udip_t, udip_h, uover_t, uover_h, over_temp,
          cfg_rtu_ev_mask1, spt_rtu_ev_mask1, cfg_rtu_ev_mask2, spt_rtu_ev_mask2,
          cfg_rtu_ev_mask4, spt_rtu_ev_mask4, cfg_rtu_ev_mask5, spt_rtu_ev_mask5,
          cfg_rtu_ev_mask8, spt_rtu_ev_mask8, cfg_rtu_ev_mask9, spt_rtu_ev_mask9)
       SELECT * FROM UNNEST(
         $1::varchar[], $2::varchar[], $3::varchar[], $4::date[], $5::time[], $6::char(1)[], $7::varchar[],
         $8::varchar[], $9::varchar[], $10::integer[], $11::varchar[], $12::varchar[], $13::varchar[],
         $14::date[], $15::time[], $16::char(1)[], $17::varchar[],
         $18::varchar[], $19::varchar[], $20::integer[],
         $21::varchar[], $22::integer[], $23::varchar[], $24::varchar[], $25::varchar[], $26::integer[], $27::varchar[], $28::varchar[], $29::varchar[],
         $30::varchar[], $31::integer[], $32::integer[],
         $33::varchar[], $34::varchar[], $35::varchar[], $36::varchar[], $37::varchar[], $38::varchar[], $39::varchar[], $40::varchar[],
         $41::varchar[], $42::integer[], $43::varchar[], $44::integer[], $45::integer[], $46::integer[], $47::varchar[],
         $48::varchar[], $49::varchar[], $50::varchar[], $51::varchar[], $52::varchar[], $53::varchar[],
         $54::integer[], $55::integer[], $56::integer[], $57::integer[], $58::integer[],
         $59::integer[], $60::integer[], $61::integer[],
         $62::integer[], $63::integer[], $64::integer[], $65::integer[], $66::integer[],
         $67::integer[], $68::integer[], $69::integer[], $70::integer[], $71::integer[],
         $72::integer[], $73::integer[], $74::integer[], $75::integer[],
         $76::integer[], $77::integer[],
         $78::numeric[], $79::integer[], $80::integer[], $81::integer[], $82::numeric[], $83::integer[], $84::integer[], $85::integer[], $86::integer[], $87::integer[], $88::integer[], $89::integer[],
         $90::text[], $91::text[], $92::text[], $93::text[],
         $94::text[], $95::text[], $96::text[], $97::text[],
         $98::text[], $99::text[], $100::text[], $101::text[]
       )
       ON CONFLICT (rtu_id, fecha, hora) DO NOTHING`,
      [
        cols.nombreFichero, cols.rtuId, cols.idAttr, cols.fecha, cols.hora, cols.flagHorario, cols.fhRaw,
        cols.partNumber, cols.mod, cols.af, cols.te, cols.vf, cols.revConf,
        cols.fechaConf, cols.horaConf, cols.flagHorarioConf, cols.dateConfRaw,
        cols.nomInstal, cols.codInstal, cols.serialBaudRate,
        cols.ipCom, cols.portWs, cols.ipMask, cols.ipGtw, cols.ipDhcp, cols.tRetryDhcp, cols.ipLocal, cols.ipMaskLocal, cols.priority,
        cols.ipAuth, cols.nRetryAuth, cols.tRetryAuth,
        cols.ldapCat1, cols.ldapCat2, cols.ldapCat3, cols.ldapCat4, cols.ldapCat5, cols.ldapCat6, cols.ldapCat7, cols.ldapCat8,
        cols.ipStg, cols.portStg, cols.ipNtp, cols.nRetryNtp, cols.tRetryNtp, cols.timeSincroNtp, cols.tZone,
        cols.ipFtp, cols.ftpUserReport, cols.ipFtpRtuUpg, cols.userFtpRtuUpg, cols.ipFtpLsvUpg, cols.userFtpLsvUpg,
        cols.timeOutFtpFwU, cols.timeOutLsFwU, cols.nRetryFtp, cols.tRetryFtp, cols.toutFtp,
        cols.nRetryWs, cols.tRetryWs, cols.toutWs,
        cols.timeDev, cols.reportFormat, cols.numLsvCards, cols.timeSendReq, cols.timeDisconLvsCard,
        cols.nRetryLvsCard, cols.tRetryLvsCard, cols.toutLvsCard, cols.toutHdlcPolling, cols.checkPolling,
        cols.valuesCheckDelay, cols.maxOrderOutdate, cols.toutRtuConfig, cols.ntpMaxDeviation,
        cols.accInacTimeout, cols.accSimulMax,
        cols.ift, cols.tftTAct, cols.hft, cols.tftTDeact, cols.vr, cols.uinT, cols.uinH, cols.udipT, cols.udipH, cols.uoverT, cols.uoverH, cols.overTemp,
        cols.cfgRtuEvMask1, cols.sptRtuEvMask1, cols.cfgRtuEvMask2, cols.sptRtuEvMask2,
        cols.cfgRtuEvMask4, cols.sptRtuEvMask4, cols.cfgRtuEvMask5, cols.sptRtuEvMask5,
        cols.cfgRtuEvMask8, cols.sptRtuEvMask8, cols.cfgRtuEvMask9, cols.sptRtuEvMask9,
      ]
    );

    return result.rowCount ?? 0;
  }

  private async insertTareas(
    client: PoolClient,
    schema: string,
    fileNameInfo: FicheroContext,
    data: S62File
  ): Promise<number> {
    const nombreFichero: string[] = [];
    const rtuId: string[] = [];
    const fecha: string[] = [];
    const hora: string[] = [];
    const tpTar: number[] = [];
    const tpHiFecha: (string | null)[] = [];
    const tpHiHora: (string | null)[] = [];
    const tpHiFlagHorario: (string | null)[] = [];
    const tpHiRaw: (string | null)[] = [];
    const tpPerRaw: (string | null)[] = [];
    const tpCompl: (string | null)[] = [];
    const tpLvscard: (string | null)[] = [];
    const tpPrio: (number | null)[] = [];
    const tpReq: string[] = [];
    const tpSend: (string | null)[] = [];
    const tpStore: (string | null)[] = [];

    for (const rtu of data.rtus) {
      for (const s of rtu.snapshots) {
        for (const t of s.tareas) {
          nombreFichero.push(fileNameInfo.rawFileName);
          rtuId.push(rtu.rtuId);
          fecha.push(s.fecha);
          hora.push(s.hora);
          tpTar.push(t.tpTar);
          tpHiFecha.push(t.tpHiFecha);
          tpHiHora.push(t.tpHiHora);
          tpHiFlagHorario.push(t.tpHiFlagHorario);
          tpHiRaw.push(t.tpHiRaw);
          tpPerRaw.push(t.tpPerRaw);
          tpCompl.push(t.tpCompl);
          tpLvscard.push(t.tpLvscard);
          tpPrio.push(t.tpPrio);
          tpReq.push(t.tpReq);
          tpSend.push(t.tpSend);
          tpStore.push(t.tpStore);
        }
      }
    }

    if (nombreFichero.length === 0) return 0;

    const result = await client.query(
      `INSERT INTO ${schema}.t_s62_tarea
         (nombre_fichero, rtu_id, fecha, hora, tp_tar,
          tp_hi_fecha, tp_hi_hora, tp_hi_flag_horario, tp_hi_raw,
          tp_per_raw, tp_compl, tp_lvscard, tp_prio, tp_req, tp_send, tp_store)
       SELECT * FROM UNNEST(
         $1::varchar[], $2::varchar[], $3::date[], $4::time[], $5::integer[],
         $6::date[], $7::time[], $8::char(1)[], $9::varchar[],
         $10::varchar[], $11::varchar[], $12::varchar[], $13::integer[], $14::varchar[], $15::varchar[], $16::varchar[]
       )
       ON CONFLICT (rtu_id, fecha, hora, tp_tar, tp_req) DO NOTHING`,
      [
        nombreFichero, rtuId, fecha, hora, tpTar,
        tpHiFecha, tpHiHora, tpHiFlagHorario, tpHiRaw,
        tpPerRaw, tpCompl, tpLvscard, tpPrio, tpReq, tpSend, tpStore,
      ]
    );

    return result.rowCount ?? 0;
  }
}
