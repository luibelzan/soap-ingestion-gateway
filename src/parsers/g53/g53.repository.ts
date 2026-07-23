import { Pool } from 'pg';
import { FileRepository, ProcessResult } from '../../core/types';
import { validateSqlIdentifier } from '../../core/sqlIdentifier';
import { G53File } from './g53.types';

interface FicheroContext {
  rawFileName: string;
  cncId: string;
  fecha: string;
  hora: string;
}

/**
 * Repository de G53. Jerarquía simple Report > Rtu > G53 (sin LVSLine,
 * sin concepto de error observado), un único INSERT masivo (t_g53).
 * El esquema se recibe como parámetro explícito.
 */
export class G53Repository implements FileRepository<G53File> {
  async insert(
    pool: Pool,
    fileNameInfo: FicheroContext,
    schema: string,
    data: G53File
  ): Promise<ProcessResult> {
    const safeSchema = validateSqlIdentifier(schema);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const nombreFichero: string[] = [];
      const rtuId: string[] = [];
      const fecha: string[] = [];
      const hora: string[] = [];
      const flagHorario: (string | null)[] = [];
      const fhRaw: string[] = [];
      const vtnMin: (number | null)[] = [];
      const vtnAvg: (number | null)[] = [];
      const vtnMax: (number | null)[] = [];
      const vtnLsm: (number | null)[] = [];
      const bc: (string | null)[] = [];

      for (const rtu of data.rtus) {
        for (const medida of rtu.medidas) {
          nombreFichero.push(fileNameInfo.rawFileName);
          rtuId.push(rtu.rtuId);
          fecha.push(medida.fecha);
          hora.push(medida.hora);
          flagHorario.push(medida.flagHorario);
          fhRaw.push(medida.fhRaw);
          vtnMin.push(medida.vtnMin);
          vtnAvg.push(medida.vtnAvg);
          vtnMax.push(medida.vtnMax);
          vtnLsm.push(medida.vtnLsm);
          bc.push(medida.bc);
        }
      }

      let filasPrincipales = 0;

      if (nombreFichero.length > 0) {
        const result = await client.query(
          `INSERT INTO ${safeSchema}.t_g53
             (nombre_fichero, rtu_id, fecha, hora, flag_horario, fh_raw,
              vtn_min, vtn_avg, vtn_max, vtn_lsm, bc)
           SELECT * FROM UNNEST(
             $1::varchar[], $2::varchar[], $3::date[], $4::time[], $5::char(1)[], $6::varchar[],
             $7::numeric[], $8::numeric[], $9::numeric[], $10::numeric[], $11::varchar[]
           )
           ON CONFLICT (rtu_id, fecha, hora) DO NOTHING`,
          [nombreFichero, rtuId, fecha, hora, flagHorario, fhRaw, vtnMin, vtnAvg, vtnMax, vtnLsm, bc]
        );
        filasPrincipales = result.rowCount ?? 0;
      }

      await client.query('COMMIT');

      return {
        tipo: 'G53',
        nombreFichero: fileNameInfo.rawFileName,
        filasPrincipales,
        filasError: 0,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
