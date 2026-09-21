import { Pool, PoolClient } from 'pg';
import { FileRepository, ProcessResult } from '../../core/types';
import { validateSqlIdentifier } from '../../core/sqlIdentifier';
import { G03File } from './g03.types';

interface FicheroContext {
  rawFileName: string;
  cncId: string;
  fecha: string;
  hora: string;
}

/**
 * Repository de G03: mismo patrón que S02/S44/S45. Dos INSERT masivos
 * en total por fichero (t_g03 y t_g03_error). El esquema se recibe
 * como parámetro explícito.
 */
export class G03Repository implements FileRepository<G03File> {
  async insert(
    pool: Pool,
    fileNameInfo: FicheroContext,
    schema: string,
    data: G03File
  ): Promise<ProcessResult> {
    const safeSchema = validateSqlIdentifier(schema);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const filasPrincipales = await this.insertLecturas(client, safeSchema, fileNameInfo, data);
      const filasError = await this.insertErrores(client, safeSchema, fileNameInfo, data);

      await client.query('COMMIT');

      return {
        tipo: 'G03',
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
    data: G03File
  ): Promise<number> {
    const nombreFichero: string[] = [];
    const cncId: string[] = [];
    const cntId: string[] = [];
    const fecha: string[] = [];
    const hora: string[] = [];
    const flagHorario: (string | null)[] = [];
    const fhRaw: string[] = [];
    const bc: (string | null)[] = [];
    const avVph1Lv: (number | null)[] = [];
    const avVph2Lv: (number | null)[] = [];
    const avVph3Lv: (number | null)[] = [];
    const avIph1Lv: (number | null)[] = [];
    const avIph2Lv: (number | null)[] = [];
    const avIph3Lv: (number | null)[] = [];
    const avPplusTriph: (number | null)[] = [];
    const avPminusTriph: (number | null)[] = [];
    const avQplusTriph: (number | null)[] = [];
    const avQminusTriph: (number | null)[] = [];
    const avVph1Mv: (number | null)[] = [];
    const avVph2Mv: (number | null)[] = [];
    const avVph3Mv: (number | null)[] = [];
    const avIneutral: (number | null)[] = [];
    const avV0Comp: (number | null)[] = [];
    const avV1Comp: (number | null)[] = [];
    const avV2Comp: (number | null)[] = [];
    const avVhs: (number | null)[] = [];

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
          avVph1Lv.push(l.avVph1Lv);
          avVph2Lv.push(l.avVph2Lv);
          avVph3Lv.push(l.avVph3Lv);
          avIph1Lv.push(l.avIph1Lv);
          avIph2Lv.push(l.avIph2Lv);
          avIph3Lv.push(l.avIph3Lv);
          avPplusTriph.push(l.avPplusTriph);
          avPminusTriph.push(l.avPminusTriph);
          avQplusTriph.push(l.avQplusTriph);
          avQminusTriph.push(l.avQminusTriph);
          avVph1Mv.push(l.avVph1Mv);
          avVph2Mv.push(l.avVph2Mv);
          avVph3Mv.push(l.avVph3Mv);
          avIneutral.push(l.avIneutral);
          avV0Comp.push(l.avV0Comp);
          avV1Comp.push(l.avV1Comp);
          avV2Comp.push(l.avV2Comp);
          avVhs.push(l.avVhs);
        }
      }
    }

    if (nombreFichero.length === 0) return 0;

    const result = await client.query(
      `INSERT INTO ${schema}.t_g03
         (nombre_fichero, cnc_id, cnt_id, fecha, hora, flag_horario, fh_raw, bc,
          av_vph1_lv, av_vph2_lv, av_vph3_lv, av_iph1_lv, av_iph2_lv, av_iph3_lv,
          av_pplus_triph, av_pminus_triph, av_qplus_triph, av_qminus_triph,
          av_vph1_mv, av_vph2_mv, av_vph3_mv, av_ineutral,
          av_v0_comp, av_v1_comp, av_v2_comp, av_vhs)
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
        avVph1Lv, avVph2Lv, avVph3Lv, avIph1Lv, avIph2Lv, avIph3Lv,
        avPplusTriph, avPminusTriph, avQplusTriph, avQminusTriph,
        avVph1Mv, avVph2Mv, avVph3Mv, avIneutral,
        avV0Comp, avV1Comp, avV2Comp, avVhs,
      ]
    );

    return result.rowCount ?? 0;
  }

  private async insertErrores(
    client: PoolClient,
    schema: string,
    fileNameInfo: FicheroContext,
    data: G03File
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
      `INSERT INTO ${schema}.t_g03_error (nombre_fichero, cnc_id, cnt_id, err_cat, err_code)
       SELECT * FROM UNNEST(
         $1::varchar[], $2::varchar[], $3::varchar[], $4::integer[], $5::integer[]
       )
       ON CONFLICT (nombre_fichero, cnt_id) DO NOTHING`,
      [nombreFichero, cncId, cntId, errCat, errCode]
    );

    return result.rowCount ?? 0;
  }
}