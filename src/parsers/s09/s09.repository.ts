import { Pool, PoolClient } from 'pg';
import { FileRepository, ProcessResult } from '../../core/types';
import { validateSqlIdentifier } from '../../core/sqlIdentifier';
import { S09File } from './s09.types';

interface FicheroContext {
  rawFileName: string;
  cncId: string;
  fecha: string;
  hora: string;
}

/**
 * Repository de S09: mismo patrón que S02/S04. Dos INSERT masivos en
 * total por fichero (t_s09 y t_s09_error), sin tabla de cabecera ni
 * contador intermedio. Deduplicación atómica vía UNIQUE + ON CONFLICT
 * DO NOTHING. El esquema se recibe como parámetro explícito.
 */
export class S09Repository implements FileRepository<S09File> {
  async insert(
    pool: Pool,
    fileNameInfo: FicheroContext,
    schema: string,
    data: S09File
  ): Promise<ProcessResult> {
    const safeSchema = validateSqlIdentifier(schema);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const filasPrincipales = await this.insertEventos(client, safeSchema, fileNameInfo, data);
      const filasError = await this.insertErrores(client, safeSchema, fileNameInfo, data);

      await client.query('COMMIT');

      return {
        tipo: 'S09',
        nombreFichero: fileNameInfo.rawFileName,
        filasPrincipales,
        filasError,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  private async insertEventos(
    client: PoolClient,
    schema: string,
    fileNameInfo: FicheroContext,
    data: S09File
  ): Promise<number> {
    const nombreFichero: string[] = [];
    const cncId: string[] = [];
    const cntId: string[] = [];
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

    for (const concentrador of data.concentradores) {
      for (const contador of concentrador.contadores) {
        for (const evento of contador.eventos) {
          nombreFichero.push(fileNameInfo.rawFileName);
          cncId.push(concentrador.cncId);
          cntId.push(contador.cntId);
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

    if (nombreFichero.length === 0) return 0;

    const result = await client.query(
      `INSERT INTO ${schema}.t_s09
         (nombre_fichero, cnc_id, cnt_id, fecha, hora, flag_horario, fh_raw, et, c,
          d1_raw, fecha_d1, hora_d1, flag_horario_d1, d2_raw)
       SELECT * FROM UNNEST(
         $1::varchar[], $2::varchar[], $3::varchar[], $4::date[], $5::time[],
         $6::char(1)[], $7::varchar[], $8::integer[], $9::integer[],
         $10::varchar[], $11::date[], $12::time[], $13::char(1)[], $14::varchar[]
       )
       ON CONFLICT (cnt_id, fecha, hora, et, c) DO NOTHING`,
      [
        nombreFichero, cncId, cntId, fecha, hora,
        flagHorario, fhRaw, et, c,
        d1Raw, fechaD1, horaD1, flagHorarioD1, d2Raw,
      ]
    );

    return result.rowCount ?? 0;
  }

  private async insertErrores(
    client: PoolClient,
    schema: string,
    fileNameInfo: FicheroContext,
    data: S09File
  ): Promise<number> {
    const nombreFichero: string[] = [];
    const cncId: string[] = [];
    const cntId: string[] = [];
    const errCat: (number | null)[] = [];
    const errCode: (number | null)[] = [];

    for (const concentrador of data.concentradores) {
      for (const contador of concentrador.contadores) {
        if (contador.errCat !== null || contador.errCode !== null) {
          nombreFichero.push(fileNameInfo.rawFileName);
          cncId.push(concentrador.cncId);
          cntId.push(contador.cntId);
          errCat.push(contador.errCat);
          errCode.push(contador.errCode);
        }
      }
    }

    if (nombreFichero.length === 0) return 0;

    const result = await client.query(
      `INSERT INTO ${schema}.t_s09_error (nombre_fichero, cnc_id, cnt_id, err_cat, err_code)
       SELECT * FROM UNNEST(
         $1::varchar[], $2::varchar[], $3::varchar[], $4::integer[], $5::integer[]
       )
       ON CONFLICT (nombre_fichero, cnt_id) DO NOTHING`,
      [nombreFichero, cncId, cntId, errCat, errCode]
    );

    return result.rowCount ?? 0;
  }
}
