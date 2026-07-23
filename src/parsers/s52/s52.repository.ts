import { Pool } from 'pg';
import { FileRepository, ProcessResult } from '../../core/types';
import { validateSqlIdentifier } from '../../core/sqlIdentifier';
import { S52File } from './s52.types';

interface FicheroContext {
  rawFileName: string;
  cncId: string;
  fecha: string;
  hora: string;
}

/**
 * Repository de S52. Jerarquía Rtu/LVSLine (igual que G56-G59), sin
 * concepto de error observado, así que solo hay un INSERT masivo
 * (t_s52). El esquema se recibe como parámetro explícito.
 */
export class S52Repository implements FileRepository<S52File> {
  async insert(
    pool: Pool,
    fileNameInfo: FicheroContext,
    schema: string,
    data: S52File
  ): Promise<ProcessResult> {
    const safeSchema = validateSqlIdentifier(schema);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const nombreFichero: string[] = [];
      const rtuId: string[] = [];
      const lvslineId: string[] = [];
      const pos: string[] = [];
      const magn: (number | null)[] = [];
      const fecha: string[] = [];
      const hora: string[] = [];
      const flagHorario: (string | null)[] = [];
      const fhRaw: string[] = [];
      const bc: (string | null)[] = [];
      const ai: number[] = [];
      const ae: number[] = [];
      const r1: number[] = [];
      const r2: number[] = [];
      const r3: number[] = [];
      const r4: number[] = [];

      for (const rtu of data.rtus) {
        for (const linea of rtu.lineas) {
          for (const lectura of linea.lecturas) {
            nombreFichero.push(fileNameInfo.rawFileName);
            rtuId.push(rtu.rtuId);
            lvslineId.push(linea.lvslineId);
            pos.push(linea.pos);
            magn.push(linea.magn);
            fecha.push(lectura.fecha);
            hora.push(lectura.hora);
            flagHorario.push(lectura.flagHorario);
            fhRaw.push(lectura.fhRaw);
            bc.push(lectura.bc);
            ai.push(lectura.ai);
            ae.push(lectura.ae);
            r1.push(lectura.r1);
            r2.push(lectura.r2);
            r3.push(lectura.r3);
            r4.push(lectura.r4);
          }
        }
      }

      let filasPrincipales = 0;

      if (nombreFichero.length > 0) {
        const result = await client.query(
          `INSERT INTO ${safeSchema}.t_s52
             (nombre_fichero, rtu_id, lvsline_id, pos, magn, fecha, hora, flag_horario, fh_raw, bc,
              ai, ae, r1, r2, r3, r4)
           SELECT * FROM UNNEST(
             $1::varchar[], $2::varchar[], $3::varchar[], $4::varchar[], $5::integer[], $6::date[],
             $7::time[], $8::char(1)[], $9::varchar[], $10::varchar[],
             $11::numeric[], $12::numeric[], $13::numeric[], $14::numeric[], $15::numeric[], $16::numeric[]
           )
           ON CONFLICT (rtu_id, lvsline_id, fecha, hora) DO NOTHING`,
          [
            nombreFichero, rtuId, lvslineId, pos, magn, fecha,
            hora, flagHorario, fhRaw, bc,
            ai, ae, r1, r2, r3, r4,
          ]
        );
        filasPrincipales = result.rowCount ?? 0;
      }

      await client.query('COMMIT');

      return {
        tipo: 'S52',
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
