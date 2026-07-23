import { Pool, PoolClient } from 'pg';
import { FileRepository, ProcessResult } from '../../core/types';
import { validateSqlIdentifier } from '../../core/sqlIdentifier';
import { S04File } from './s04.types';

interface FicheroContext {
  rawFileName: string;
  cncId: string;
  fecha: string;
  hora: string;
}

/**
 * Repository de S04, mismo patrón que S02: dos INSERT masivos en total
 * por fichero (t_s04 y t_s04_error), sin tabla de cabecera ni contador
 * intermedio. Deduplicación atómica vía UNIQUE + ON CONFLICT DO NOTHING.
 * El esquema se recibe como parámetro explícito (ver s02.repository.ts).
 */
export class S04Repository implements FileRepository<S04File> {
  async insert(
    pool: Pool,
    fileNameInfo: FicheroContext,
    schema: string,
    data: S04File
  ): Promise<ProcessResult> {
    const safeSchema = validateSqlIdentifier(schema);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const filasPrincipales = await this.insertPeriodos(client, safeSchema, fileNameInfo, data);
      const filasError = await this.insertErrores(client, safeSchema, fileNameInfo, data);

      await client.query('COMMIT');

      return {
        tipo: 'S04',
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
    data: S04File
  ): Promise<number> {
    const nombreFichero: string[] = [];
    const cncId: string[] = [];
    const cntId: string[] = [];
    const ctr: (number | null)[] = [];
    const pt: number[] = [];
    const fechaInicio: string[] = [];
    const horaInicio: string[] = [];
    const flagHorarioInicio: (string | null)[] = [];
    const fhiRaw: string[] = [];
    const fechaFin: string[] = [];
    const horaFin: string[] = [];
    const flagHorarioFin: (string | null)[] = [];
    const fhfRaw: string[] = [];
    const mx: (number | null)[] = [];
    const fechaMax: (string | null)[] = [];
    const horaMax: (string | null)[] = [];
    const flagHorarioMax: (string | null)[] = [];
    const fxRaw: (string | null)[] = [];
    const aiA: number[] = [];
    const aeA: number[] = [];
    const r1A: number[] = [];
    const r2A: number[] = [];
    const r3A: number[] = [];
    const r4A: number[] = [];
    const aiI: number[] = [];
    const aeI: number[] = [];
    const r1I: number[] = [];
    const r2I: number[] = [];
    const r3I: number[] = [];
    const r4I: number[] = [];

    for (const concentrador of data.concentradores) {
      for (const contador of concentrador.contadores) {
        for (const periodo of contador.periodos) {
          nombreFichero.push(fileNameInfo.rawFileName);
          cncId.push(concentrador.cncId);
          cntId.push(contador.cntId);
          ctr.push(periodo.ctr);
          pt.push(periodo.pt);
          fechaInicio.push(periodo.fechaInicio);
          horaInicio.push(periodo.horaInicio);
          flagHorarioInicio.push(periodo.flagHorarioInicio);
          fhiRaw.push(periodo.fhiRaw);
          fechaFin.push(periodo.fechaFin);
          horaFin.push(periodo.horaFin);
          flagHorarioFin.push(periodo.flagHorarioFin);
          fhfRaw.push(periodo.fhfRaw);
          mx.push(periodo.mx);
          fechaMax.push(periodo.fechaMax);
          horaMax.push(periodo.horaMax);
          flagHorarioMax.push(periodo.flagHorarioMax);
          fxRaw.push(periodo.fxRaw);
          aiA.push(periodo.aiA);
          aeA.push(periodo.aeA);
          r1A.push(periodo.r1A);
          r2A.push(periodo.r2A);
          r3A.push(periodo.r3A);
          r4A.push(periodo.r4A);
          aiI.push(periodo.aiI);
          aeI.push(periodo.aeI);
          r1I.push(periodo.r1I);
          r2I.push(periodo.r2I);
          r3I.push(periodo.r3I);
          r4I.push(periodo.r4I);
        }
      }
    }

    if (nombreFichero.length === 0) return 0;

    const result = await client.query(
      `INSERT INTO ${schema}.t_s04
         (nombre_fichero, cnc_id, cnt_id, ctr, pt,
          fecha_inicio, hora_inicio, flag_horario_inicio, fhi_raw,
          fecha_fin, hora_fin, flag_horario_fin, fhf_raw,
          mx, fecha_max, hora_max, flag_horario_max, fx_raw,
          ai_a, ae_a, r1_a, r2_a, r3_a, r4_a,
          ai_i, ae_i, r1_i, r2_i, r3_i, r4_i)
       SELECT * FROM UNNEST(
         $1::varchar[], $2::varchar[], $3::varchar[], $4::integer[], $5::integer[],
         $6::date[], $7::time[], $8::char(1)[], $9::varchar[],
         $10::date[], $11::time[], $12::char(1)[], $13::varchar[],
         $14::numeric[], $15::date[], $16::time[], $17::char(1)[], $18::varchar[],
         $19::numeric[], $20::numeric[], $21::numeric[], $22::numeric[], $23::numeric[], $24::numeric[],
         $25::numeric[], $26::numeric[], $27::numeric[], $28::numeric[], $29::numeric[], $30::numeric[]
       )
       ON CONFLICT (cnt_id, fecha_inicio, hora_inicio, fecha_fin, hora_fin, pt) DO NOTHING`,
      [
        nombreFichero, cncId, cntId, ctr, pt,
        fechaInicio, horaInicio, flagHorarioInicio, fhiRaw,
        fechaFin, horaFin, flagHorarioFin, fhfRaw,
        mx, fechaMax, horaMax, flagHorarioMax, fxRaw,
        aiA, aeA, r1A, r2A, r3A, r4A,
        aiI, aeI, r1I, r2I, r3I, r4I,
      ]
    );

    return result.rowCount ?? 0;
  }

  private async insertErrores(
    client: PoolClient,
    schema: string,
    fileNameInfo: FicheroContext,
    data: S04File
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
      `INSERT INTO ${schema}.t_s04_error (nombre_fichero, cnc_id, cnt_id, err_cat, err_code)
       SELECT * FROM UNNEST(
         $1::varchar[], $2::varchar[], $3::varchar[], $4::integer[], $5::integer[]
       )
       ON CONFLICT (nombre_fichero, cnt_id) DO NOTHING`,
      [nombreFichero, cncId, cntId, errCat, errCode]
    );

    return result.rowCount ?? 0;
  }
}
