import { Pool } from 'pg';
import { FileRepository, ProcessResult } from '../../core/types';
import { validateSqlIdentifier } from '../../core/sqlIdentifier';
import { G56File } from './g56.types';

interface FicheroContext {
  rawFileName: string;
  cncId: string;
  fecha: string;
  hora: string;
}

/**
 * Repository de G56. Jerarquía Rtu/LVSLine en vez de Cnc/Cnt, sin
 * concepto de error observado, así que solo hay un INSERT masivo
 * (t_g56). El esquema se recibe como parámetro explícito.
 */
export class G56Repository implements FileRepository<G56File> {
  async insert(
    pool: Pool,
    fileNameInfo: FicheroContext,
    schema: string,
    data: G56File
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
      const avgCPh1: (number | null)[] = [];
      const avgVPh1: (number | null)[] = [];
      const avgPimpPh1: (number | null)[] = [];
      const avgPexpPh1: (number | null)[] = [];
      const avgQimpPh1: (number | null)[] = [];
      const avgQexpPh1: (number | null)[] = [];
      const avgPfPh1: (number | null)[] = [];
      const avgCPh2: (number | null)[] = [];
      const avgVPh2: (number | null)[] = [];
      const avgPimpPh2: (number | null)[] = [];
      const avgPexpPh2: (number | null)[] = [];
      const avgQimpPh2: (number | null)[] = [];
      const avgQexpPh2: (number | null)[] = [];
      const avgPfPh2: (number | null)[] = [];
      const avgCPh3: (number | null)[] = [];
      const avgVPh3: (number | null)[] = [];
      const avgPimpPh3: (number | null)[] = [];
      const avgPexpPh3: (number | null)[] = [];
      const avgQimpPh3: (number | null)[] = [];
      const avgQexpPh3: (number | null)[] = [];
      const avgPfPh3: (number | null)[] = [];
      const avgV12: (number | null)[] = [];
      const avgV23: (number | null)[] = [];
      const avgV31: (number | null)[] = [];
      const avgCn: (number | null)[] = [];
      const temp: (number | null)[] = [];
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
            avgCPh1.push(medida.avgCPh1);
            avgVPh1.push(medida.avgVPh1);
            avgPimpPh1.push(medida.avgPimpPh1);
            avgPexpPh1.push(medida.avgPexpPh1);
            avgQimpPh1.push(medida.avgQimpPh1);
            avgQexpPh1.push(medida.avgQexpPh1);
            avgPfPh1.push(medida.avgPfPh1);
            avgCPh2.push(medida.avgCPh2);
            avgVPh2.push(medida.avgVPh2);
            avgPimpPh2.push(medida.avgPimpPh2);
            avgPexpPh2.push(medida.avgPexpPh2);
            avgQimpPh2.push(medida.avgQimpPh2);
            avgQexpPh2.push(medida.avgQexpPh2);
            avgPfPh2.push(medida.avgPfPh2);
            avgCPh3.push(medida.avgCPh3);
            avgVPh3.push(medida.avgVPh3);
            avgPimpPh3.push(medida.avgPimpPh3);
            avgPexpPh3.push(medida.avgPexpPh3);
            avgQimpPh3.push(medida.avgQimpPh3);
            avgQexpPh3.push(medida.avgQexpPh3);
            avgPfPh3.push(medida.avgPfPh3);
            avgV12.push(medida.avgV12);
            avgV23.push(medida.avgV23);
            avgV31.push(medida.avgV31);
            avgCn.push(medida.avgCn);
            temp.push(medida.temp);
            bc.push(medida.bc);
          }
        }
      }

      let filasPrincipales = 0;

      if (nombreFichero.length > 0) {
        const result = await client.query(
          `INSERT INTO ${safeSchema}.t_g56
             (nombre_fichero, rtu_id, lvsline_id, pos, fecha, hora, flag_horario, fh_raw,
              avg_c_ph1, avg_v_ph1, avg_pimp_ph1, avg_pexp_ph1, avg_qimp_ph1, avg_qexp_ph1, avg_pf_ph1,
              avg_c_ph2, avg_v_ph2, avg_pimp_ph2, avg_pexp_ph2, avg_qimp_ph2, avg_qexp_ph2, avg_pf_ph2,
              avg_c_ph3, avg_v_ph3, avg_pimp_ph3, avg_pexp_ph3, avg_qimp_ph3, avg_qexp_ph3, avg_pf_ph3,
              avg_v12, avg_v23, avg_v31, avg_cn, temp, bc)
           SELECT * FROM UNNEST(
             $1::varchar[], $2::varchar[], $3::varchar[], $4::varchar[], $5::date[], $6::time[],
             $7::char(1)[], $8::varchar[],
             $9::numeric[], $10::numeric[], $11::numeric[], $12::numeric[], $13::numeric[], $14::numeric[], $15::numeric[],
             $16::numeric[], $17::numeric[], $18::numeric[], $19::numeric[], $20::numeric[], $21::numeric[], $22::numeric[],
             $23::numeric[], $24::numeric[], $25::numeric[], $26::numeric[], $27::numeric[], $28::numeric[], $29::numeric[],
             $30::numeric[], $31::numeric[], $32::numeric[], $33::numeric[], $34::numeric[], $35::varchar[]
           )
           ON CONFLICT (rtu_id, lvsline_id, fecha, hora) DO NOTHING`,
          [
            nombreFichero, rtuId, lvslineId, pos, fecha, hora, flagHorario, fhRaw,
            avgCPh1, avgVPh1, avgPimpPh1, avgPexpPh1, avgQimpPh1, avgQexpPh1, avgPfPh1,
            avgCPh2, avgVPh2, avgPimpPh2, avgPexpPh2, avgQimpPh2, avgQexpPh2, avgPfPh2,
            avgCPh3, avgVPh3, avgPimpPh3, avgPexpPh3, avgQimpPh3, avgQexpPh3, avgPfPh3,
            avgV12, avgV23, avgV31, avgCn, temp, bc,
          ]
        );
        filasPrincipales = result.rowCount ?? 0;
      }

      await client.query('COMMIT');

      return {
        tipo: 'G56',
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
