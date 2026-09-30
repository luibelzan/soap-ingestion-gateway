import { createServer } from './server/server';
import { Logger } from './utils/logger';
import { KeyManagerService, DatabaseConnection } from './services/KeyManagerService';
import { ConnectionManager } from './db/connectionManager';
import { config } from './config/config';

const logger = new Logger('SoapListener');

export interface SoapListenerHandles {
  keyManagerService: KeyManagerService;
  statsIntervalHandle: NodeJS.Timeout;
}

/**
 * Arranca el listener SOAP (un servidor Express por instancia/BD,
 * los Key Manager Workers, y el endpoint de estadísticas global).
 *
 * IMPORTANTE: ya no crea sus propios Pool de pg. Reutiliza los del
 * ConnectionManager que ya usa el watcher de carpetas — antes, una
 * misma base de datos podía tener DOS pools independientes abiertos a
 * la vez (uno del watcher, otro del listener SOAP), lo cual duplicaba
 * conexiones sin necesidad. Esto asume que INSTANCE_i_DATABASE (en el
 * .env del listener SOAP) coincide exactamente con el campo "nombre"
 * de esa distribuidora en distribuidoras.json — si alguna vez dejan de
 * coincidir, connectionManager.getPool() lanzará un error explícito
 * (no fallará en silencio).
 *
 * Por el mismo motivo, el esquema de cada instancia ahora sale de
 * connectionManager.getSchema() (el de distribuidoras.json, por
 * distribuidora) en vez de config.database.schema (un único valor
 * global para todas las instancias) — más correcto si alguna
 * distribuidora tuviera un esquema distinto a las demás.
 *
 * Tampoco llama a process.exit() ni registra sus propios SIGINT/
 * SIGTERM; el apagado ordenado lo gestiona un único sitio
 * (watcher.ts), que llama a stopSoapListener() con los handles
 * devueltos aquí.
 */
export async function startSoapListener(connectionManager: ConnectionManager): Promise<SoapListenerHandles> {
  logger.info('Starting SOAP Listener...');
  logger.info(`Configured instances: ${config.instances.length}`);

  let successCount = 0;
  let failCount = 0;
  const connections = new Map<string, DatabaseConnection>();

  for (const instance of config.instances) {
    try {
      const pool = connectionManager.getPool(instance.database);
      const schema = connectionManager.getSchema(instance.database);

      await createServer(instance.port, pool, instance.database, schema);

      connections.set(instance.database, { database: instance.database, pool, schema });
      successCount++;
    } catch (error) {
      failCount++;
      logger.error(`Failed to start instance for database ${instance.database} on port ${instance.port}:`, error);
    }
  }

  logger.info(`SOAP Listener startup complete: ${successCount} servers started, ${failCount} failed`);

  if (successCount === 0) {
    throw new Error('No SOAP listener servers started successfully');
  }

  // Iniciar Key Manager Workers
  logger.info('Starting Key Manager Service...');
  const keyManagerService = new KeyManagerService();
  await keyManagerService.startWorkers(connections);
  logger.info('Key Manager Service started successfully');

  // Mostrar estadísticas cada 60 segundos
  const statsIntervalHandle = setInterval(async () => {
    const stats = await keyManagerService.getAllStats();
    logger.info('Key Manager Statistics:', Object.fromEntries(stats));
  }, 6000000);

  // Endpoint de estadísticas global en un puerto fijo
  if (config.instances.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const express = require('express');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cors = require('cors');
    const statsApp = express();
    statsApp.use(cors());
    statsApp.use(express.json());

    statsApp.get('/api/key-manager/stats', async (_req: any, res: any) => {
      try {
        const stats = await keyManagerService.getAllStats();
        res.json({
          timestamp: new Date().toISOString(),
          databases: Object.fromEntries(stats)
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    statsApp.get('/api/system/info', (_req: any, res: any) => {
      res.json({
        instances: config.instances.length,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid,
        nodeVersion: process.version
      });
    });

    statsApp.get('/api/databases', (_req: any, res: any) => {
      const databases = config.instances.map((instance) => ({
        name: instance.database,
        port: instance.port,
      }));
      res.json({
        success: true,
        databases,
        count: databases.length
      });
    });

    const statsPort = 9000;
    statsApp.listen(statsPort, () => {
      logger.info(`Stats API listening on port ${statsPort}`);
      logger.info(`  - Key Manager Stats: http://localhost:${statsPort}/api/key-manager/stats`);
      logger.info(`  - System Info: http://localhost:${statsPort}/api/system/info`);
    });
  }

  return { keyManagerService, statsIntervalHandle };
}

/**
 * Apagado ordenado del listener SOAP: para los Key Manager Workers y
 * detiene el intervalo de estadísticas. YA NO cierra ningún Pool (los
 * pools son ahora del ConnectionManager, que se cierra centralizado
 * en watcher.ts vía connectionManager.closeAll()) — cerrarlos aquí
 * también daría error por intentar cerrar un pool ya cerrado, o
 * cerraría conexiones que el watcher todavía necesita.
 */
export async function stopSoapListener(handles: SoapListenerHandles): Promise<void> {
  clearInterval(handles.statsIntervalHandle);
  handles.keyManagerService.stopWorkers();
}