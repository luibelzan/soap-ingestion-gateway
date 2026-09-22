import type { Logger } from 'pino';
import { ConnectionManager, DistribuidoraConfig } from '../db/connectionManager';
import { recalcularReadingIndex, OpcionesRecalculoReadingIndex } from './readingIndex';

/**
 * Recalcula el índice de lectura (S02/S04/S05) de todas las
 * distribuidoras de una vez, registrando en el log cuánto tarda cada
 * una (por tipo y en total), y el total agregado de toda la pasada.
 * Un fallo en una distribuidora concreta no detiene el resto (se
 * registra y se continúa).
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
 * Arranca el recálculo periódico: una ejecución inmediata al llamar,
 * y luego cada `intervalMinutos` minutos. No hace falta lanzarlo por
 * fichero (sería un desperdicio) — recalcula TODOS los contadores de
 * cada distribuidora de una sentada.
 *
 * OJO con intervalos muy cortos (p.ej. 10 min): cada ejecución recorre
 * TODAS las distribuidoras y TODOS sus contadores con consultas sobre
 * t_s02/t_s04/t_s05, que pueden tener millones de filas. Un intervalo
 * de 10 min supone ~144 pasadas/día en vez de las 4 que salen con el
 * valor por defecto (6h) — vigila la carga en la base de datos si
 * tienes muchas distribuidoras o mucho volumen. Los tiempos que deja
 * en el log (duracionMs) son justo para poder vigilar eso.
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

  ejecutar(); // primera ejecución inmediata al arrancar
  setInterval(ejecutar, intervalMinutos * 60 * 1000);

  logger.info(`Recálculo del índice de lectura activo cada ${intervalMinutos} minutos`);
}