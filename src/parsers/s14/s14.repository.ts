import { Pool, PoolClient } from 'pg';
import { FileRepository, ProcessResult } from '../../core/types';
import { validateSqlIdentifier } from '../../core/sqlIdentifier';
import { S14File } from './s14.types';

interface FicheroContext {
  rawFileName: string;
  cncId: string;
  fecha: string;
  hora: string;
}

/**
 * Repository de S14: mismo patrón que S02/S04/S05/S09/G02/S06. Dos
 * INSERT masivos en total por fichero (t_s14 y t_s14_error), sin tabla
 * de cabecera ni contador intermedio. Deduplicación atómica vía
 * UNIQUE + ON CONFLICT DO NOTHING. El esquema se recibe como parámetro
 * explícito.
 */
export class S14Repository implements FileRepository<S14File> {
  async insert(
    pool: Pool,
    fileNameInfo: FicheroContext,
    schema: string,
    data: S14File
  ): Promise<ProcessResult> {
    const safeSchema = validateSqlIdentifier(schema);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const filasPrincipales = await this.insertLecturas(client, safeSchema, fileNameInfo, data);
      const filasError = await this.insertErrores(client, safeSchema, fileNameInfo, data);

      await client.query('COMMIT');

      return {
        tipo: 'S14',
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
    data: S14File
  ): Promise<number> {
    const nombreFichero: string[] = [];
    const cncId: string[] = [];
    const cntId: string[] = [];
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

    for (const concentrador of data.concentradores) {
      for (const contador of concentrador.contadores) {
        for (const lectura of contador.lecturas) {
          nombreFichero.push(fileNameInfo.rawFileName);
          cncId.push(concentrador.cncId);
          cntId.push(contador.cntId);
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

    if (nombreFichero.length === 0) return 0;

    const result = await client.query(
      `INSERT INTO ${schema}.t_s14
         (nombre_fichero, cnc_id, cnt_id, fecha, hora, flag_horario, fh_raw, bc,
          v1, v2, v3, i1, i2, i3, in_neutro, simp, sexp)
       SELECT * FROM UNNEST(
         $1::varchar[], $2::varchar[], $3::varchar[], $4::date[], $5::time[], $6::char(1)[],
         $7::varchar[], $8::varchar[],
         $9::numeric[], $10::numeric[], $11::numeric[], $12::numeric[], $13::numeric[], $14::numeric[],
         $15::numeric[], $16::numeric[], $17::numeric[]
       )
       ON CONFLICT (cnt_id, fecha, hora) DO NOTHING`,
      [
        nombreFichero, cncId, cntId, fecha, hora, flagHorario, fhRaw, bc,
        v1, v2, v3, i1, i2, i3, inNeutro, simp, sexp,
      ]
    );

    return result.rowCount ?? 0;
  }

  private async insertErrores(
    client: PoolClient,
    schema: string,
    fileNameInfo: FicheroContext,
    data: S14File
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
      `INSERT INTO ${schema}.t_s14_error (nombre_fichero, cnc_id, cnt_id, err_cat, err_code)
       SELECT * FROM UNNEST(
         $1::varchar[], $2::varchar[], $3::varchar[], $4::integer[], $5::integer[]
       )
       ON CONFLICT (nombre_fichero, cnt_id) DO NOTHING`,
      [nombreFichero, cncId, cntId, errCat, errCode]
    );

    return result.rowCount ?? 0;
  }
}
