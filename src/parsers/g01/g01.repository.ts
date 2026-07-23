import { Pool, PoolClient } from 'pg';
import { FileRepository, ProcessResult } from '../../core/types';
import { validateSqlIdentifier } from '../../core/sqlIdentifier';
import { G01File } from './g01.types';

interface FicheroContext {
  rawFileName: string;
  cncId: string;
  fecha: string;
  hora: string;
}

/**
 * Repository de G01. A diferencia de S02/S04/S05/S09, aquí NO hay nivel
 * Cnt, por lo que solo existe un INSERT masivo (t_g01), sin tabla de
 * error asociada. filasError siempre será 0 para este tipo.
 */
export class G01Repository implements FileRepository<G01File> {
  async insert(
    pool: Pool,
    fileNameInfo: FicheroContext,
    schema: string,
    data: G01File
  ): Promise<ProcessResult> {
    const safeSchema = validateSqlIdentifier(schema);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const filasPrincipales = await this.insertLecturas(client, safeSchema, fileNameInfo, data);

      await client.query('COMMIT');

      return {
        tipo: 'G01',
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

  private async insertLecturas(
    client: PoolClient,
    schema: string,
    fileNameInfo: FicheroContext,
    data: G01File
  ): Promise<number> {
    const nombreFichero: string[] = [];
    const cncId: string[] = [];
    const fecha: string[] = [];
    const hora: string[] = [];
    const flagHorario: (string | null)[] = [];
    const fhRaw: string[] = [];
    const amed: number[] = [];
    const amax: number[] = [];
    const tot: number[] = [];
    const aperc: number[] = [];

    for (const concentrador of data.concentradores) {
      for (const lectura of concentrador.lecturas) {
        nombreFichero.push(fileNameInfo.rawFileName);
        cncId.push(concentrador.cncId);
        fecha.push(lectura.fecha);
        hora.push(lectura.hora);
        flagHorario.push(lectura.flagHorario);
        fhRaw.push(lectura.fhRaw);
        amed.push(lectura.amed);
        amax.push(lectura.amax);
        tot.push(lectura.tot);
        aperc.push(lectura.aperc);
      }
    }

    if (nombreFichero.length === 0) return 0;

    const result = await client.query(
      `INSERT INTO ${schema}.t_g01
         (nombre_fichero, cnc_id, fecha, hora, flag_horario, fh_raw, amed, amax, tot, aperc)
       SELECT * FROM UNNEST(
         $1::varchar[], $2::varchar[], $3::date[], $4::time[], $5::char(1)[], $6::varchar[],
         $7::integer[], $8::integer[], $9::integer[], $10::numeric[]
       )
       ON CONFLICT (cnc_id, fecha, hora) DO NOTHING`,
      [nombreFichero, cncId, fecha, hora, flagHorario, fhRaw, amed, amax, tot, aperc]
    );

    return result.rowCount ?? 0;
  }
}
