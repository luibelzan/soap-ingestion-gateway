import { Pool } from 'pg';
import { FileRepository, ProcessResult } from '../../core/types';
import { validateSqlIdentifier } from '../../core/sqlIdentifier';
import { G57File } from './g57.types';

interface FicheroContext {
  rawFileName: string;
  cncId: string;
  fecha: string;
  hora: string;
}

/**
 * Repository de G57. Jerarquía Rtu/LVSLine (igual que G56), sin
 * concepto de error observado, así que solo hay un INSERT masivo
 * (t_g57). El esquema se recibe como parámetro explícito.
 */
export class G57Repository implements FileRepository<G57File> {
  async insert(
    pool: Pool,
    fileNameInfo: FicheroContext,
    schema: string,
    data: G57File
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
      const maxCPh1: (number | null)[] = [];
      const maxVPh1: (number | null)[] = [];
      const maxPimpPh1: (number | null)[] = [];
      const maxPexpPh1: (number | null)[] = [];
      const maxQimpPh1: (number | null)[] = [];
      const maxQexpPh1: (number | null)[] = [];
      const maxPfPh1: (number | null)[] = [];
      const maxCPh2: (number | null)[] = [];
      const maxVPh2: (number | null)[] = [];
      const maxPimpPh2: (number | null)[] = [];
      const maxPexpPh2: (number | null)[] = [];
      const maxQimpPh2: (number | null)[] = [];
      const maxQexpPh2: (number | null)[] = [];
      const maxPfPh2: (number | null)[] = [];
      const maxCPh3: (number | null)[] = [];
      const maxVPh3: (number | null)[] = [];
      const maxPimpPh3: (number | null)[] = [];
      const maxPexpPh3: (number | null)[] = [];
      const maxQimpPh3: (number | null)[] = [];
      const maxQexpPh3: (number | null)[] = [];
      const maxPfPh3: (number | null)[] = [];
      const maxV12: (number | null)[] = [];
      const maxV23: (number | null)[] = [];
      const maxV31: (number | null)[] = [];
      const maxCn: (number | null)[] = [];
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
            maxCPh1.push(medida.maxCPh1);
            maxVPh1.push(medida.maxVPh1);
            maxPimpPh1.push(medida.maxPimpPh1);
            maxPexpPh1.push(medida.maxPexpPh1);
            maxQimpPh1.push(medida.maxQimpPh1);
            maxQexpPh1.push(medida.maxQexpPh1);
            maxPfPh1.push(medida.maxPfPh1);
            maxCPh2.push(medida.maxCPh2);
            maxVPh2.push(medida.maxVPh2);
            maxPimpPh2.push(medida.maxPimpPh2);
            maxPexpPh2.push(medida.maxPexpPh2);
            maxQimpPh2.push(medida.maxQimpPh2);
            maxQexpPh2.push(medida.maxQexpPh2);
            maxPfPh2.push(medida.maxPfPh2);
            maxCPh3.push(medida.maxCPh3);
            maxVPh3.push(medida.maxVPh3);
            maxPimpPh3.push(medida.maxPimpPh3);
            maxPexpPh3.push(medida.maxPexpPh3);
            maxQimpPh3.push(medida.maxQimpPh3);
            maxQexpPh3.push(medida.maxQexpPh3);
            maxPfPh3.push(medida.maxPfPh3);
            maxV12.push(medida.maxV12);
            maxV23.push(medida.maxV23);
            maxV31.push(medida.maxV31);
            maxCn.push(medida.maxCn);
            bc.push(medida.bc);
          }
        }
      }

      let filasPrincipales = 0;

      if (nombreFichero.length > 0) {
        const result = await client.query(
          `INSERT INTO ${safeSchema}.t_g57
             (nombre_fichero, rtu_id, lvsline_id, pos, fecha, hora, flag_horario, fh_raw,
              max_c_ph1, max_v_ph1, max_pimp_ph1, max_pexp_ph1, max_qimp_ph1, max_qexp_ph1, max_pf_ph1,
              max_c_ph2, max_v_ph2, max_pimp_ph2, max_pexp_ph2, max_qimp_ph2, max_qexp_ph2, max_pf_ph2,
              max_c_ph3, max_v_ph3, max_pimp_ph3, max_pexp_ph3, max_qimp_ph3, max_qexp_ph3, max_pf_ph3,
              max_v12, max_v23, max_v31, max_cn, bc)
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
            maxCPh1, maxVPh1, maxPimpPh1, maxPexpPh1, maxQimpPh1, maxQexpPh1, maxPfPh1,
            maxCPh2, maxVPh2, maxPimpPh2, maxPexpPh2, maxQimpPh2, maxQexpPh2, maxPfPh2,
            maxCPh3, maxVPh3, maxPimpPh3, maxPexpPh3, maxQimpPh3, maxQexpPh3, maxPfPh3,
            maxV12, maxV23, maxV31, maxCn, bc,
          ]
        );
        filasPrincipales = result.rowCount ?? 0;
      }

      await client.query('COMMIT');

      return {
        tipo: 'G57',
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
