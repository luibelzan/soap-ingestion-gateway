import { Pool } from 'pg';
import { createServer } from './server/server';
import { Logger } from './utils/logger';
import { KeyManagerService, DatabaseConnection } from './services/KeyManagerService';
import { config } from './config/config';

const logger = new Logger('SoapListener');

/**
 * Sustituye a createDataSource() de TypeORM: crea un Pool de pg para
 * una base de datos concreta, a partir de la configuración común
 * (config.database). pg.Pool espera "user", pero config.ts usa
 * "username" — se mapea aquí.
 */
function createPool(database: string): Pool {
  return new Pool({
    host: config.database.host,
    port: config.database.port,
    user: config.database.username,
    password: config.database.password,
    database,
  });
}

export interface SoapListenerHandles {
  pools: Map<string, Pool>;
  keyManagerService: KeyManagerService;
  statsIntervalHandle: NodeJS.Timeout;
}

/**
 * Arranca el listener SOAP (un servidor Express por instancia/BD,
 * los Key Manager Workers, y el endpoint de estadísticas global).
 *
 * A diferencia del bootstrap()/main() original:
 *   - NO llama a process.exit() en ningún caso; devuelve los handles
 *     necesarios para que quien la invoque decida qué hacer.
 *   - NO registra sus propios SIGINT/SIGTERM; el apagado ordenado lo
 *     gestiona un único sitio (watcher.ts), que llama a
 *     stopSoapListener() con los handles devueltos aquí.
 */
export async function startSoapListener(): Promise<SoapListenerHandles> {
  logger.info('Starting SOAP Listener...');
  logger.info(`Configured instances: ${config.instances.length}`);

  let successCount = 0;
  let failCount = 0;
  const pools = new Map<string, Pool>();
  const connections = new Map<string, DatabaseConnection>();

  // El esquema es global (config.database.schema), no por instancia:
  // así funcionaban ya las entidades TypeORM originales, todas fijas
  // a un único esquema ('core' por defecto).
  const schema = config.database.schema;

  for (const instance of config.instances) {
    try {
      const pool = createPool(instance.database);

      await createServer(instance.port, pool, instance.database, schema);

      pools.set(instance.database, pool);
      connections.set(instance.database, { database: instance.database, pool, schema });
      successCount++;
    } catch (error) {
      failCount++;
      logger.error(`Failed to start instance for database ${instance.database} on port ${instance.port}:`, error);
    }
  }

  logger.info(`SOAP Listener startup complete: ${successCount} servers started, ${failCount} failed`);

  if (successCount === 0) {
    // Antes esto hacía process.exit(1). Ahora se lanza una excepción:
    // quien llame a startSoapListener() decide si eso debe tumbar todo
    // el proceso combinado (gd-import-service + SOAP listener) o no.
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
  }, 60000);

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

  return { pools, keyManagerService, statsIntervalHandle };
}

/**
 * Apagado ordenado del listener SOAP: para los Key Manager Workers,
 * detiene el intervalo de estadísticas, y cierra todos los Pools.
 * Pensada para llamarse desde el SIGINT centralizado de watcher.ts.
 */
export async function stopSoapListener(handles: SoapListenerHandles): Promise<void> {
  clearInterval(handles.statsIntervalHandle);
  handles.keyManagerService.stopWorkers();

  await Promise.all([...handles.pools.values()].map((pool) => pool.end()));
}