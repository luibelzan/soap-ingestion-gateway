import { Pool, PoolClient } from 'pg';
import { FileRepository, ProcessResult } from '../../core/types';
import { validateSqlIdentifier } from '../../core/sqlIdentifier';
import { S05File } from './s05.types';

interface FicheroContext {
  rawFileName: string;
  cncId: string;
  fecha: string;
  hora: string;
}

/**
 * Repository de S05: mismo patrón que S02/S04/S09. Dos INSERT masivos
 * en total por fichero (t_s05 y t_s05_error), sin tabla de cabecera ni
 * contador intermedio. Deduplicación atómica vía UNIQUE + ON CONFLICT
 * DO NOTHING. El esquema se recibe como parámetro explícito.
 */
export class S05Repository implements FileRepository<S05File> {
  async insert(
    pool: Pool,
    fileNameInfo: FicheroContext,
    schema: string,
    data: S05File
  ): Promise<ProcessResult> {
    const safeSchema = validateSqlIdentifier(schema);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const filasPrincipales = await this.insertPeriodos(client, safeSchema, fileNameInfo, data);
      const filasError = await this.insertErrores(client, safeSchema, fileNameInfo, data);

      await client.query('COMMIT');

      return {
        tipo: 'S05',
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

  private async insertPeriodos(
    client: PoolClient,
    schema: string,
    fileNameInfo: FicheroContext,
    data: S05File
  ): Promise<number> {
    const nombreFichero: string[] = [];
    const cncId: string[] = [];
    const cntId: string[] = [];
    const ctr: (number | null)[] = [];
    const pt: number[] = [];
    const fecha: string[] = [];
    const hora: string[] = [];
    const flagHorario: (string | null)[] = [];
    const fhRaw: string[] = [];
    const aiA: number[] = [];
    const aeA: number[] = [];
    const r1A: number[] = [];
    const r2A: number[] = [];
    const r3A: number[] = [];
    const r4A: number[] = [];

    for (const concentrador of data.concentradores) {
      for (const contador of concentrador.contadores) {
        for (const periodo of contador.periodos) {
          nombreFichero.push(fileNameInfo.rawFileName);
          cncId.push(concentrador.cncId);
          cntId.push(contador.cntId);
          ctr.push(periodo.ctr);
          pt.push(periodo.pt);
          fecha.push(periodo.fecha);
          hora.push(periodo.hora);
          flagHorario.push(periodo.flagHorario);
          fhRaw.push(periodo.fhRaw);
          aiA.push(periodo.aiA);
          aeA.push(periodo.aeA);
          r1A.push(periodo.r1A);
          r2A.push(periodo.r2A);
          r3A.push(periodo.r3A);
          r4A.push(periodo.r4A);
        }
      }
    }

    if (nombreFichero.length === 0) return 0;

    const result = await client.query(
      `INSERT INTO ${schema}.t_s05
         (nombre_fichero, cnc_id, cnt_id, ctr, pt, fecha, hora, flag_horario, fh_raw,
          ai_a, ae_a, r1_a, r2_a, r3_a, r4_a)
       SELECT * FROM UNNEST(
         $1::varchar[], $2::varchar[], $3::varchar[], $4::integer[], $5::integer[],
         $6::date[], $7::time[], $8::char(1)[], $9::varchar[],
         $10::numeric[], $11::numeric[], $12::numeric[], $13::numeric[], $14::numeric[], $15::numeric[]
       )
       ON CONFLICT (cnt_id, fecha, hora, pt) DO NOTHING`,
      [
        nombreFichero, cncId, cntId, ctr, pt,
        fecha, hora, flagHorario, fhRaw,
        aiA, aeA, r1A, r2A, r3A, r4A,
      ]
    );

    return result.rowCount ?? 0;
  }

  private async insertErrores(
    client: PoolClient,
    schema: string,
    fileNameInfo: FicheroContext,
    data: S05File
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
      `INSERT INTO ${schema}.t_s05_error (nombre_fichero, cnc_id, cnt_id, err_cat, err_code)
       SELECT * FROM UNNEST(
         $1::varchar[], $2::varchar[], $3::varchar[], $4::integer[], $5::integer[]
       )
       ON CONFLICT (nombre_fichero, cnt_id) DO NOTHING`,
      [nombreFichero, cncId, cntId, errCat, errCode]
    );

    return result.rowCount ?? 0;
  }
}
