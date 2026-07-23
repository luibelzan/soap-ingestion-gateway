import { Pool } from 'pg';
import { FileRepository, ProcessResult } from '../../core/types';
import { validateSqlIdentifier } from '../../core/sqlIdentifier';
import { G59File } from './g59.types';

interface FicheroContext {
  rawFileName: string;
  cncId: string;
  fecha: string;
  hora: string;
}

/**
 * Repository de G59. Jerarquía Rtu/LVSLine (igual que G56/G57/G58),
 * sin concepto de error observado, así que solo hay un INSERT masivo
 * (t_g59). El esquema se recibe como parámetro explícito.
 */
export class G59Repository implements FileRepository<G59File> {
  async insert(
    pool: Pool,
    fileNameInfo: FicheroContext,
    schema: string,
    data: G59File
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
      const momCPh1: (number | null)[] = [];
      const momVPh1: (number | null)[] = [];
      const momPimpPh1: (number | null)[] = [];
      const momPexpPh1: (number | null)[] = [];
      const momQimpPh1: (number | null)[] = [];
      const momQexpPh1: (number | null)[] = [];
      const momPfPh1: (number | null)[] = [];
      const momCPh2: (number | null)[] = [];
      const momVPh2: (number | null)[] = [];
      const momPimpPh2: (number | null)[] = [];
      const momPexpPh2: (number | null)[] = [];
      const momQimpPh2: (number | null)[] = [];
      const momQexpPh2: (number | null)[] = [];
      const momPfPh2: (number | null)[] = [];
      const momCPh3: (number | null)[] = [];
      const momVPh3: (number | null)[] = [];
      const momPimpPh3: (number | null)[] = [];
      const momPexpPh3: (number | null)[] = [];
      const momQimpPh3: (number | null)[] = [];
      const momQexpPh3: (number | null)[] = [];
      const momPfPh3: (number | null)[] = [];
      const momV12: (number | null)[] = [];
      const momV23: (number | null)[] = [];
      const momV31: (number | null)[] = [];
      const momCn: (number | null)[] = [];
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
            momCPh1.push(medida.momCPh1);
            momVPh1.push(medida.momVPh1);
            momPimpPh1.push(medida.momPimpPh1);
            momPexpPh1.push(medida.momPexpPh1);
            momQimpPh1.push(medida.momQimpPh1);
            momQexpPh1.push(medida.momQexpPh1);
            momPfPh1.push(medida.momPfPh1);
            momCPh2.push(medida.momCPh2);
            momVPh2.push(medida.momVPh2);
            momPimpPh2.push(medida.momPimpPh2);
            momPexpPh2.push(medida.momPexpPh2);
            momQimpPh2.push(medida.momQimpPh2);
            momQexpPh2.push(medida.momQexpPh2);
            momPfPh2.push(medida.momPfPh2);
            momCPh3.push(medida.momCPh3);
            momVPh3.push(medida.momVPh3);
            momPimpPh3.push(medida.momPimpPh3);
            momPexpPh3.push(medida.momPexpPh3);
            momQimpPh3.push(medida.momQimpPh3);
            momQexpPh3.push(medida.momQexpPh3);
            momPfPh3.push(medida.momPfPh3);
            momV12.push(medida.momV12);
            momV23.push(medida.momV23);
            momV31.push(medida.momV31);
            momCn.push(medida.momCn);
            bc.push(medida.bc);
          }
        }
      }

      let filasPrincipales = 0;

      if (nombreFichero.length > 0) {
        const result = await client.query(
          `INSERT INTO ${safeSchema}.t_g59
             (nombre_fichero, rtu_id, lvsline_id, pos, fecha, hora, flag_horario, fh_raw,
              mom_c_ph1, mom_v_ph1, mom_pimp_ph1, mom_pexp_ph1, mom_qimp_ph1, mom_qexp_ph1, mom_pf_ph1,
              mom_c_ph2, mom_v_ph2, mom_pimp_ph2, mom_pexp_ph2, mom_qimp_ph2, mom_qexp_ph2, mom_pf_ph2,
              mom_c_ph3, mom_v_ph3, mom_pimp_ph3, mom_pexp_ph3, mom_qimp_ph3, mom_qexp_ph3, mom_pf_ph3,
              mom_v12, mom_v23, mom_v31, mom_cn, bc)
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
            momCPh1, momVPh1, momPimpPh1, momPexpPh1, momQimpPh1, momQexpPh1, momPfPh1,
            momCPh2, momVPh2, momPimpPh2, momPexpPh2, momQimpPh2, momQexpPh2, momPfPh2,
            momCPh3, momVPh3, momPimpPh3, momPexpPh3, momQimpPh3, momQexpPh3, momPfPh3,
            momV12, momV23, momV31, momCn, bc,
          ]
        );
        filasPrincipales = result.rowCount ?? 0;
      }

      await client.query('COMMIT');

      return {
        tipo: 'G59',
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
