import { Pool, PoolClient } from 'pg';
import { FileRepository, ProcessResult } from '../../core/types';
import { validateSqlIdentifier } from '../../core/sqlIdentifier';
import { S12File } from './s12.types';

interface FicheroContext {
  rawFileName: string;
  cncId: string;
  fecha: string;
  hora: string;
}

/**
 * Repository de S12: dos INSERT masivos en total por fichero (t_s12 y
 * t_s12_tarea). Sin tabla de error (no hay nivel Cnt en este tipo).
 * El esquema se recibe como parámetro explícito.
 */
export class S12Repository implements FileRepository<S12File> {
  async insert(
    pool: Pool,
    fileNameInfo: FicheroContext,
    schema: string,
    data: S12File
  ): Promise<ProcessResult> {
    const safeSchema = validateSqlIdentifier(schema);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const filasPrincipales = await this.insertSnapshots(client, safeSchema, fileNameInfo, data);
      const filasTareas = await this.insertTareas(client, safeSchema, fileNameInfo, data);

      await client.query('COMMIT');

      return {
        tipo: 'S12',
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
    data: S12File
  ): Promise<number> {
    const nombreFichero: string[] = [];
    const cncId: string[] = [];
    const fecha: string[] = [];
    const hora: string[] = [];
    const flagHorario: (string | null)[] = [];
    const fhRaw: string[] = [];
    const mod: (string | null)[] = [];
    const af: (number | null)[] = [];
    const te: (string | null)[] = [];
    const vf: (string | null)[] = [];
    const vfComm: (string | null)[] = [];
    const pro: (string | null)[] = [];
    const com: (string | null)[] = [];
    const bat: (number | null)[] = [];
    const ipCom: (string | null)[] = [];
    const portWs: (number | null)[] = [];
    const ipMask: (string | null)[] = [];
    const ipGtw: (string | null)[] = [];
    const ipDhcp: (string | null)[] = [];
    const slave1: (string | null)[] = [];
    const slave2: (string | null)[] = [];
    const slave3: (string | null)[] = [];
    const ipLoc: (string | null)[] = [];
    const ipMaskLoc: (string | null)[] = [];
    const macPlc: (string | null)[] = [];
    const pse: (number | null)[] = [];
    const priority: (string | null)[] = [];
    const ipStg: (string | null)[] = [];
    const ipNtp: (string | null)[] = [];
    const ipFtp: (string | null)[] = [];
    const ftpUserReport: (string | null)[] = [];
    const ipFtpDcUpg: (string | null)[] = [];
    const userFtpDcUpg: (string | null)[] = [];
    const ipFtpMeterUpg: (string | null)[] = [];
    const userFtpMeterUpg: (string | null)[] = [];
    const retryFtp: (number | null)[] = [];
    const timeBetwFtp: (number | null)[] = [];
    const ipFtpCycles: (string | null)[] = [];
    const userFtpCycles: (string | null)[] = [];
    const destDirCycles: (string | null)[] = [];
    const syncMeter: (string | null)[] = [];
    const timeOutMeterFwU: (number | null)[] = [];
    const timeDevOver: (number | null)[] = [];
    const timeDev: (number | null)[] = [];
    const resetMsg: (string | null)[] = [];
    const numMeters: (number | null)[] = [];
    const timeSendReq: (number | null)[] = [];
    const timeDisconMeter: (number | null)[] = [];
    const retryDisconMeter: (number | null)[] = [];
    const timeRetryInterval: (number | null)[] = [];
    const meterRegData: (string | null)[] = [];
    const reportFormat: (number | null)[] = [];
    const s26Content: (string | null)[] = [];
    const valuesCheckDelay: (number | null)[] = [];
    const maxOrderOutdate: (number | null)[] = [];
    const timeDelayRestart: (number | null)[] = [];
    const ntpMaxDeviation: (number | null)[] = [];
    const accInacTimeout: (number | null)[] = [];
    const accSimulMax: (number | null)[] = [];

    for (const cnc of data.concentradores) {
      for (const s of cnc.snapshots) {
        nombreFichero.push(fileNameInfo.rawFileName);
        cncId.push(cnc.cncId);
        fecha.push(s.fecha);
        hora.push(s.hora);
        flagHorario.push(s.flagHorario);
        fhRaw.push(s.fhRaw);
        mod.push(s.mod);
        af.push(s.af);
        te.push(s.te);
        vf.push(s.vf);
        vfComm.push(s.vfComm);
        pro.push(s.pro);
        com.push(s.com);
        bat.push(s.bat);
        ipCom.push(s.ipCom);
        portWs.push(s.portWs);
        ipMask.push(s.ipMask);
        ipGtw.push(s.ipGtw);
        ipDhcp.push(s.ipDhcp);
        slave1.push(s.slave1);
        slave2.push(s.slave2);
        slave3.push(s.slave3);
        ipLoc.push(s.ipLoc);
        ipMaskLoc.push(s.ipMaskLoc);
        macPlc.push(s.macPlc);
        pse.push(s.pse);
        priority.push(s.priority);
        ipStg.push(s.ipStg);
        ipNtp.push(s.ipNtp);
        ipFtp.push(s.ipFtp);
        ftpUserReport.push(s.ftpUserReport);
        ipFtpDcUpg.push(s.ipFtpDcUpg);
        userFtpDcUpg.push(s.userFtpDcUpg);
        ipFtpMeterUpg.push(s.ipFtpMeterUpg);
        userFtpMeterUpg.push(s.userFtpMeterUpg);
        retryFtp.push(s.retryFtp);
        timeBetwFtp.push(s.timeBetwFtp);
        ipFtpCycles.push(s.ipFtpCycles);
        userFtpCycles.push(s.userFtpCycles);
        destDirCycles.push(s.destDirCycles);
        syncMeter.push(s.syncMeter);
        timeOutMeterFwU.push(s.timeOutMeterFwU);
        timeDevOver.push(s.timeDevOver);
        timeDev.push(s.timeDev);
        resetMsg.push(s.resetMsg);
        numMeters.push(s.numMeters);
        timeSendReq.push(s.timeSendReq);
        timeDisconMeter.push(s.timeDisconMeter);
        retryDisconMeter.push(s.retryDisconMeter);
        timeRetryInterval.push(s.timeRetryInterval);
        meterRegData.push(s.meterRegData);
        reportFormat.push(s.reportFormat);
        s26Content.push(s.s26Content);
        valuesCheckDelay.push(s.valuesCheckDelay);
        maxOrderOutdate.push(s.maxOrderOutdate);
        timeDelayRestart.push(s.timeDelayRestart);
        ntpMaxDeviation.push(s.ntpMaxDeviation);
        accInacTimeout.push(s.accInacTimeout);
        accSimulMax.push(s.accSimulMax);
      }
    }

    if (nombreFichero.length === 0) return 0;

    const result = await client.query(
      `INSERT INTO ${schema}.t_s12
         (nombre_fichero, cnc_id, fecha, hora, flag_horario, fh_raw,
          mod, af, te, vf, vf_comm, pro, com, bat,
          ip_com, port_ws, ip_mask, ip_gtw, ip_dhcp, slave1, slave2, slave3,
          ip_loc, ip_mask_loc, mac_plc, pse, priority,
          ip_stg, ip_ntp, ip_ftp, ftp_user_report, ip_ftp_dc_upg, user_ftp_dc_upg,
          ip_ftp_meter_upg, user_ftp_meter_upg, retry_ftp, time_betw_ftp,
          ip_ftp_cycles, user_ftp_cycles, dest_dir_cycles,
          sync_meter, time_out_meter_fw_u, time_dev_over, time_dev, reset_msg,
          num_meters, time_send_req, time_discon_meter, retry_discon_meter, time_retry_interval,
          meter_reg_data, report_format, s26_content, values_check_delay, max_order_outdate,
          time_delay_restart, ntp_max_deviation, acc_inac_timeout, acc_simul_max)
       SELECT * FROM UNNEST(
         $1::varchar[], $2::varchar[], $3::date[], $4::time[], $5::char(1)[], $6::varchar[],
         $7::varchar[], $8::integer[], $9::varchar[], $10::varchar[], $11::varchar[], $12::varchar[], $13::varchar[], $14::integer[],
         $15::varchar[], $16::integer[], $17::varchar[], $18::varchar[], $19::varchar[], $20::varchar[], $21::varchar[], $22::varchar[],
         $23::varchar[], $24::varchar[], $25::varchar[], $26::integer[], $27::varchar[],
         $28::varchar[], $29::varchar[], $30::varchar[], $31::varchar[], $32::varchar[], $33::varchar[],
         $34::varchar[], $35::varchar[], $36::integer[], $37::integer[],
         $38::varchar[], $39::varchar[], $40::varchar[],
         $41::varchar[], $42::integer[], $43::integer[], $44::integer[], $45::varchar[],
         $46::integer[], $47::integer[], $48::integer[], $49::integer[], $50::integer[],
         $51::text[], $52::integer[], $53::varchar[], $54::integer[], $55::integer[],
         $56::integer[], $57::integer[], $58::integer[], $59::integer[]
       )
       ON CONFLICT (cnc_id, fecha, hora) DO NOTHING`,
      [
        nombreFichero, cncId, fecha, hora, flagHorario, fhRaw,
        mod, af, te, vf, vfComm, pro, com, bat,
        ipCom, portWs, ipMask, ipGtw, ipDhcp, slave1, slave2, slave3,
        ipLoc, ipMaskLoc, macPlc, pse, priority,
        ipStg, ipNtp, ipFtp, ftpUserReport, ipFtpDcUpg, userFtpDcUpg,
        ipFtpMeterUpg, userFtpMeterUpg, retryFtp, timeBetwFtp,
        ipFtpCycles, userFtpCycles, destDirCycles,
        syncMeter, timeOutMeterFwU, timeDevOver, timeDev, resetMsg,
        numMeters, timeSendReq, timeDisconMeter, retryDisconMeter, timeRetryInterval,
        meterRegData, reportFormat, s26Content, valuesCheckDelay, maxOrderOutdate,
        timeDelayRestart, ntpMaxDeviation, accInacTimeout, accSimulMax,
      ]
    );

    return result.rowCount ?? 0;
  }

  private async insertTareas(
    client: PoolClient,
    schema: string,
    fileNameInfo: FicheroContext,
    data: S12File
  ): Promise<number> {
    const nombreFichero: string[] = [];
    const cncId: string[] = [];
    const fecha: string[] = [];
    const hora: string[] = [];
    const tpTar: number[] = [];
    const tpHiFecha: (string | null)[] = [];
    const tpHiHora: (string | null)[] = [];
    const tpHiFlagHorario: (string | null)[] = [];
    const tpHiRaw: (string | null)[] = [];
    const tpPerRaw: (string | null)[] = [];
    const tpCompl: (string | null)[] = [];
    const tpMet: (string | null)[] = [];
    const tpPrio: (number | null)[] = [];
    const tpReq: string[] = [];
    const tpSend: (string | null)[] = [];
    const tpStore: (string | null)[] = [];

    for (const cnc of data.concentradores) {
      for (const s of cnc.snapshots) {
        for (const t of s.tareas) {
          nombreFichero.push(fileNameInfo.rawFileName);
          cncId.push(cnc.cncId);
          fecha.push(s.fecha);
          hora.push(s.hora);
          tpTar.push(t.tpTar);
          tpHiFecha.push(t.tpHiFecha);
          tpHiHora.push(t.tpHiHora);
          tpHiFlagHorario.push(t.tpHiFlagHorario);
          tpHiRaw.push(t.tpHiRaw);
          tpPerRaw.push(t.tpPerRaw);
          tpCompl.push(t.tpCompl);
          tpMet.push(t.tpMet);
          tpPrio.push(t.tpPrio);
          tpReq.push(t.tpReq);
          tpSend.push(t.tpSend);
          tpStore.push(t.tpStore);
        }
      }
    }

    if (nombreFichero.length === 0) return 0;

    const result = await client.query(
      `INSERT INTO ${schema}.t_s12_tarea
         (nombre_fichero, cnc_id, fecha, hora, tp_tar,
          tp_hi_fecha, tp_hi_hora, tp_hi_flag_horario, tp_hi_raw,
          tp_per_raw, tp_compl, tp_met, tp_prio, tp_req, tp_send, tp_store)
       SELECT * FROM UNNEST(
         $1::varchar[], $2::varchar[], $3::date[], $4::time[], $5::integer[],
         $6::date[], $7::time[], $8::char(1)[], $9::varchar[],
         $10::varchar[], $11::varchar[], $12::varchar[], $13::integer[], $14::varchar[], $15::varchar[], $16::varchar[]
       )
       ON CONFLICT (cnc_id, fecha, hora, tp_tar, tp_req) DO NOTHING`,
      [
        nombreFichero, cncId, fecha, hora, tpTar,
        tpHiFecha, tpHiHora, tpHiFlagHorario, tpHiRaw,
        tpPerRaw, tpCompl, tpMet, tpPrio, tpReq, tpSend, tpStore,
      ]
    );

    return result.rowCount ?? 0;
  }
}
