import { Pool } from 'pg';
import { FileRepository, ProcessResult } from '../../core/types';
import { validateSqlIdentifier } from '../../core/sqlIdentifier';
import { S67File } from './s67.types';

interface FicheroContext {
  rawFileName: string;
  cncId: string;
  fecha: string;
  hora: string;
}

/**
 * Repository de S67. Jerarquía Report > Rtu > S67 (sin LVSLine), un
 * único INSERT masivo (t_s67), sin tabla de error. El esquema se
 * recibe como parámetro explícito.
 */
export class S67Repository implements FileRepository<S67File> {
  async insert(
    pool: Pool,
    fileNameInfo: FicheroContext,
    schema: string,
    data: S67File
  ): Promise<ProcessResult> {
    const safeSchema = validateSqlIdentifier(schema);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const nombreFichero: string[] = [];
      const rtuId: string[] = [];
      const fecha: string[] = [];
      const hora: string[] = [];
      const ms: string[] = [];
      const flagHorario: (string | null)[] = [];
      const fhRaw: string[] = [];
      const et: number[] = [];
      const c: number[] = [];
      const d1Raw: (string | null)[] = [];
      const d2Raw: (string | null)[] = [];

      for (const rtu of data.rtus) {
        for (const evento of rtu.eventos) {
          nombreFichero.push(fileNameInfo.rawFileName);
          rtuId.push(rtu.rtuId);
          fecha.push(evento.fecha);
          hora.push(evento.hora);
          ms.push(evento.ms);
          flagHorario.push(evento.flagHorario);
          fhRaw.push(evento.fhRaw);
          et.push(evento.et);
          c.push(evento.c);
          d1Raw.push(evento.d1Raw);
          d2Raw.push(evento.d2Raw);
        }
      }

      let filasPrincipales = 0;

      if (nombreFichero.length > 0) {
        const result = await client.query(
          `INSERT INTO ${safeSchema}.t_s67
             (nombre_fichero, rtu_id, fecha, hora, ms, flag_horario, fh_raw, et, c, d1_raw, d2_raw)
           SELECT * FROM UNNEST(
             $1::varchar[], $2::varchar[], $3::date[], $4::time[], $5::char(3)[], $6::char(1)[],
             $7::varchar[], $8::integer[], $9::integer[], $10::varchar[], $11::varchar[]
           )
           ON CONFLICT (rtu_id, fecha, hora, ms, et, c) DO NOTHING`,
          [nombreFichero, rtuId, fecha, hora, ms, flagHorario, fhRaw, et, c, d1Raw, d2Raw]
        );
        filasPrincipales = result.rowCount ?? 0;
      }

      await client.query('COMMIT');

      return {
        tipo: 'S67',
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
