import { Pool } from 'pg';
import { validateSqlIdentifier } from './sqlIdentifier';

export interface MasterLogEntry {
  distribuidora: string;
  nombreFichero: string;
  tipo: string;
  resultado: string;
  filasPrincipales: number | null;
  filasError: number | null;
  mensaje: string | null;
}

/**
 * Inserta una fila en la tabla maestra stats_resumen_cache (en la BD
 * de ftpmanager, separada de las de las distribuidoras), espejo 1:1
 * de lo que se acaba de insertar en t_procesamiento_log, añadiendo el
 * nombre de la distribuidora. Es un log de eventos (append-only): no
 * agrega ni calcula nada, solo consolida todas las distribuidoras en
 * una única tabla consultable.
 */
export async function insertMasterLog(
  ftpmanagerPool: Pool,
  ftpmanagerSchema: string,
  entry: MasterLogEntry
): Promise<void> {
  const safeSchema = validateSqlIdentifier(ftpmanagerSchema);

  await ftpmanagerPool.query(
    `INSERT INTO ${safeSchema}.stats_resumen_cache
       (distribuidora, nombre_fichero, tipo, resultado, filas_principales, filas_error, mensaje)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      entry.distribuidora,
      entry.nombreFichero,
      entry.tipo,
      entry.resultado,
      entry.filasPrincipales,
      entry.filasError,
      entry.mensaje,
    ]
  );
}
