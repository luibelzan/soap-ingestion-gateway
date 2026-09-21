import { Pool, PoolClient } from 'pg';
import { FileRepository, ProcessResult } from '../../core/types';
import { validateSqlIdentifier } from '../../core/sqlIdentifier';
import { G05File } from './g05.types';

interface FicheroContext {
  rawFileName: string;
  cncId: string;
  fecha: string;
  hora: string;
}

/**
 * Repository de G05: mismo patrón que S02/S44/S45/G03. Dos INSERT masivos
 * en total por fichero (t_g05 y t_g05_error). El esquema se recibe
 * como parámetro explícito.
 */
export class G05Repository implements FileRepository<G05File> {
  async insert(
    pool: Pool,
    fileNameInfo: FicheroContext,
    schema: string,
    data: G05File
  ): Promise<ProcessResult> {
    const safeSchema = validateSqlIdentifier(schema);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const filasPrincipales = await this.insertLecturas(client, safeSchema, fileNameInfo, data);
      const filasError = await this.insertErrores(client, safeSchema, fileNameInfo, data);

      await client.query('COMMIT');

      return {
        tipo: 'G05',
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
    data: G05File
  ): Promise<number> {
    const nombreFichero: string[] = [];
    const cncId: string[] = [];
    const cntId: string[] = [];
    const fecha: string[] = [];
    const hora: string[] = [];
    const flagHorario: (string | null)[] = [];
    const fhRaw: string[] = [];
    const bc: (string | null)[] = [];
    const minVph1Lv: (number | null)[] = [];
    const minVph2Lv: (number | null)[] = [];
    const minVph3Lv: (number | null)[] = [];
    const minIph1Lv: (number | null)[] = [];
    const minIph2Lv: (number | null)[] = [];
    const minIph3Lv: (number | null)[] = [];
    const minPplusTriph: (number | null)[] = [];
    const minPminusTriph: (number | null)[] = [];
    const minQplusTriph: (number | null)[] = [];
    const minQminusTriph: (number | null)[] = [];
    const minVph1Mv: (number | null)[] = [];
    const minVph2Mv: (number | null)[] = [];
    const minVph3Mv: (number | null)[] = [];
    const minIneutral: (number | null)[] = [];
    const minV0Comp: (number | null)[] = [];
    const minV1Comp: (number | null)[] = [];
    const minV2Comp: (number | null)[] = [];
    const minVhs: (number | null)[] = [];

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
          minVph1Lv.push(l.minVph1Lv);
          minVph2Lv.push(l.minVph2Lv);
          minVph3Lv.push(l.minVph3Lv);
          minIph1Lv.push(l.minIph1Lv);
          minIph2Lv.push(l.minIph2Lv);
          minIph3Lv.push(l.minIph3Lv);
          minPplusTriph.push(l.minPplusTriph);
          minPminusTriph.push(l.minPminusTriph);
          minQplusTriph.push(l.minQplusTriph);
          minQminusTriph.push(l.minQminusTriph);
          minVph1Mv.push(l.minVph1Mv);
          minVph2Mv.push(l.minVph2Mv);
          minVph3Mv.push(l.minVph3Mv);
          minIneutral.push(l.minIneutral);
          minV0Comp.push(l.minV0Comp);
          minV1Comp.push(l.minV1Comp);
          minV2Comp.push(l.minV2Comp);
          minVhs.push(l.minVhs);
        }
      }
    }

    if (nombreFichero.length === 0) return 0;

    const result = await client.query(
      `INSERT INTO ${schema}.t_g05
         (nombre_fichero, cnc_id, cnt_id, fecha, hora, flag_horario, fh_raw, bc,
          min_vph1_lv, min_vph2_lv, min_vph3_lv, min_iph1_lv, min_iph2_lv, min_iph3_lv,
          min_pplus_triph, min_pminus_triph, min_qplus_triph, min_qminus_triph,
          min_vph1_mv, min_vph2_mv, min_vph3_mv, min_ineutral,
          min_v0_comp, min_v1_comp, min_v2_comp, min_vhs)
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
        minVph1Lv, minVph2Lv, minVph3Lv, minIph1Lv, minIph2Lv, minIph3Lv,
        minPplusTriph, minPminusTriph, minQplusTriph, minQminusTriph,
        minVph1Mv, minVph2Mv, minVph3Mv, minIneutral,
        minV0Comp, minV1Comp, minV2Comp, minVhs,
      ]
    );

    return result.rowCount ?? 0;
  }

  private async insertErrores(
    client: PoolClient,
    schema: string,
    fileNameInfo: FicheroContext,
    data: G05File
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
      `INSERT INTO ${schema}.t_g05_error (nombre_fichero, cnc_id, cnt_id, err_cat, err_code)
       SELECT * FROM UNNEST(
         $1::varchar[], $2::varchar[], $3::varchar[], $4::integer[], $5::integer[]
       )
       ON CONFLICT (nombre_fichero, cnt_id) DO NOTHING`,
      [nombreFichero, cncId, cntId, errCat, errCode]
    );

    return result.rowCount ?? 0;
  }
}