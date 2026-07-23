import { Pool } from 'pg';
import { FileRepository, ProcessResult } from '../../core/types';
import { validateSqlIdentifier } from '../../core/sqlIdentifier';
import { S96File } from './s96.types';

interface FicheroContext {
  rawFileName: string;
  cncId: string;
  fecha: string;
  hora: string;
}

/**
 * Repository de S96. Aplana la jerarquía Medida -> Fase -> Armónico en
 * filas individuales (una por armónico), en un único INSERT masivo
 * (t_s96). El esquema se recibe como parámetro explícito.
 */
export class S96Repository implements FileRepository<S96File> {
  async insert(
    pool: Pool,
    fileNameInfo: FicheroContext,
    schema: string,
    data: S96File
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
      const fase: string[] = [];
      const orden: number[] = [];
      const valor: (number | null)[] = [];
      const thd: (number | null)[] = [];
      const bc: (string | null)[] = [];

      for (const rtu of data.rtus) {
        for (const medida of rtu.medidas) {
          for (const f of medida.fases) {
            for (const armonico of f.armonicos) {
              nombreFichero.push(fileNameInfo.rawFileName);
              rtuId.push(rtu.rtuId);
              fecha.push(medida.fecha);
              hora.push(medida.hora);
              flagHorario.push(medida.flagHorario);
              fhRaw.push(medida.fhRaw);
              fase.push(f.fase);
              orden.push(armonico.orden);
              valor.push(armonico.valor);
              thd.push(f.thd);
              bc.push(f.bc);
            }
          }
        }
      }

      let filasPrincipales = 0;

      if (nombreFichero.length > 0) {
        const result = await client.query(
          `INSERT INTO ${safeSchema}.t_s96
             (nombre_fichero, rtu_id, fecha, hora, flag_horario, fh_raw, fase, orden, valor, thd, bc)
           SELECT * FROM UNNEST(
             $1::varchar[], $2::varchar[], $3::date[], $4::time[], $5::char(1)[], $6::varchar[],
             $7::char(1)[], $8::integer[], $9::numeric[], $10::numeric[], $11::varchar[]
           )
           ON CONFLICT (rtu_id, fecha, hora, fase, orden) DO NOTHING`,
          [nombreFichero, rtuId, fecha, hora, flagHorario, fhRaw, fase, orden, valor, thd, bc]
        );
        filasPrincipales = result.rowCount ?? 0;
      }

      await client.query('COMMIT');

      return {
        tipo: 'S96',
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
