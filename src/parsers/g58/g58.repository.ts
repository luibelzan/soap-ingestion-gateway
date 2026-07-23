import { Pool } from 'pg';
import { FileRepository, ProcessResult } from '../../core/types';
import { validateSqlIdentifier } from '../../core/sqlIdentifier';
import { G58File } from './g58.types';

interface FicheroContext {
  rawFileName: string;
  cncId: string;
  fecha: string;
  hora: string;
}

/**
 * Repository de G58. Jerarquía Rtu/LVSLine (igual que G56/G57), sin
 * concepto de error observado, así que solo hay un INSERT masivo
 * (t_g58). El esquema se recibe como parámetro explícito.
 */
export class G58Repository implements FileRepository<G58File> {
  async insert(
    pool: Pool,
    fileNameInfo: FicheroContext,
    schema: string,
    data: G58File
  ): Promise<ProcessResult> {
    const safeSchema = validateSqlIdentifier(schema);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const nombreFichero: string[] = [];
      const rtuId: string[] = [];
      const lvslineId: string[] = [];
      const pos: string[] = [];
      const fecha: string[] = [];
      const hora: string[] = [];
      const flagHorario: (string | null)[] = [];
      const fhRaw: string[] = [];
      const minCPh1: (number | null)[] = [];
      const minVPh1: (number | null)[] = [];
      const minPimpPh1: (number | null)[] = [];
      const minPexpPh1: (number | null)[] = [];
      const minQimpPh1: (number | null)[] = [];
      const minQexpPh1: (number | null)[] = [];
      const minPfPh1: (number | null)[] = [];
      const minCPh2: (number | null)[] = [];
      const minVPh2: (number | null)[] = [];
      const minPimpPh2: (number | null)[] = [];
      const minPexpPh2: (number | null)[] = [];
      const minQimpPh2: (number | null)[] = [];
      const minQexpPh2: (number | null)[] = [];
      const minPfPh2: (number | null)[] = [];
      const minCPh3: (number | null)[] = [];
      const minVPh3: (number | null)[] = [];
      const minPimpPh3: (number | null)[] = [];
      const minPexpPh3: (number | null)[] = [];
      const minQimpPh3: (number | null)[] = [];
      const minQexpPh3: (number | null)[] = [];
      const minPfPh3: (number | null)[] = [];
      const minV12: (number | null)[] = [];
      const minV23: (number | null)[] = [];
      const minV31: (number | null)[] = [];
      const minCn: (number | null)[] = [];
      const bc: (string | null)[] = [];

      for (const rtu of data.rtus) {
        for (const linea of rtu.lineas) {
          for (const medida of linea.medidas) {
            nombreFichero.push(fileNameInfo.rawFileName);
            rtuId.push(rtu.rtuId);
            lvslineId.push(linea.lvslineId);
            pos.push(linea.pos);
            fecha.push(medida.fecha);
            hora.push(medida.hora);
            flagHorario.push(medida.flagHorario);
            fhRaw.push(medida.fhRaw);
            minCPh1.push(medida.minCPh1);
            minVPh1.push(medida.minVPh1);
            minPimpPh1.push(medida.minPimpPh1);
            minPexpPh1.push(medida.minPexpPh1);
            minQimpPh1.push(medida.minQimpPh1);
            minQexpPh1.push(medida.minQexpPh1);
            minPfPh1.push(medida.minPfPh1);
            minCPh2.push(medida.minCPh2);
            minVPh2.push(medida.minVPh2);
            minPimpPh2.push(medida.minPimpPh2);
            minPexpPh2.push(medida.minPexpPh2);
            minQimpPh2.push(medida.minQimpPh2);
            minQexpPh2.push(medida.minQexpPh2);
            minPfPh2.push(medida.minPfPh2);
            minCPh3.push(medida.minCPh3);
            minVPh3.push(medida.minVPh3);
            minPimpPh3.push(medida.minPimpPh3);
            minPexpPh3.push(medida.minPexpPh3);
            minQimpPh3.push(medida.minQimpPh3);
            minQexpPh3.push(medida.minQexpPh3);
            minPfPh3.push(medida.minPfPh3);
            minV12.push(medida.minV12);
            minV23.push(medida.minV23);
            minV31.push(medida.minV31);
            minCn.push(medida.minCn);
            bc.push(medida.bc);
          }
        }
      }

      let filasPrincipales = 0;

      if (nombreFichero.length > 0) {
        const result = await client.query(
          `INSERT INTO ${safeSchema}.t_g58
             (nombre_fichero, rtu_id, lvsline_id, pos, fecha, hora, flag_horario, fh_raw,
              min_c_ph1, min_v_ph1, min_pimp_ph1, min_pexp_ph1, min_qimp_ph1, min_qexp_ph1, min_pf_ph1,
              min_c_ph2, min_v_ph2, min_pimp_ph2, min_pexp_ph2, min_qimp_ph2, min_qexp_ph2, min_pf_ph2,
              min_c_ph3, min_v_ph3, min_pimp_ph3, min_pexp_ph3, min_qimp_ph3, min_qexp_ph3, min_pf_ph3,
              min_v12, min_v23, min_v31, min_cn, bc)
           SELECT * FROM UNNEST(
             $1::varchar[], $2::varchar[], $3::varchar[], $4::varchar[], $5::date[], $6::time[],
             $7::char(1)[], $8::varchar[],
             $9::numeric[], $10::numeric[], $11::numeric[], $12::numeric[], $13::numeric[], $14::numeric[], $15::numeric[],
             $16::numeric[], $17::numeric[], $18::numeric[], $19::numeric[], $20::numeric[], $21::numeric[], $22::numeric[],
             $23::numeric[], $24::numeric[], $25::numeric[], $26::numeric[], $27::numeric[], $28::numeric[], $29::numeric[],
             $30::numeric[], $31::numeric[], $32::numeric[], $33::numeric[], $34::varchar[]
           )
           ON CONFLICT (rtu_id, lvsline_id, fecha, hora) DO NOTHING`,
          [
            nombreFichero, rtuId, lvslineId, pos, fecha, hora, flagHorario, fhRaw,
            minCPh1, minVPh1, minPimpPh1, minPexpPh1, minQimpPh1, minQexpPh1, minPfPh1,
            minCPh2, minVPh2, minPimpPh2, minPexpPh2, minQimpPh2, minQexpPh2, minPfPh2,
            minCPh3, minVPh3, minPimpPh3, minPexpPh3, minQimpPh3, minQexpPh3, minPfPh3,
            minV12, minV23, minV31, minCn, bc,
          ]
        );
        filasPrincipales = result.rowCount ?? 0;
      }

      await client.query('COMMIT');

      return {
        tipo: 'G58',
        nombreFichero: fileNameInfo.rawFileName,
        filasPrincipales,
        filasError: 0,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
