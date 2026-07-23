import { Pool } from 'pg';
import { FileRepository, ProcessResult } from '../../core/types';
import { validateSqlIdentifier } from '../../core/sqlIdentifier';
import { S24File } from './s24.types';

interface FicheroContext {
  rawFileName: string;
  cncId: string;
  fecha: string;
  hora: string;
}

/**
 * Repository de S24. Aplana Cnc -> S24 -> Meter en filas individuales
 * (una por Meter), en un único INSERT masivo (t_s24). El esquema se
 * recibe como parámetro explícito.
 */
export class S24Repository implements FileRepository<S24File> {
  async insert(
    pool: Pool,
    fileNameInfo: FicheroContext,
    schema: string,
    data: S24File
  ): Promise<ProcessResult> {
    const safeSchema = validateSqlIdentifier(schema);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const nombreFichero: string[] = [];
      const cncId: string[] = [];
      const fecha: string[] = [];
      const hora: string[] = [];
      const ms: string[] = [];
      const flagHorario: (string | null)[] = [];
      const fhRaw: string[] = [];
      const meterId: string[] = [];
      const comStatus: (number | null)[] = [];
      const meterFecha: (string | null)[] = [];
      const meterHora: (string | null)[] = [];
      const meterMs: (string | null)[] = [];
      const meterFlagHorario: (string | null)[] = [];
      const meterDateRaw: (string | null)[] = [];
      const active: (string | null)[] = [];

      for (const concentrador of data.concentradores) {
        for (const snapshot of concentrador.snapshots) {
          for (const meter of snapshot.meters) {
            nombreFichero.push(fileNameInfo.rawFileName);
            cncId.push(concentrador.cncId);
            fecha.push(snapshot.fecha);
            hora.push(snapshot.hora);
            ms.push(snapshot.ms);
            flagHorario.push(snapshot.flagHorario);
            fhRaw.push(snapshot.fhRaw);
            meterId.push(meter.meterId);
            comStatus.push(meter.comStatus);
            meterFecha.push(meter.meterFecha);
            meterHora.push(meter.meterHora);
            meterMs.push(meter.meterMs);
            meterFlagHorario.push(meter.meterFlagHorario);
            meterDateRaw.push(meter.meterDateRaw);
            active.push(meter.active);
          }
        }
      }

      let filasPrincipales = 0;

      if (nombreFichero.length > 0) {
        const result = await client.query(
          `INSERT INTO ${safeSchema}.t_s24
             (nombre_fichero, cnc_id, fecha, hora, ms, flag_horario, fh_raw,
              meter_id, com_status, meter_fecha, meter_hora, meter_ms, meter_flag_horario,
              meter_date_raw, active)
           SELECT * FROM UNNEST(
             $1::varchar[], $2::varchar[], $3::date[], $4::time[], $5::char(3)[], $6::char(1)[], $7::varchar[],
             $8::varchar[], $9::integer[], $10::date[], $11::time[], $12::char(3)[], $13::char(1)[],
             $14::varchar[], $15::varchar[]
           )
           ON CONFLICT (cnc_id, fecha, hora, ms, meter_id) DO NOTHING`,
          [
            nombreFichero, cncId, fecha, hora, ms, flagHorario, fhRaw,
            meterId, comStatus, meterFecha, meterHora, meterMs, meterFlagHorario,
            meterDateRaw, active,
          ]
        );
        filasPrincipales = result.rowCount ?? 0;
      }

      await client.query('COMMIT');

      return {
        tipo: 'S24',
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
