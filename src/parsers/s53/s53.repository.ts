import { Pool } from 'pg';
import { FileRepository, ProcessResult } from '../../core/types';
import { validateSqlIdentifier } from '../../core/sqlIdentifier';
import { S53File } from './s53.types';

interface FicheroContext {
  rawFileName: string;
  cncId: string;
  fecha: string;
  hora: string;
}

/**
 * Repository de S53. Jerarquía Rtu/LVSLine (igual que S52), sin
 * concepto de error observado, así que solo hay un INSERT masivo
 * (t_s53). El esquema se recibe como parámetro explícito.
 */
export class S53Repository implements FileRepository<S53File> {
  async insert(
    pool: Pool,
    fileNameInfo: FicheroContext,
    schema: string,
    data: S53File
  ): Promise<ProcessResult> {
    const safeSchema = validateSqlIdentifier(schema);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const nombreFichero: string[] = [];
      const rtuId: string[] = [];
      const lvslineId: string[] = [];
      const pos: string[] = [];
      const magn: (number | null)[] = [];
      const fecha: string[] = [];
      const hora: string[] = [];
      const flagHorario: (string | null)[] = [];
      const fhRaw: string[] = [];
      const bc: (string | null)[] = [];
      const aiPh1: number[] = [];
      const aiPh2: number[] = [];
      const aiPh3: number[] = [];
      const aePh1: number[] = [];
      const aePh2: number[] = [];
      const aePh3: number[] = [];
      const r1Ph1: number[] = [];
      const r1Ph2: number[] = [];
      const r1Ph3: number[] = [];
      const r2Ph1: number[] = [];
      const r2Ph2: number[] = [];
      const r2Ph3: number[] = [];
      const r3Ph1: number[] = [];
      const r3Ph2: number[] = [];
      const r3Ph3: number[] = [];
      const r4Ph1: number[] = [];
      const r4Ph2: number[] = [];
      const r4Ph3: number[] = [];

      for (const rtu of data.rtus) {
        for (const linea of rtu.lineas) {
          for (const lectura of linea.lecturas) {
            nombreFichero.push(fileNameInfo.rawFileName);
            rtuId.push(rtu.rtuId);
            lvslineId.push(linea.lvslineId);
            pos.push(linea.pos);
            magn.push(linea.magn);
            fecha.push(lectura.fecha);
            hora.push(lectura.hora);
            flagHorario.push(lectura.flagHorario);
            fhRaw.push(lectura.fhRaw);
            bc.push(lectura.bc);
            aiPh1.push(lectura.aiPh1);
            aiPh2.push(lectura.aiPh2);
            aiPh3.push(lectura.aiPh3);
            aePh1.push(lectura.aePh1);
            aePh2.push(lectura.aePh2);
            aePh3.push(lectura.aePh3);
            r1Ph1.push(lectura.r1Ph1);
            r1Ph2.push(lectura.r1Ph2);
            r1Ph3.push(lectura.r1Ph3);
            r2Ph1.push(lectura.r2Ph1);
            r2Ph2.push(lectura.r2Ph2);
            r2Ph3.push(lectura.r2Ph3);
            r3Ph1.push(lectura.r3Ph1);
            r3Ph2.push(lectura.r3Ph2);
            r3Ph3.push(lectura.r3Ph3);
            r4Ph1.push(lectura.r4Ph1);
            r4Ph2.push(lectura.r4Ph2);
            r4Ph3.push(lectura.r4Ph3);
          }
        }
      }

      let filasPrincipales = 0;

      if (nombreFichero.length > 0) {
        const result = await client.query(
          `INSERT INTO ${safeSchema}.t_s53
             (nombre_fichero, rtu_id, lvsline_id, pos, magn, fecha, hora, flag_horario, fh_raw, bc,
              ai_ph1, ai_ph2, ai_ph3, ae_ph1, ae_ph2, ae_ph3,
              r1_ph1, r1_ph2, r1_ph3, r2_ph1, r2_ph2, r2_ph3,
              r3_ph1, r3_ph2, r3_ph3, r4_ph1, r4_ph2, r4_ph3)
           SELECT * FROM UNNEST(
             $1::varchar[], $2::varchar[], $3::varchar[], $4::varchar[], $5::integer[], $6::date[],
             $7::time[], $8::char(1)[], $9::varchar[], $10::varchar[],
             $11::numeric[], $12::numeric[], $13::numeric[], $14::numeric[], $15::numeric[], $16::numeric[],
             $17::numeric[], $18::numeric[], $19::numeric[], $20::numeric[], $21::numeric[], $22::numeric[],
             $23::numeric[], $24::numeric[], $25::numeric[], $26::numeric[], $27::numeric[], $28::numeric[]
           )
           ON CONFLICT (rtu_id, lvsline_id, fecha, hora) DO NOTHING`,
          [
            nombreFichero, rtuId, lvslineId, pos, magn, fecha,
            hora, flagHorario, fhRaw, bc,
            aiPh1, aiPh2, aiPh3, aePh1, aePh2, aePh3,
            r1Ph1, r1Ph2, r1Ph3, r2Ph1, r2Ph2, r2Ph3,
            r3Ph1, r3Ph2, r3Ph3, r4Ph1, r4Ph2, r4Ph3,
          ]
        );
        filasPrincipales = result.rowCount ?? 0;
      }

      await client.query('COMMIT');

      return {
        tipo: 'S53',
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
