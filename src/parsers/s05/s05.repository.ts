import { Pool } from 'pg';
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
 * Repository de S05: UNA SOLA sentencia SQL por fichero (antes eran 4
 * round trips: BEGIN + INSERT periodos + INSERT errores + COMMIT).
 * Mismo patrón que S02Repository/S04Repository (ver esos ficheros
 * para la explicación completa) — CTEs de modificación de datos en
 * vez de BEGIN/COMMIT + dos INSERT separados.
 */
export class S05Repository implements FileRepository<S05File> {
  async insert(
    pool: Pool,
    fileNameInfo: FicheroContext,
    schema: string,
    data: S05File
  ): Promise<ProcessResult> {
    const safeSchema = validateSqlIdentifier(schema);

    // --- Arrays para los periodos (t_s05) ---
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

    // --- Arrays para los contadores en error (t_s05_error) ---
    const errNombreFichero: string[] = [];
    const errCncId: string[] = [];
    const errCntId: string[] = [];
    const errCat: (number | null)[] = [];
    const errCode: (number | null)[] = [];

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
      `WITH ins_periodos AS (
         INSERT INTO ${safeSchema}.t_s05
           (nombre_fichero, cnc_id, cnt_id, ctr, pt, fecha, hora, flag_horario, fh_raw,
            ai_a, ae_a, r1_a, r2_a, r3_a, r4_a)
         SELECT * FROM UNNEST(
           $1::varchar[], $2::varchar[], $3::varchar[], $4::integer[], $5::integer[],
           $6::date[], $7::time[], $8::char(1)[], $9::varchar[],
           $10::numeric[], $11::numeric[], $12::numeric[], $13::numeric[], $14::numeric[], $15::numeric[]
         )
         ON CONFLICT (cnt_id, fecha, hora, pt) DO NOTHING
         RETURNING 1
       ),
       ins_errores AS (
         INSERT INTO ${safeSchema}.t_s05_error (nombre_fichero, cnc_id, cnt_id, err_cat, err_code)
         SELECT * FROM UNNEST(
           $16::varchar[], $17::varchar[], $18::varchar[], $19::integer[], $20::integer[]
         )
         ON CONFLICT (nombre_fichero, cnt_id) DO NOTHING
         RETURNING 1
       )
       SELECT
         (SELECT COUNT(*)::int FROM ins_periodos) AS filas_principales,
         (SELECT COUNT(*)::int FROM ins_errores) AS filas_error`,
      [
        nombreFichero, cncId, cntId, ctr, pt,
        fecha, hora, flagHorario, fhRaw,
        aiA, aeA, r1A, r2A, r3A, r4A,
        errNombreFichero, errCncId, errCntId, errCat, errCode,
      ]
    );

    const { filas_principales: filasPrincipales, filas_error: filasError } = result.rows[0];

    return {
      tipo: 'S05',
      nombreFichero: fileNameInfo.rawFileName,
      filasPrincipales,
      filasError,
    };
  }
}