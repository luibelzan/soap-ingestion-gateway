import { Pool } from 'pg';
import { validateSqlIdentifier } from './sqlIdentifier';

export interface ProcesamientoLogEntry {
  nombreFichero: string;
  tipo: string;
  resultado: string;
  filasPrincipales: number | null;
  filasError: number | null;
  mensaje: string | null;
}

export async function insertProcesamientoLog(
  pool: Pool,
  schema: string,
  entry: ProcesamientoLogEntry
): Promise<void> {
  const safeSchema = validateSqlIdentifier(schema);

  await pool.query(
    `INSERT INTO ${safeSchema}.t_procesamiento_log
       (nombre_fichero, tipo, resultado, filas_principales, filas_error, mensaje)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [entry.nombreFichero, entry.tipo, entry.resultado, entry.filasPrincipales, entry.filasError, entry.mensaje]
  );
}
