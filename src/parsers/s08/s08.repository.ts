import { Pool, PoolClient } from 'pg';
import { FileRepository, ProcessResult } from '../../core/types';
import { validateSqlIdentifier } from '../../core/sqlIdentifier';
import { S08File } from './s08.types';

interface FicheroContext {
  rawFileName: string;
  cncId: string;
  fecha: string;
  hora: string;
}

/**
 * Repository de S08: mismo patrón que S02, pero aplanando los tres
 * bloques (Sub, Sob, Corte) de cada lectura en filas individuales
 * (una por categoría). Dos INSERT masivos en total por fichero
 * (t_s08 y t_s08_error).
 */
export class S08Repository implements FileRepository<S08File> {
  async insert(
    pool: Pool,
    fileNameInfo: FicheroContext,
    schema: string,
    data: S08File
  ): Promise<ProcessResult> {
    const safeSchema = validateSqlIdentifier(schema);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const filasPrincipales = await this.insertLecturas(client, safeSchema, fileNameInfo, data);
      const filasError = await this.insertErrores(client, safeSchema, fileNameInfo, data);

      await client.query('COMMIT');

      return {
        tipo: 'S08',
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
    data: S08File
  ): Promise<number> {
    const nombreFichero: string[] = [];
    const cncId: string[] = [];
    const cntId: string[] = [];
    const fecha: string[] = [];
    const hora: string[] = [];
    const flagHorario: (string | null)[] = [];
    const fhRaw: string[] = [];
    const categoria: string[] = [];
    const nTt: (number | null)[] = [];
    const tTt: (number | null)[] = [];
    const tTa: (number | null)[] = [];
    const nTf1: (number | null)[] = [];
    const tTf1: (number | null)[] = [];
    const tTf1a: (number | null)[] = [];
    const nTf2: (number | null)[] = [];
    const tTf2: (number | null)[] = [];
    const tTf2a: (number | null)[] = [];
    const nTf3: (number | null)[] = [];
    const tTf3: (number | null)[] = [];
    const tTf3a: (number | null)[] = [];

    for (const concentrador of data.concentradores) {
      for (const contador of concentrador.contadores) {
        for (const lectura of contador.lecturas) {
          for (const bloque of lectura.bloques) {
            nombreFichero.push(fileNameInfo.rawFileName);
            cncId.push(concentrador.cncId);
            cntId.push(contador.cntId);
            fecha.push(lectura.fecha);
            hora.push(lectura.hora);
            flagHorario.push(lectura.flagHorario);
            fhRaw.push(lectura.fhRaw);
            categoria.push(bloque.categoria);
            nTt.push(bloque.nTt);
            tTt.push(bloque.tTt);
            tTa.push(bloque.tTa);
            nTf1.push(bloque.nTf1);
            tTf1.push(bloque.tTf1);
            tTf1a.push(bloque.tTf1a);
            nTf2.push(bloque.nTf2);
            tTf2.push(bloque.tTf2);
            tTf2a.push(bloque.tTf2a);
            nTf3.push(bloque.nTf3);
            tTf3.push(bloque.tTf3);
            tTf3a.push(bloque.tTf3a);
          }
        }
      }
    }

    if (nombreFichero.length === 0) return 0;

    const result = await client.query(
      `INSERT INTO ${schema}.t_s08
         (nombre_fichero, cnc_id, cnt_id, fecha, hora, flag_horario, fh_raw, categoria,
          n_tt, t_tt, t_ta, n_tf1, t_tf1, t_tf1a, n_tf2, t_tf2, t_tf2a, n_tf3, t_tf3, t_tf3a)
       SELECT * FROM UNNEST(
         $1::varchar[], $2::varchar[], $3::varchar[], $4::date[], $5::time[], $6::char(1)[], $7::varchar[], $8::varchar[],
         $9::integer[], $10::numeric[], $11::numeric[], $12::integer[], $13::numeric[], $14::numeric[],
         $15::integer[], $16::numeric[], $17::numeric[], $18::integer[], $19::numeric[], $20::numeric[]
       )
       ON CONFLICT (cnt_id, fecha, hora, categoria) DO NOTHING`,
      [
        nombreFichero, cncId, cntId, fecha, hora, flagHorario, fhRaw, categoria,
        nTt, tTt, tTa, nTf1, tTf1, tTf1a, nTf2, tTf2, tTf2a, nTf3, tTf3, tTf3a,
      ]
    );

    return result.rowCount ?? 0;
  }

  private async insertErrores(
    client: PoolClient,
    schema: string,
    fileNameInfo: FicheroContext,
    data: S08File
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
      `INSERT INTO ${schema}.t_s08_error (nombre_fichero, cnc_id, cnt_id, err_cat, err_code)
       SELECT * FROM UNNEST(
         $1::varchar[], $2::varchar[], $3::varchar[], $4::integer[], $5::integer[]
       )
       ON CONFLICT (nombre_fichero, cnt_id) DO NOTHING`,
      [nombreFichero, cncId, cntId, errCat, errCode]
    );

    return result.rowCount ?? 0;
  }
}
