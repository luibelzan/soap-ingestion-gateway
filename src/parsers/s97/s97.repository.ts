import { Pool } from 'pg';
import { FileRepository, ProcessResult } from '../../core/types';
import { validateSqlIdentifier } from '../../core/sqlIdentifier';
import { S97File } from './s97.types';

interface FicheroContext {
  rawFileName: string;
  cncId: string;
  fecha: string;
  hora: string;
}

/**
 * Repository de S97. Jerarquía simple Report > Rtu > S97 (sin LVSLine,
 * sin concepto de error observado), un único INSERT masivo (t_s97).
 * El esquema se recibe como parámetro explícito.
 */
export class S97Repository implements FileRepository<S97File> {
  async insert(
    pool: Pool,
    fileNameInfo: FicheroContext,
    schema: string,
    data: S97File
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
      const nr: (number | null)[] = [];
      const ns: (number | null)[] = [];
      const nt: (number | null)[] = [];
      const bc: (string | null)[] = [];

      for (const rtu of data.rtus) {
        for (const medida of rtu.medidas) {
          nombreFichero.push(fileNameInfo.rawFileName);
          rtuId.push(rtu.rtuId);
          fecha.push(medida.fecha);
          hora.push(medida.hora);
          flagHorario.push(medida.flagHorario);
          fhRaw.push(medida.fhRaw);
          nr.push(medida.nr);
          ns.push(medida.ns);
          nt.push(medida.nt);
          bc.push(medida.bc);
        }
      }

      let filasPrincipales = 0;

      if (nombreFichero.length > 0) {
        const result = await client.query(
          `INSERT INTO ${safeSchema}.t_s97
             (nombre_fichero, rtu_id, fecha, hora, flag_horario, fh_raw, nr, ns, nt, bc)
           SELECT * FROM UNNEST(
             $1::varchar[], $2::varchar[], $3::date[], $4::time[], $5::char(1)[], $6::varchar[],
             $7::integer[], $8::integer[], $9::integer[], $10::varchar[]
           )
           ON CONFLICT (rtu_id, fecha, hora) DO NOTHING`,
          [nombreFichero, rtuId, fecha, hora, flagHorario, fhRaw, nr, ns, nt, bc]
        );
        filasPrincipales = result.rowCount ?? 0;
      }

      await client.query('COMMIT');

      return {
        tipo: 'S97',
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
