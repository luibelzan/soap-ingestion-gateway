import { Pool, PoolClient } from 'pg';
import { FileRepository, ProcessResult } from '../../core/types';
import { validateSqlIdentifier } from '../../core/sqlIdentifier';
import { S45File } from './s45.types';

interface FicheroContext {
  rawFileName: string;
  cncId: string;
  fecha: string;
  hora: string;
}

/**
 * Repository de S45: mismo patrón que S02/S14/S06. Dos INSERT masivos
 * en total por fichero (t_s45 y t_s45_error), sin tabla de cabecera ni
 * contador intermedio. Deduplicación atómica vía UNIQUE + ON CONFLICT
 * DO NOTHING. El esquema se recibe como parámetro explícito.
 */
export class S45Repository implements FileRepository<S45File> {
  async insert(
    pool: Pool,
    fileNameInfo: FicheroContext,
    schema: string,
    data: S45File
  ): Promise<ProcessResult> {
    const safeSchema = validateSqlIdentifier(schema);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const filasPrincipales = await this.insertLecturas(client, safeSchema, fileNameInfo, data);
      const filasError = await this.insertErrores(client, safeSchema, fileNameInfo, data);

      await client.query('COMMIT');

      return {
        tipo: 'S45',
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
    data: S45File
  ): Promise<number> {
    const nombreFichero: string[] = [];
    const cncId: string[] = [];
    const cntId: string[] = [];
    const fecha: string[] = [];
    const hora: string[] = [];
    const flagHorario: (string | null)[] = [];
    const fhRaw: string[] = [];
    const bc: (string | null)[] = [];
    const maxL1i: (number | null)[] = [];
    const maxL2i: (number | null)[] = [];
    const maxL3i: (number | null)[] = [];
    const maxIn: (number | null)[] = [];
    const avL1i: (number | null)[] = [];
    const avL2i: (number | null)[] = [];
    const avL3i: (number | null)[] = [];
    const avIn: (number | null)[] = [];
    const minL1i: (number | null)[] = [];
    const minL2i: (number | null)[] = [];
    const minL3i: (number | null)[] = [];
    const minIn: (number | null)[] = [];

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
          maxL1i.push(lectura.maxL1i);
          maxL2i.push(lectura.maxL2i);
          maxL3i.push(lectura.maxL3i);
          maxIn.push(lectura.maxIn);
          avL1i.push(lectura.avL1i);
          avL2i.push(lectura.avL2i);
          avL3i.push(lectura.avL3i);
          avIn.push(lectura.avIn);
          minL1i.push(lectura.minL1i);
          minL2i.push(lectura.minL2i);
          minL3i.push(lectura.minL3i);
          minIn.push(lectura.minIn);
        }
      }
    }

    if (nombreFichero.length === 0) return 0;

    const result = await client.query(
      `INSERT INTO ${schema}.t_s45
         (nombre_fichero, cnc_id, cnt_id, fecha, hora, flag_horario, fh_raw, bc,
          max_l1i, max_l2i, max_l3i, max_in, av_l1i, av_l2i, av_l3i, av_in,
          min_l1i, min_l2i, min_l3i, min_in)
       SELECT * FROM UNNEST(
         $1::varchar[], $2::varchar[], $3::varchar[], $4::date[], $5::time[], $6::char(1)[],
         $7::varchar[], $8::varchar[],
         $9::numeric[], $10::numeric[], $11::numeric[], $12::numeric[],
         $13::numeric[], $14::numeric[], $15::numeric[], $16::numeric[],
         $17::numeric[], $18::numeric[], $19::numeric[], $20::numeric[]
       )
       ON CONFLICT (cnt_id, fecha, hora) DO NOTHING`,
      [
        nombreFichero, cncId, cntId, fecha, hora, flagHorario, fhRaw, bc,
        maxL1i, maxL2i, maxL3i, maxIn, avL1i, avL2i, avL3i, avIn,
        minL1i, minL2i, minL3i, minIn,
      ]
    );

    return result.rowCount ?? 0;
  }

  private async insertErrores(
    client: PoolClient,
    schema: string,
    fileNameInfo: FicheroContext,
    data: S45File
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
      `INSERT INTO ${schema}.t_s45_error (nombre_fichero, cnc_id, cnt_id, err_cat, err_code)
       SELECT * FROM UNNEST(
         $1::varchar[], $2::varchar[], $3::varchar[], $4::integer[], $5::integer[]
       )
       ON CONFLICT (nombre_fichero, cnt_id) DO NOTHING`,
      [nombreFichero, cncId, cntId, errCat, errCode]
    );

    return result.rowCount ?? 0;
  }
}
