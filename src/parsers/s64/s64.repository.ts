import { Pool } from 'pg';
import { FileRepository, ProcessResult } from '../../core/types';
import { validateSqlIdentifier } from '../../core/sqlIdentifier';
import { S64File } from './s64.types';

interface FicheroContext {
  rawFileName: string;
  cncId: string;
  fecha: string;
  hora: string;
}

/**
 * Repository de S64. Jerarquía Rtu/LVSLine (igual que S52/S53), sin
 * concepto de error observado, así que solo hay un INSERT masivo
 * (t_s64). El esquema se recibe como parámetro explícito.
 */
export class S64Repository implements FileRepository<S64File> {
  async insert(
    pool: Pool,
    fileNameInfo: FicheroContext,
    schema: string,
    data: S64File
  ): Promise<ProcessResult> {
    const safeSchema = validateSqlIdentifier(schema);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const nombreFichero: string[] = [];
      const rtuId: string[] = [];
      const lvslineId: string[] = [];
      const pos: string[] = [];
      const fecha: string[] = [];
      const hora: string[] = [];
      const flagHorario: (string | null)[] = [];
      const fhRaw: string[] = [];
      const bc: (string | null)[] = [];
      const v1: (number | null)[] = [];
      const v2: (number | null)[] = [];
      const v3: (number | null)[] = [];
      const i1: (number | null)[] = [];
      const i2: (number | null)[] = [];
      const i3: (number | null)[] = [];
      const inNeutro: (number | null)[] = [];
      const simp: (number | null)[] = [];
      const sexp: (number | null)[] = [];

      for (const rtu of data.rtus) {
        for (const linea of rtu.lineas) {
          for (const lectura of linea.lecturas) {
            nombreFichero.push(fileNameInfo.rawFileName);
            rtuId.push(rtu.rtuId);
            lvslineId.push(linea.lvslineId);
            pos.push(linea.pos);
            fecha.push(lectura.fecha);
            hora.push(lectura.hora);
            flagHorario.push(lectura.flagHorario);
            fhRaw.push(lectura.fhRaw);
            bc.push(lectura.bc);
            v1.push(lectura.v1);
            v2.push(lectura.v2);
            v3.push(lectura.v3);
            i1.push(lectura.i1);
            i2.push(lectura.i2);
            i3.push(lectura.i3);
            inNeutro.push(lectura.inNeutro);
            simp.push(lectura.simp);
            sexp.push(lectura.sexp);
          }
        }
      }

      let filasPrincipales = 0;

      if (nombreFichero.length > 0) {
        const result = await client.query(
          `INSERT INTO ${safeSchema}.t_s64
             (nombre_fichero, rtu_id, lvsline_id, pos, fecha, hora, flag_horario, fh_raw, bc,
              v1, v2, v3, i1, i2, i3, in_neutro, simp, sexp)
           SELECT * FROM UNNEST(
             $1::varchar[], $2::varchar[], $3::varchar[], $4::varchar[], $5::date[], $6::time[],
             $7::char(1)[], $8::varchar[], $9::varchar[],
             $10::numeric[], $11::numeric[], $12::numeric[], $13::numeric[], $14::numeric[], $15::numeric[],
             $16::numeric[], $17::numeric[], $18::numeric[]
           )
           ON CONFLICT (lvsline_id, fecha, hora) DO NOTHING`,
          [
            nombreFichero, rtuId, lvslineId, pos, fecha, hora, flagHorario, fhRaw, bc,
            v1, v2, v3, i1, i2, i3, inNeutro, simp, sexp,
          ]
        );
        filasPrincipales = result.rowCount ?? 0;
      }

      await client.query('COMMIT');

      return {
        tipo: 'S64',
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
