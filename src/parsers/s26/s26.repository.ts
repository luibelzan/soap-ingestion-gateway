import { Pool, PoolClient } from 'pg';
import { FileRepository, ProcessResult } from '../../core/types';
import { validateSqlIdentifier } from '../../core/sqlIdentifier';
import { S26File, S26_COLUMNAS } from './s26.types';

interface FicheroContext {
  rawFileName: string;
  cncId: string;
  fecha: string;
  hora: string;
}

// Orden fijo de las columnas de datos (todas menos las de cabecera)
const COLUMNAS = Object.keys(S26_COLUMNAS);

/**
 * Repository de S26: mismo patrón que S02 (dos INSERT masivos, t_s26
 * y t_s26_error, deduplicación vía UNIQUE + ON CONFLICT DO NOTHING),
 * pero con columnas de datos construidas dinámicamente a partir del
 * pivote DataId/DataValue (tabla ancha).
 */
export class S26Repository implements FileRepository<S26File> {
  async insert(
    pool: Pool,
    fileNameInfo: FicheroContext,
    schema: string,
    data: S26File
  ): Promise<ProcessResult> {
    const safeSchema = validateSqlIdentifier(schema);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const filasPrincipales = await this.insertLecturas(client, safeSchema, fileNameInfo, data);
      const filasError = await this.insertErrores(client, safeSchema, fileNameInfo, data);

      await client.query('COMMIT');

      return {
        tipo: 'S26',
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
    data: S26File
  ): Promise<number> {
    const nombreFichero: string[] = [];
    const cncId: string[] = [];
    const cntId: string[] = [];
    const fecha: string[] = [];
    const hora: string[] = [];
    const flagHorario: (string | null)[] = [];
    const fhRaw: string[] = [];
    const columnas: Record<string, (string | number | null)[]> = {};
    for (const col of COLUMNAS) columnas[col] = [];

    for (const concentrador of data.concentradores) {
      for (const contador of concentrador.contadores) {
        for (const lectura of contador.lecturas) {
          if (lectura.camposDesconocidos.length > 0) {
            // eslint-disable-next-line no-console
            console.warn(
              `S26: DataId no reconocido en fichero "${fileNameInfo.rawFileName}" ` +
                `(Cnt ${contador.cntId}): ${lectura.camposDesconocidos.join(', ')}`
            );
          }

          nombreFichero.push(fileNameInfo.rawFileName);
          cncId.push(concentrador.cncId);
          cntId.push(contador.cntId);
          fecha.push(lectura.fecha);
          hora.push(lectura.hora);
          flagHorario.push(lectura.flagHorario);
          fhRaw.push(lectura.fhRaw);

          for (const col of COLUMNAS) {
            columnas[col].push(lectura.campos[col as keyof typeof S26_COLUMNAS] ?? null);
          }
        }
      }
    }

    if (nombreFichero.length === 0) return 0;

    const columnNames = [
      'nombre_fichero',
      'cnc_id',
      'cnt_id',
      'fecha',
      'hora',
      'flag_horario',
      'fh_raw',
      ...COLUMNAS,
    ];
    const castTypes = [
      'varchar',
      'varchar',
      'varchar',
      'date',
      'time',
      'char(1)',
      'varchar',
      ...COLUMNAS.map((c) => (S26_COLUMNAS[c] === 'text' ? 'varchar' : 'numeric')),
    ];
    const unnestParams = [
      nombreFichero,
      cncId,
      cntId,
      fecha,
      hora,
      flagHorario,
      fhRaw,
      ...COLUMNAS.map((c) => columnas[c]),
    ];
    const unnestCasts = castTypes.map((t, i) => `$${i + 1}::${t}[]`).join(', ');

    const query = `
      INSERT INTO ${schema}.t_s26 (${columnNames.join(', ')})
      SELECT * FROM UNNEST(${unnestCasts})
      ON CONFLICT (cnt_id, fecha, hora) DO NOTHING
    `;

    const result = await client.query(query, unnestParams);

    return result.rowCount ?? 0;
  }

  private async insertErrores(
    client: PoolClient,
    schema: string,
    fileNameInfo: FicheroContext,
    data: S26File
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
      `INSERT INTO ${schema}.t_s26_error (nombre_fichero, cnc_id, cnt_id, err_cat, err_code)
       SELECT * FROM UNNEST(
         $1::varchar[], $2::varchar[], $3::varchar[], $4::integer[], $5::integer[]
       )
       ON CONFLICT (nombre_fichero, cnt_id) DO NOTHING`,
      [nombreFichero, cncId, cntId, errCat, errCode]
    );

    return result.rowCount ?? 0;
  }
}
