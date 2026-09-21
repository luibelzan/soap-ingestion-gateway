import { Pool, PoolClient } from 'pg';
import { FileRepository, ProcessResult } from '../../core/types';
import { validateSqlIdentifier } from '../../core/sqlIdentifier';
import { G04File } from './g04.types';

interface FicheroContext {
  rawFileName: string;
  cncId: string;
  fecha: string;
  hora: string;
}

/**
 * Repository de G04: mismo patrón que G03. Dos INSERT masivos en
 * total por fichero (t_g04 y t_g04_error). El esquema se recibe como
 * parámetro explícito.
 */
export class G04Repository implements FileRepository<G04File> {
  async insert(
    pool: Pool,
    fileNameInfo: FicheroContext,
    schema: string,
    data: G04File
  ): Promise<ProcessResult> {
    const safeSchema = validateSqlIdentifier(schema);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const filasPrincipales = await this.insertLecturas(client, safeSchema, fileNameInfo, data);
      const filasError = await this.insertErrores(client, safeSchema, fileNameInfo, data);

      await client.query('COMMIT');

      return {
        tipo: 'G04',
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
    data: G04File
  ): Promise<number> {
    const nombreFichero: string[] = [];
    const cncId: string[] = [];
    const cntId: string[] = [];
    const fecha: string[] = [];
    const hora: string[] = [];
    const flagHorario: (string | null)[] = [];
    const fhRaw: string[] = [];
    const bc: (string | null)[] = [];
    const maxVph1Lv: (number | null)[] = [];
    const maxVph2Lv: (number | null)[] = [];
    const maxVph3Lv: (number | null)[] = [];
    const maxIph1Lv: (number | null)[] = [];
    const maxIph2Lv: (number | null)[] = [];
    const maxIph3Lv: (number | null)[] = [];
    const maxPplusTriph: (number | null)[] = [];
    const maxPminusTriph: (number | null)[] = [];
    const maxQplusTriph: (number | null)[] = [];
    const maxQminusTriph: (number | null)[] = [];
    const maxVph1Mv: (number | null)[] = [];
    const maxVph2Mv: (number | null)[] = [];
    const maxVph3Mv: (number | null)[] = [];
    const maxIneutral: (number | null)[] = [];
    const maxV0Comp: (number | null)[] = [];
    const maxV1Comp: (number | null)[] = [];
    const maxV2Comp: (number | null)[] = [];
    const maxVhs: (number | null)[] = [];

    for (const concentrador of data.concentradores) {
      for (const contador of concentrador.contadores) {
        for (const l of contador.lecturas) {
          nombreFichero.push(fileNameInfo.rawFileName);
          cncId.push(concentrador.cncId);
          cntId.push(contador.cntId);
          fecha.push(l.fecha);
          hora.push(l.hora);
          flagHorario.push(l.flagHorario);
          fhRaw.push(l.fhRaw);
          bc.push(l.bc);
          maxVph1Lv.push(l.maxVph1Lv);
          maxVph2Lv.push(l.maxVph2Lv);
          maxVph3Lv.push(l.maxVph3Lv);
          maxIph1Lv.push(l.maxIph1Lv);
          maxIph2Lv.push(l.maxIph2Lv);
          maxIph3Lv.push(l.maxIph3Lv);
          maxPplusTriph.push(l.maxPplusTriph);
          maxPminusTriph.push(l.maxPminusTriph);
          maxQplusTriph.push(l.maxQplusTriph);
          maxQminusTriph.push(l.maxQminusTriph);
          maxVph1Mv.push(l.maxVph1Mv);
          maxVph2Mv.push(l.maxVph2Mv);
          maxVph3Mv.push(l.maxVph3Mv);
          maxIneutral.push(l.maxIneutral);
          maxV0Comp.push(l.maxV0Comp);
          maxV1Comp.push(l.maxV1Comp);
          maxV2Comp.push(l.maxV2Comp);
          maxVhs.push(l.maxVhs);
        }
      }
    }

    if (nombreFichero.length === 0) return 0;

    const result = await client.query(
      `INSERT INTO ${schema}.t_g04
         (nombre_fichero, cnc_id, cnt_id, fecha, hora, flag_horario, fh_raw, bc,
          max_vph1_lv, max_vph2_lv, max_vph3_lv, max_iph1_lv, max_iph2_lv, max_iph3_lv,
          max_pplus_triph, max_pminus_triph, max_qplus_triph, max_qminus_triph,
          max_vph1_mv, max_vph2_mv, max_vph3_mv, max_ineutral,
          max_v0_comp, max_v1_comp, max_v2_comp, max_vhs)
       SELECT * FROM UNNEST(
         $1::varchar[], $2::varchar[], $3::varchar[], $4::date[], $5::time[], $6::char(1)[], $7::varchar[], $8::varchar[],
         $9::numeric[], $10::numeric[], $11::numeric[], $12::numeric[], $13::numeric[], $14::numeric[],
         $15::numeric[], $16::numeric[], $17::numeric[], $18::numeric[],
         $19::numeric[], $20::numeric[], $21::numeric[], $22::numeric[],
         $23::numeric[], $24::numeric[], $25::numeric[], $26::numeric[]
       )
       ON CONFLICT (cnt_id, fecha, hora) DO NOTHING`,
      [
        nombreFichero, cncId, cntId, fecha, hora, flagHorario, fhRaw, bc,
        maxVph1Lv, maxVph2Lv, maxVph3Lv, maxIph1Lv, maxIph2Lv, maxIph3Lv,
        maxPplusTriph, maxPminusTriph, maxQplusTriph, maxQminusTriph,
        maxVph1Mv, maxVph2Mv, maxVph3Mv, maxIneutral,
        maxV0Comp, maxV1Comp, maxV2Comp, maxVhs,
      ]
    );

    return result.rowCount ?? 0;
  }

  private async insertErrores(
    client: PoolClient,
    schema: string,
    fileNameInfo: FicheroContext,
    data: G04File
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
      `INSERT INTO ${schema}.t_g04_error (nombre_fichero, cnc_id, cnt_id, err_cat, err_code)
       SELECT * FROM UNNEST(
         $1::varchar[], $2::varchar[], $3::varchar[], $4::integer[], $5::integer[]
       )
       ON CONFLICT (nombre_fichero, cnt_id) DO NOTHING`,
      [nombreFichero, cncId, cntId, errCat, errCode]
    );

    return result.rowCount ?? 0;
  }
}