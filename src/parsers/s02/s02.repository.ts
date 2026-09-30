import { Pool } from 'pg';
import { FileRepository, ProcessResult } from '../../core/types';
import { validateSqlIdentifier } from '../../core/sqlIdentifier';
import { S02File } from './s02.types';

interface FicheroContext {
  rawFileName: string; // cncId extraído del NOMBRE del fichero (informativo)
  cncId: string;
  fecha: string; // fecha extraída del NOMBRE del fichero (no usada aquí, disponible por si hace falta)
  hora: string;
}

/**
 * Repository de S02: UNA SOLA sentencia SQL por fichero (antes eran 4
 * round trips: BEGIN + INSERT lecturas + INSERT errores + COMMIT).
 *
 * Se combinan las dos inserciones con CTEs de modificación de datos
 * (WITH ... INSERT ... RETURNING), que en PostgreSQL se ejecutan
 * dentro de la misma sentencia/snapshot — no hace falta BEGIN/COMMIT
 * explícito, una sola sentencia ya es atómica por sí misma. Con
 * conexiones remotas de alta latencia (VPN, nube), esto es la
 * diferencia entre pagar la latencia de red 4 veces o 1 sola vez, por
 * fichero.
 *
 * UNNEST sobre un array vacío simplemente no inserta filas (sin dar
 * error), así que ya no hace falta comprobar "if length === 0" antes
 * de lanzar la consulta como en la versión anterior — si un fichero
 * no tiene contadores en error, el array de errores llega vacío y esa
 * parte de la sentencia no inserta nada, sin más.
 *
 * Ya no se usa client.connect()/release() ni PoolClient: al ser una
 * única sentencia, pool.query() ya gestiona la conexión internamente.
 */
export class S02Repository implements FileRepository<S02File> {
  async insert(
    pool: Pool,
    fileNameInfo: FicheroContext,
    schema: string,
    data: S02File
  ): Promise<ProcessResult> {
    const safeSchema = validateSqlIdentifier(schema);

    // --- Arrays para las lecturas (t_s02) ---
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

    // --- Arrays para los contadores en error (t_s02_error) ---
    const errNombreFichero: string[] = [];
    const errCncId: string[] = [];
    const errCntId: string[] = [];
    const errCat: (number | null)[] = [];
    const errCode: (number | null)[] = [];

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

        if (contador.errCat !== null || contador.errCode !== null) {
          errNombreFichero.push(fileNameInfo.rawFileName);
          errCncId.push(concentrador.cncId);
          errCntId.push(contador.cntId);
          errCat.push(contador.errCat);
          errCode.push(contador.errCode);
        }
      }
    }

    const result = await pool.query(
      `WITH ins_lecturas AS (
         INSERT INTO ${safeSchema}.t_s02
           (nombre_fichero, cnc_id, cnt_id, magnitud, fecha, hora, flag_horario, fh_raw, bc, ai, ae, r1, r2, r3, r4)
         SELECT * FROM UNNEST(
           $1::varchar[], $2::varchar[], $3::varchar[], $4::integer[], $5::date[], $6::time[],
           $7::char(1)[], $8::varchar[], $9::varchar[], $10::numeric[], $11::numeric[],
           $12::numeric[], $13::numeric[], $14::numeric[], $15::numeric[]
         )
         ON CONFLICT (cnt_id, fecha, hora) DO NOTHING
         RETURNING 1
       ),
       ins_errores AS (
         INSERT INTO ${safeSchema}.t_s02_error (nombre_fichero, cnc_id, cnt_id, err_cat, err_code)
         SELECT * FROM UNNEST(
           $16::varchar[], $17::varchar[], $18::varchar[], $19::integer[], $20::integer[]
         )
         ON CONFLICT (nombre_fichero, cnt_id) DO NOTHING
         RETURNING 1
       )
       SELECT
         (SELECT COUNT(*)::int FROM ins_lecturas) AS filas_principales,
         (SELECT COUNT(*)::int FROM ins_errores) AS filas_error`,
      [
        nombreFichero, cncId, cntId, magnitud, fecha, hora, flagHorario, fhRaw, bc, ai, ae, r1, r2, r3, r4,
        errNombreFichero, errCncId, errCntId, errCat, errCode,
      ]
    );

    const { filas_principales: filasPrincipales, filas_error: filasError } = result.rows[0];

    return {
      tipo: 'S02',
      nombreFichero: fileNameInfo.rawFileName,
      filasPrincipales,
      filasError,
    };
  }
}