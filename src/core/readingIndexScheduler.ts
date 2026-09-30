import type { Logger } from 'pino';
import { ConnectionManager, DistribuidoraConfig } from '../db/connectionManager';
import { recalcularReadingIndex, OpcionesRecalculoReadingIndex } from './readingIndex';

/**
 * Recalcula el índice de lectura (S02/S04/S05) de UNA distribuidora y
 * registra en el log cuánto ha tardado cada tipo.
 *
 * Si falla, lanza el error: quien la llama decide qué hacer (el
 * watcher, por ejemplo, lo vuelve a marcar como pendiente para
 * reintentarlo más tarde).
 */
export async function calcularIndicesLectura(
  connectionManager: ConnectionManager,
  dist: DistribuidoraConfig,
  logger: Logger,
  opciones?: OpcionesRecalculoReadingIndex
): Promise<void> {
  const pool = connectionManager.getPool(dist.nombre);
  const schema = connectionManager.getSchema(dist.nombre);

  const resultado = await recalcularReadingIndex(pool, schema, opciones);

  logger.info(
    {
      distribuidora: dist.nombre,
      filas: { s02: resultado.s02, s04: resultado.s04, s05: resultado.s05 },
      duracionMs: resultado.duracion,
    },
    `[${dist.nombre}] Índice de lectura recalculado en ${resultado.duracion.totalMs}ms ` +
      `(S02=${resultado.duracion.s02Ms}ms/${resultado.s02} filas, ` +
      `S04=${resultado.duracion.s04Ms}ms/${resultado.s04} filas, ` +
      `S05=${resultado.duracion.s05Ms}ms/${resultado.s05} filas)`
  );
}

/**
 * Recalcula el índice de lectura de todas las distribuidoras de una
 * vez. Un fallo en una distribuidora concreta no detiene el resto (se
 * registra y se continúa).
 *
 * El watcher ya no la usa (calcula cada distribuidora cuando se queda
 * sin ficheros), pero se mantiene para lanzar un recálculo completo
 * manualmente o desde un script.
 */
export async function recalcularReadingIndexTodas(
  connectionManager: ConnectionManager,
  distribuidoras: DistribuidoraConfig[],
  logger: Logger,
  opciones?: OpcionesRecalculoReadingIndex
): Promise<void> {
  const inicioPasadaCompleta = Date.now();

  for (const dist of distribuidoras) {
    try {
      await calcularIndicesLectura(connectionManager, dist, logger, opciones);
    } catch (err) {
      logger.error(
        { distribuidora: dist.nombre, err },
        `[${dist.nombre}] Error recalculando el índice de lectura`
      );
    }
  }

  const duracionPasadaCompletaMs = Date.now() - inicioPasadaCompleta;
  logger.info(
    { duracionPasadaCompletaMs, distribuidoras: distribuidoras.length },
    `Recálculo del índice de lectura de todas las distribuidoras completado en ${duracionPasadaCompletaMs}ms`
  );
}

/**
 * Recálculo periódico de todas las distribuidoras: una ejecución
 * inmediata al llamar, y luego cada `intervalMinutos` minutos.
 *
 * @deprecated El watcher calcula ahora los índices por distribuidora
 * cuando se queda sin ficheros (ver watcher.ts). Se mantiene solo por
 * compatibilidad; no la uses junto con el watcher o se calcularán dos
 * veces.
 */
export function startReadingIndexScheduler(
  connectionManager: ConnectionManager,
  distribuidoras: DistribuidoraConfig[],
  logger: Logger,
  opciones?: OpcionesRecalculoReadingIndex,
  intervalMinutos = 360 // 6 horas por defecto
): void {
  const ejecutar = () => {
    recalcularReadingIndexTodas(connectionManager, distribuidoras, logger, opciones).catch((err) =>
      logger.error({ err }, 'Error inesperado recalculando el índice de lectura')
    );
  };

  ejecutar();
  setInterval(ejecutar, intervalMinutos * 60 * 1000);

  logger.info(`Recálculo del índice de lectura activo cada ${intervalMinutos} minutos`);
}