import { Pool } from 'pg';
import { FileRepository, ProcessResult } from '../../core/types';
import { validateSqlIdentifier } from '../../core/sqlIdentifier';
import { S24BFile } from './s24b.types';

interface FicheroContext {
  rawFileName: string;
  cncId: string;
  fecha: string;
  hora: string;
}

/**
 * Repository de S24B. Aplana Cnc -> S24B -> Meter en filas individuales
 * (una por Meter), en un único INSERT masivo (t_s24b). El esquema se
 * recibe como parámetro explícito.
 */
export class S24BRepository implements FileRepository<S24BFile> {
  async insert(
    pool: Pool,
    fileNameInfo: FicheroContext,
    schema: string,
    data: S24BFile
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
      const serial: string[] = [];
      const address: (string | null)[] = [];
      const version: (string | null)[] = [];
      const primeVersion: (string | null)[] = [];
      const present: (string | null)[] = [];
      const lastCommFecha: (string | null)[] = [];
      const lastCommHora: (string | null)[] = [];
      const lastCommMs: (string | null)[] = [];
      const lastCommFlagHorario: (string | null)[] = [];
      const lastCommRaw: (string | null)[] = [];
      const dateTfFecha: (string | null)[] = [];
      const dateTfHora: (string | null)[] = [];
      const dateTfMs: (string | null)[] = [];
      const dateTfFlagHorario: (string | null)[] = [];
      const dateTfRaw: (string | null)[] = [];
      const avgResponseTime: (number | null)[] = [];
      const statusChanges: (number | null)[] = [];
      const activeTime: (number | null)[] = [];

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
            serial.push(meter.serial);
            address.push(meter.address);
            version.push(meter.version);
            primeVersion.push(meter.primeVersion);
            present.push(meter.present);
            lastCommFecha.push(meter.lastCommFecha);
            lastCommHora.push(meter.lastCommHora);
            lastCommMs.push(meter.lastCommMs);
            lastCommFlagHorario.push(meter.lastCommFlagHorario);
            lastCommRaw.push(meter.lastCommRaw);
            dateTfFecha.push(meter.dateTfFecha);
            dateTfHora.push(meter.dateTfHora);
            dateTfMs.push(meter.dateTfMs);
            dateTfFlagHorario.push(meter.dateTfFlagHorario);
            dateTfRaw.push(meter.dateTfRaw);
            avgResponseTime.push(meter.avgResponseTime);
            statusChanges.push(meter.statusChanges);
            activeTime.push(meter.activeTime);
          }
        }
      }

      let filasPrincipales = 0;

      if (nombreFichero.length > 0) {
        const result = await client.query(
          `INSERT INTO ${safeSchema}.t_s24b
             (nombre_fichero, cnc_id, fecha, hora, ms, flag_horario, fh_raw,
              serial, address, version, prime_version, present,
              last_comm_fecha, last_comm_hora, last_comm_ms, last_comm_flag_horario, last_comm_raw,
              date_tf_fecha, date_tf_hora, date_tf_ms, date_tf_flag_horario, date_tf_raw,
              avg_response_time, status_changes, active_time)
           SELECT * FROM UNNEST(
             $1::varchar[], $2::varchar[], $3::date[], $4::time[], $5::char(3)[], $6::char(1)[], $7::varchar[],
             $8::varchar[], $9::varchar[], $10::varchar[], $11::varchar[], $12::varchar[],
             $13::date[], $14::time[], $15::char(3)[], $16::char(1)[], $17::varchar[],
             $18::date[], $19::time[], $20::char(3)[], $21::char(1)[], $22::varchar[],
             $23::numeric[], $24::integer[], $25::numeric[]
           )
           ON CONFLICT (cnc_id, fecha, hora, ms, serial) DO NOTHING`,
          [
            nombreFichero, cncId, fecha, hora, ms, flagHorario, fhRaw,
            serial, address, version, primeVersion, present,
            lastCommFecha, lastCommHora, lastCommMs, lastCommFlagHorario, lastCommRaw,
            dateTfFecha, dateTfHora, dateTfMs, dateTfFlagHorario, dateTfRaw,
            avgResponseTime, statusChanges, activeTime,
          ]
        );
        filasPrincipales = result.rowCount ?? 0;
      }

      await client.query('COMMIT');

      return {
        tipo: 'S24B',
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
