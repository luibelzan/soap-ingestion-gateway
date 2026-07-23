import { Pool } from 'pg';
import type { Logger } from 'pino';
import { ConnectionManager, DistribuidoraConfig } from '../db/connectionManager';
import { getResumen } from './statsService';
import { validateSqlIdentifier } from './sqlIdentifier';

/**
 * Ventanas de horas que se mantienen cacheadas para cada distribuidora.
 * Por ahora solo 24h (lo pedido), pero al estar ya modelado con
 * UNIQUE(distribuidora, horas) en stats_resumen_cache, añadir otra
 * ventana en el futuro (p.ej. 1h o 168h/7 días) es tan simple como
 * añadir el número a esta lista.
 */
const VENTANAS_HORAS = [24];

async function upsertResumenCache(
  ftpmanagerPool: Pool,
  ftpmanagerSchema: string,
  distribuidora: string,
  horas: number,
  resumen: { total: number; procesados: number; vacios: number; errores: number; desconocidos: number }
): Promise<void> {
  const safeSchema = validateSqlIdentifier(ftpmanagerSchema);

  await ftpmanagerPool.query(
    `INSERT INTO ${safeSchema}.stats_resumen_cache
       (distribuidora, horas, total, procesados, vacios, errores, desconocidos, actualizado_en)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now())
     ON CONFLICT (distribuidora, horas)
     DO UPDATE SET
       total = EXCLUDED.total,
       procesados = EXCLUDED.procesados,
       vacios = EXCLUDED.vacios,
       errores = EXCLUDED.errores,
       desconocidos = EXCLUDED.desconocidos,
       actualizado_en = now()`,
    [distribuidora, horas, resumen.total, resumen.procesados, resumen.vacios, resumen.errores, resumen.desconocidos]
  );
}

/**
 * Recalcula y vuelca la caché SOLO de una distribuidora (todas sus
 * ventanas de VENTANAS_HORAS). Pensada para llamarse al instante justo
 * después de procesar cada fichero, para que el front de ftpmanager
 * vea el número actualizado sin esperar al siguiente ciclo periódico.
 */
export async function syncResumenCacheDistribuidora(
  connectionManager: ConnectionManager,
  ftpmanagerPool: Pool,
  ftpmanagerSchema: string,
  logger: Logger,
  nombreDistribuidora: string
): Promise<void> {
  const pool = connectionManager.getPool(nombreDistribuidora);
  const schema = connectionManager.getSchema(nombreDistribuidora);

  for (const horas of VENTANAS_HORAS) {
    try {
      const resumen = await getResumen(pool, schema, horas);
      await upsertResumenCache(ftpmanagerPool, ftpmanagerSchema, nombreDistribuidora, horas, resumen);
    } catch (err) {
      logger.error(
        { err, distribuidora: nombreDistribuidora, horas },
        `Error actualizando stats_resumen_cache al instante para ${nombreDistribuidora} (${horas}h)`
      );
    }
  }
}

/**
 * Recalcula el resumen (para cada ventana de VENTANAS_HORAS) de todas
 * las distribuidoras, y lo vuelca en stats_resumen_cache de la BD de
 * ftpmanager. Un fallo en una distribuidora o ventana concreta no
 * detiene el resto (se registra y se continúa).
 *
 * Esto ya NO es la vía principal de actualización (eso lo hace
 * syncResumenCacheDistribuidora al instante, tras cada fichero
 * procesado) — actúa como red de seguridad periódica para que la
 * ventana de "últimas N horas" siga deslizándose correctamente incluso
 * si no llega ningún fichero nuevo durante un rato (si no se recalcula
 * nunca, un evento viejo seguiría contando como "reciente" para siempre).
 */
export async function syncResumenCache(
  connectionManager: ConnectionManager,
  distribuidoras: DistribuidoraConfig[],
  ftpmanagerPool: Pool,
  ftpmanagerSchema: string,
  logger: Logger
): Promise<void> {
  for (const dist of distribuidoras) {
    const pool = connectionManager.getPool(dist.nombre);
    const schema = connectionManager.getSchema(dist.nombre);

    for (const horas of VENTANAS_HORAS) {
      try {
        const resumen = await getResumen(pool, schema, horas);
        await upsertResumenCache(ftpmanagerPool, ftpmanagerSchema, dist.nombre, horas, resumen);
      } catch (err) {
        logger.error(
          { err, distribuidora: dist.nombre, horas },
          `Error actualizando stats_resumen_cache para ${dist.nombre} (${horas}h)`
        );
      }
    }
  }
}

/**
 * Arranca el sincronizado periódico DE RESPALDO: una ejecución
 * inmediata al llamar, y luego cada `intervalMinutos` minutos. La
 * actualización principal ocurre al instante tras cada fichero
 * procesado (ver syncResumenCacheDistribuidora, usada desde
 * watcher.ts); esto solo cubre el caso de que no llegue ningún
 * fichero nuevo durante un rato, para que la ventana de horas siga
 * deslizándose.
 */
export function startResumenCacheSync(
  connectionManager: ConnectionManager,
  distribuidoras: DistribuidoraConfig[],
  ftpmanagerPool: Pool,
  ftpmanagerSchema: string,
  logger: Logger,
  intervalMinutos = 15
): void {
  const ejecutar = () => {
    syncResumenCache(connectionManager, distribuidoras, ftpmanagerPool, ftpmanagerSchema, logger).catch(
      (err) => logger.error({ err }, 'Error inesperado sincronizando stats_resumen_cache')
    );
  };

  ejecutar(); // primera ejecución inmediata al arrancar
  setInterval(ejecutar, intervalMinutos * 60 * 1000);

  logger.info(
    `Sincronización de stats_resumen_cache activa cada ${intervalMinutos} minutos (ventanas: ${VENTANAS_HORAS.join(', ')}h)`
  );
}
