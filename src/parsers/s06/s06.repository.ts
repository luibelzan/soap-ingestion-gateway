import { Pool, PoolClient } from 'pg';
import { FileRepository, ProcessResult } from '../../core/types';
import { validateSqlIdentifier } from '../../core/sqlIdentifier';
import { S06File } from './s06.types';

interface FicheroContext {
  rawFileName: string;
  cncId: string;
  fecha: string;
  hora: string;
}

/**
 * Repository de S06: mismo patrón que S02/S04/S05/S09/G02. Dos INSERT
 * masivos en total por fichero (t_s06 y t_s06_error), sin tabla de
 * cabecera ni contador intermedio. Deduplicación atómica vía UNIQUE +
 * ON CONFLICT DO NOTHING. El esquema se recibe como parámetro explícito.
 */
export class S06Repository implements FileRepository<S06File> {
  async insert(
    pool: Pool,
    fileNameInfo: FicheroContext,
    schema: string,
    data: S06File
  ): Promise<ProcessResult> {
    const safeSchema = validateSqlIdentifier(schema);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const filasPrincipales = await this.insertSnapshots(client, safeSchema, fileNameInfo, data);
      const filasError = await this.insertErrores(client, safeSchema, fileNameInfo, data);

      await client.query('COMMIT');

      return {
        tipo: 'S06',
        nombreFichero: fileNameInfo.rawFileName,
        filasPrincipales,
        filasError,
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
    data: S06File
  ): Promise<number> {
    const nombreFichero: string[] = [];
    const cncId: string[] = [];
    const cntId: string[] = [];
    const fecha: string[] = [];
    const hora: string[] = [];
    const flagHorario: (string | null)[] = [];
    const fhRaw: string[] = [];
    const ns: (string | null)[] = [];
    const fab: (string | null)[] = [];
    const mod: (string | null)[] = [];
    const af: (number | null)[] = [];
    const te: (string | null)[] = [];
    const vf: (string | null)[] = [];
    const vprime: (string | null)[] = [];
    const pro: (string | null)[] = [];
    const idm: (string | null)[] = [];
    const mac: (string | null)[] = [];
    const tp: (string | null)[] = [];
    const ts: (string | null)[] = [];
    const ip: (string | null)[] = [];
    const isCol: (string | null)[] = [];
    const usag: (number | null)[] = [];
    const uswell: (number | null)[] = [];
    const per: (number | null)[] = [];
    const dctcp: (number | null)[] = [];
    const vr: (number | null)[] = [];
    const ut: (number | null)[] = [];
    const usubt: (number | null)[] = [];
    const usobt: (number | null)[] = [];
    const ucortet: (number | null)[] = [];
    const autMothBill: (string | null)[] = [];
    const scrollDispMode: (string | null)[] = [];
    const scrollDispTime: (number | null)[] = [];

    for (const concentrador of data.concentradores) {
      for (const contador of concentrador.contadores) {
        for (const s of contador.snapshots) {
          nombreFichero.push(fileNameInfo.rawFileName);
          cncId.push(concentrador.cncId);
          cntId.push(contador.cntId);
          fecha.push(s.fecha);
          hora.push(s.hora);
          flagHorario.push(s.flagHorario);
          fhRaw.push(s.fhRaw);
          ns.push(s.ns);
          fab.push(s.fab);
          mod.push(s.mod);
          af.push(s.af);
          te.push(s.te);
          vf.push(s.vf);
          vprime.push(s.vprime);
          pro.push(s.pro);
          idm.push(s.idm);
          mac.push(s.mac);
          tp.push(s.tp);
          ts.push(s.ts);
          ip.push(s.ip);
          isCol.push(s.is);
          usag.push(s.usag);
          uswell.push(s.uswell);
          per.push(s.per);
          dctcp.push(s.dctcp);
          vr.push(s.vr);
          ut.push(s.ut);
          usubt.push(s.usubt);
          usobt.push(s.usobt);
          ucortet.push(s.ucortet);
          autMothBill.push(s.autMothBill);
          scrollDispMode.push(s.scrollDispMode);
          scrollDispTime.push(s.scrollDispTime);
        }
      }
    }

    if (nombreFichero.length === 0) return 0;

    const result = await client.query(
      `INSERT INTO ${schema}.t_s06
         (nombre_fichero, cnc_id, cnt_id, fecha, hora, flag_horario, fh_raw,
          ns, fab, mod, af, te, vf, vprime, pro, idm, mac,
          tp, ts, ip, is_,
          usag, uswell, per, dctcp, vr, ut, usubt, usobt, ucortet,
          autmothbill, scrolldispmode, scrolldisptime)
       SELECT * FROM UNNEST(
         $1::varchar[], $2::varchar[], $3::varchar[], $4::date[], $5::time[], $6::char(1)[], $7::varchar[],
         $8::varchar[], $9::varchar[], $10::varchar[], $11::integer[], $12::varchar[], $13::varchar[],
         $14::varchar[], $15::varchar[], $16::varchar[], $17::varchar[],
         $18::varchar[], $19::varchar[], $20::varchar[], $21::varchar[],
         $22::numeric[], $23::numeric[], $24::integer[], $25::numeric[], $26::numeric[], $27::numeric[],
         $28::numeric[], $29::numeric[], $30::numeric[],
         $31::varchar[], $32::varchar[], $33::integer[]
       )
       ON CONFLICT (cnt_id, fecha, hora) DO NOTHING`,
      [
        nombreFichero, cncId, cntId, fecha, hora, flagHorario, fhRaw,
        ns, fab, mod, af, te, vf, vprime, pro, idm, mac,
        tp, ts, ip, isCol,
        usag, uswell, per, dctcp, vr, ut, usubt, usobt, ucortet,
        autMothBill, scrollDispMode, scrollDispTime,
      ]
    );

    return result.rowCount ?? 0;
  }

  private async insertErrores(
    client: PoolClient,
    schema: string,
    fileNameInfo: FicheroContext,
    data: S06File
  ): Promise<number> {
    const nombreFichero: string[] = [];
    const cncId: string[] = [];
    const cntId: string[] = [];
    const errCat: (number | null)[] = [];
    const errCode: (number | null)[] = [];

    for (const concentrador of data.concentradores) {
      for (const contador of concentrador.contadores) {
        if (contador.errCat !== null || contador.errCode !== null) {
          nombreFichero.push(fileNameInfo.rawFileName);
          cncId.push(concentrador.cncId);
          cntId.push(contador.cntId);
          errCat.push(contador.errCat);
          errCode.push(contador.errCode);
        }
      }
    }

    if (nombreFichero.length === 0) return 0;

    const result = await client.query(
      `INSERT INTO ${schema}.t_s06_error (nombre_fichero, cnc_id, cnt_id, err_cat, err_code)
       SELECT * FROM UNNEST(
         $1::varchar[], $2::varchar[], $3::varchar[], $4::integer[], $5::integer[]
       )
       ON CONFLICT (nombre_fichero, cnt_id) DO NOTHING`,
      [nombreFichero, cncId, cntId, errCat, errCode]
    );

    return result.rowCount ?? 0;
  }
}
