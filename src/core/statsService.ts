import { Pool } from 'pg';
import { validateSqlIdentifier } from './sqlIdentifier';

export interface ResumenStats {
  horas: number;
  total: number;
  procesados: number;
  vacios: number;
  errores: number;
  desconocidos: number;
}

/**
 * Resumen de resultados de procesamiento en las últimas N horas
 * (por defecto 24), a partir de t_procesamiento_log. Usado por
 * core/statsCacheSync.ts para volcar en stats_resumen_cache (BD de
 * ftpmanager).
 */
export async function getResumen(pool: Pool, schema: string, horas = 24): Promise<ResumenStats> {
  const safeSchema = validateSqlIdentifier(schema);

  const resumen: ResumenStats = {
    horas,
    total: 0,
    procesados: 0,
    vacios: 0,
    errores: 0,
    desconocidos: 0,
  };

  try {
    const r = await pool.query(
      `SELECT resultado, COUNT(*)::int AS n
       FROM ${safeSchema}.t_procesamiento_log
       WHERE fecha_procesado > now() - ($1 || ' hours')::interval
       GROUP BY resultado`,
      [horas]
    );

    for (const row of r.rows as { resultado: string; n: number }[]) {
      resumen.total += row.n;
      if (row.resultado === 'PROCESADO') resumen.procesados = row.n;
      else if (row.resultado === 'VACIO') resumen.vacios = row.n;
      else if (row.resultado === 'ERROR') resumen.errores = row.n;
      else if (row.resultado === 'DESCONOCIDO') resumen.desconocidos = row.n;
    }
  } catch {
    // t_procesamiento_log no cargada todavía en esta BD -> resumen a 0
  }

  return resumen;
}
