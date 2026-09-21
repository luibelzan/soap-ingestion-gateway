import type { Logger } from 'pino';
import { ConnectionManager, DistribuidoraConfig } from '../db/connectionManager';
import { recalcularReadingIndex, OpcionesRecalculoReadingIndex } from './readingIndex';

/**
 * Recalcula el índice de lectura (S02/S04/S05) de todas las
 * distribuidoras de una vez. Un fallo en una distribuidora concreta
 * no detiene el resto (se registra y se continúa).
 */
export async function recalcularReadingIndexTodas(
  connectionManager: ConnectionManager,
  distribuidoras: DistribuidoraConfig[],
  logger: Logger,
  opciones?: OpcionesRecalculoReadingIndex
): Promise<void> {
  for (const dist of distribuidoras) {
    try {
      const pool = connectionManager.getPool(dist.nombre);
      const schema = connectionManager.getSchema(dist.nombre);

      const resultado = await recalcularReadingIndex(pool, schema, opciones);

      logger.info(
        { distribuidora: dist.nombre, ...resultado },
        `[${dist.nombre}] Índice de lectura recalculado: S02=${resultado.s02} S04=${resultado.s04} S05=${resultado.s05} filas`
      );
    } catch (err) {
      logger.error(
        { distribuidora: dist.nombre, err },
        `[${dist.nombre}] Error recalculando el índice de lectura`
      );
    }
  }
}

/**
 * Arranca el recálculo periódico: una ejecución inmediata al llamar,
 * y luego cada `intervalHoras` horas. No hace falta lanzarlo por
 * fichero (sería un desperdicio) — recalcula TODOS los contadores de
 * cada distribuidora de una sentada, así que con una vez cada pocas
 * horas es más que suficiente para detectar huecos.
 */
export function startReadingIndexScheduler(
  connectionManager: ConnectionManager,
  distribuidoras: DistribuidoraConfig[],
  logger: Logger,
  opciones?: OpcionesRecalculoReadingIndex,
  intervalHoras = 6
): void {
  const ejecutar = () => {
    recalcularReadingIndexTodas(connectionManager, distribuidoras, logger, opciones).catch((err) =>
      logger.error({ err }, 'Error inesperado recalculando el índice de lectura')
    );
  };

  ejecutar(); // primera ejecución inmediata al arrancar
  setInterval(ejecutar, intervalHoras * 60 * 60 * 1000);

  logger.info(`Recálculo del índice de lectura activo cada ${intervalHoras} horas`);
}