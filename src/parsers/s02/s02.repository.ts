import { Pool, PoolClient } from 'pg';
import { FileRepository, ProcessResult } from '../../core/types';
import { validateSqlIdentifier } from '../../core/sqlIdentifier';
import { S02File } from './s02.types';

interface FicheroContext {
  rawFileName: string;
  cncId: string; // cncId extraído del NOMBRE del fichero (informativo)
  fecha: string; // fecha extraída del NOMBRE del fichero (no usada aquí, disponible por si hace falta)
  hora: string;
}

/**
 * Repository de S02 sin tabla de cabecera de fichero ni tabla intermedia
 * de contador: dos INSERT masivos en total por fichero, uno para las
 * lecturas (t_s02) y otro para los contadores en error (t_s02_error).
 * La deduplicación es atómica vía UNIQUE + ON CONFLICT DO NOTHING.
 *
 * El esquema (schema) de PostgreSQL se recibe como parámetro explícito
 * en vez de depender del search_path de la conexión, para evitar
 * sorpresas si el search_path no está configurado como se espera.
 */
export class S02Repository implements FileRepository<S02File> {
  async insert(
    pool: Pool,
    fileNameInfo: FicheroContext,
    schema: string,
    data: S02File
  ): Promise<ProcessResult> {
    const safeSchema = validateSqlIdentifier(schema);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const filasPrincipales = await this.insertLecturas(client, safeSchema, fileNameInfo, data);
      const filasError = await this.insertErrores(client, safeSchema, fileNameInfo, data);

      await client.query('COMMIT');

      return {
        tipo: 'S02',
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

  private async insertLecturas(
    client: PoolClient,
    schema: string,
    fileNameInfo: FicheroContext,
    data: S02File
  ): Promise<number> {
    const nombreFichero: string[] = [];
    const cncId: string[] = [];
    const cntId: string[] = [];
    const magnitud: (number | null)[] = [];
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

    for (const concentrador of data.concentradores) {
      for (const contador of concentrador.contadores) {
        for (const lectura of contador.lecturas) {
          nombreFichero.push(fileNameInfo.rawFileName);
          cncId.push(concentrador.cncId);
          cntId.push(contador.cntId);
          magnitud.push(contador.magnitud);
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

    if (nombreFichero.length === 0) return 0;

    const result = await client.query(
      `INSERT INTO ${schema}.t_s02
         (nombre_fichero, cnc_id, cnt_id, magnitud, fecha, hora, flag_horario, fh_raw, bc, ai, ae, r1, r2, r3, r4)
       SELECT * FROM UNNEST(
         $1::varchar[], $2::varchar[], $3::varchar[], $4::integer[], $5::date[], $6::time[],
         $7::char(1)[], $8::varchar[], $9::varchar[], $10::numeric[], $11::numeric[],
         $12::numeric[], $13::numeric[], $14::numeric[], $15::numeric[]
       )
       ON CONFLICT (cnt_id, fecha, hora) DO NOTHING`,
      [nombreFichero, cncId, cntId, magnitud, fecha, hora, flagHorario, fhRaw, bc, ai, ae, r1, r2, r3, r4]
    );

    return result.rowCount ?? 0;
  }

  private async insertErrores(
    client: PoolClient,
    schema: string,
    fileNameInfo: FicheroContext,
    data: S02File
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
      `INSERT INTO ${schema}.t_s02_error (nombre_fichero, cnc_id, cnt_id, err_cat, err_code)
       SELECT * FROM UNNEST(
         $1::varchar[], $2::varchar[], $3::varchar[], $4::integer[], $5::integer[]
       )
       ON CONFLICT (nombre_fichero, cnt_id) DO NOTHING`,
      [nombreFichero, cncId, cntId, errCat, errCode]
    );

    return result.rowCount ?? 0;
  }
}
