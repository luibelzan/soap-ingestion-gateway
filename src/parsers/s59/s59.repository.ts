import { Pool } from 'pg';
import { FileRepository, ProcessResult } from '../../core/types';
import { validateSqlIdentifier } from '../../core/sqlIdentifier';
import { S59File } from './s59.types';

interface FicheroContext {
  rawFileName: string;
  cncId: string;
  fecha: string;
  hora: string;
}

/**
 * Repository de S59. Jerarquía Rtu/LVSLine, un único INSERT masivo
 * (t_s59), sin tabla de error. El esquema se recibe como parámetro
 * explícito.
 */
export class S59Repository implements FileRepository<S59File> {
  async insert(
    pool: Pool,
    fileNameInfo: FicheroContext,
    schema: string,
    data: S59File
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
      const et: number[] = [];
      const c: number[] = [];
      const d1Raw: (string | null)[] = [];
      const fechaD1: (string | null)[] = [];
      const horaD1: (string | null)[] = [];
      const flagHorarioD1: (string | null)[] = [];
      const d2Raw: (string | null)[] = [];

      for (const rtu of data.rtus) {
        for (const linea of rtu.lineas) {
          for (const evento of linea.eventos) {
            nombreFichero.push(fileNameInfo.rawFileName);
            rtuId.push(rtu.rtuId);
            lvslineId.push(linea.lvslineId);
            pos.push(linea.pos);
            fecha.push(evento.fecha);
            hora.push(evento.hora);
            flagHorario.push(evento.flagHorario);
            fhRaw.push(evento.fhRaw);
            et.push(evento.et);
            c.push(evento.c);
            d1Raw.push(evento.d1Raw);
            fechaD1.push(evento.fechaD1);
            horaD1.push(evento.horaD1);
            flagHorarioD1.push(evento.flagHorarioD1);
            d2Raw.push(evento.d2Raw);
          }
        }
      }

      let filasPrincipales = 0;

      if (nombreFichero.length > 0) {
        const result = await client.query(
          `INSERT INTO ${safeSchema}.t_s59
             (nombre_fichero, rtu_id, lvsline_id, pos, fecha, hora, flag_horario, fh_raw, et, c,
              d1_raw, fecha_d1, hora_d1, flag_horario_d1, d2_raw)
           SELECT * FROM UNNEST(
             $1::varchar[], $2::varchar[], $3::varchar[], $4::varchar[], $5::date[], $6::time[],
             $7::char(1)[], $8::varchar[], $9::integer[], $10::integer[],
             $11::varchar[], $12::date[], $13::time[], $14::char(1)[], $15::varchar[]
           )
           ON CONFLICT (lvsline_id, fecha, hora, et, c) DO NOTHING`,
          [
            nombreFichero, rtuId, lvslineId, pos, fecha, hora, flagHorario, fhRaw, et, c,
            d1Raw, fechaD1, horaD1, flagHorarioD1, d2Raw,
          ]
        );
        filasPrincipales = result.rowCount ?? 0;
      }

      await client.query('COMMIT');

      return {
        tipo: 'S59',
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
