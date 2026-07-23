import { Pool } from 'pg';
import { FileRepository, ProcessResult } from '../../core/types';
import { validateSqlIdentifier } from '../../core/sqlIdentifier';
import { S98File } from './s98.types';

interface FicheroContext {
  rawFileName: string;
  cncId: string;
  fecha: string;
  hora: string;
}

/**
 * Repository de S98. Jerarquía simple Report > Rtu > S98 (sin LVSLine,
 * sin concepto de error observado), un único INSERT masivo (t_s98).
 * El esquema se recibe como parámetro explícito.
 */
export class S98Repository implements FileRepository<S98File> {
  async insert(
    pool: Pool,
    fileNameInfo: FicheroContext,
    schema: string,
    data: S98File
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
      const ift1: (number | null)[] = [];
      const ift2: (number | null)[] = [];
      const ift3: (number | null)[] = [];
      const bc: (string | null)[] = [];

      for (const rtu of data.rtus) {
        for (const medida of rtu.medidas) {
          nombreFichero.push(fileNameInfo.rawFileName);
          rtuId.push(rtu.rtuId);
          fecha.push(medida.fecha);
          hora.push(medida.hora);
          flagHorario.push(medida.flagHorario);
          fhRaw.push(medida.fhRaw);
          ift1.push(medida.ift1);
          ift2.push(medida.ift2);
          ift3.push(medida.ift3);
          bc.push(medida.bc);
        }
      }

      let filasPrincipales = 0;

      if (nombreFichero.length > 0) {
        const result = await client.query(
          `INSERT INTO ${safeSchema}.t_s98
             (nombre_fichero, rtu_id, fecha, hora, flag_horario, fh_raw, ift1, ift2, ift3, bc)
           SELECT * FROM UNNEST(
             $1::varchar[], $2::varchar[], $3::date[], $4::time[], $5::char(1)[], $6::varchar[],
             $7::numeric[], $8::numeric[], $9::numeric[], $10::varchar[]
           )
           ON CONFLICT (rtu_id, fecha, hora) DO NOTHING`,
          [nombreFichero, rtuId, fecha, hora, flagHorario, fhRaw, ift1, ift2, ift3, bc]
        );
        filasPrincipales = result.rowCount ?? 0;
      }

      await client.query('COMMIT');

      return {
        tipo: 'S98',
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
