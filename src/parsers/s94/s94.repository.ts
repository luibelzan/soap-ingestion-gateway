import { Pool } from 'pg';
import { FileRepository, ProcessResult } from '../../core/types';
import { validateSqlIdentifier } from '../../core/sqlIdentifier';
import { S94File } from './s94.types';

interface FicheroContext {
  rawFileName: string;
  cncId: string;
  fecha: string;
  hora: string;
}

/**
 * Repository de S94. Jerarquía simple Report > Rtu > S94 (sin LVSLine,
 * sin concepto de error observado), un único INSERT masivo (t_s94).
 * El esquema se recibe como parámetro explícito.
 */
export class S94Repository implements FileRepository<S94File> {
  async insert(
    pool: Pool,
    fileNameInfo: FicheroContext,
    schema: string,
    data: S94File
  ): Promise<ProcessResult> {
    const safeSchema = validateSqlIdentifier(schema);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const nombreFichero: string[] = [];
      const rtuId: string[] = [];
      const tp: (number | null)[] = [];
      const fecha: string[] = [];
      const hora: string[] = [];
      const flagHorario: (string | null)[] = [];
      const fhRaw: string[] = [];
      const fr: (number | null)[] = [];
      const fs: (number | null)[] = [];
      const ft: (number | null)[] = [];
      const bc: (string | null)[] = [];

      for (const rtu of data.rtus) {
        for (const medida of rtu.medidas) {
          nombreFichero.push(fileNameInfo.rawFileName);
          rtuId.push(rtu.rtuId);
          tp.push(medida.tp);
          fecha.push(medida.fecha);
          hora.push(medida.hora);
          flagHorario.push(medida.flagHorario);
          fhRaw.push(medida.fhRaw);
          fr.push(medida.fr);
          fs.push(medida.fs);
          ft.push(medida.ft);
          bc.push(medida.bc);
        }
      }

      let filasPrincipales = 0;

      if (nombreFichero.length > 0) {
        const result = await client.query(
          `INSERT INTO ${safeSchema}.t_s94
             (nombre_fichero, rtu_id, tp, fecha, hora, flag_horario, fh_raw, fr, fs, ft, bc)
           SELECT * FROM UNNEST(
             $1::varchar[], $2::varchar[], $3::integer[], $4::date[], $5::time[], $6::char(1)[],
             $7::varchar[], $8::numeric[], $9::numeric[], $10::numeric[], $11::varchar[]
           )
           ON CONFLICT (rtu_id, fecha, hora) DO NOTHING`,
          [nombreFichero, rtuId, tp, fecha, hora, flagHorario, fhRaw, fr, fs, ft, bc]
        );
        filasPrincipales = result.rowCount ?? 0;
      }

      await client.query('COMMIT');

      return {
        tipo: 'S94',
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
