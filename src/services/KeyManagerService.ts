import { Pool } from 'pg';
import { KeyManagerWorker } from './KeyManagerWorker';
import { Logger } from '../utils/logger';

const logger = new Logger('KeyManagerService');

export interface DatabaseConnection {
  database: string;
  pool: Pool;
  schema: string;
}

export class KeyManagerService {
  private workers: Map<string, KeyManagerWorker> = new Map();

  /**
   * Inicia un worker para cada instancia de base de datos
   */
  async startWorkers(connections: Map<string, DatabaseConnection>): Promise<void> {
    logger.info(`Starting Key Manager workers for ${connections.size} databases`);

    for (const [database, { pool, schema }] of connections) {
      try {
        const worker = new KeyManagerWorker(pool, schema, {
          pollIntervalMs: 5000,
          maxRetries: 3,
          batchSize: 10
        });

        await worker.start();
        this.workers.set(database, worker);
        
        logger.info(`Worker started for database: ${database}`);
      } catch (error) {
        logger.error(`Failed to start worker for database ${database}:`, error);
      }
    }

    logger.info(`${this.workers.size} workers started successfully`);
  }

  /**
   * Detiene todos los workers
   */
  stopWorkers(): void {
    logger.info('Stopping all Key Manager workers');

    for (const [database, worker] of this.workers) {
      worker.stop();
      logger.info(`Worker stopped for database: ${database}`);
    }

    this.workers.clear();
  }

  /**
   * Obtiene estadísticas de todos los workers
   */
  async getAllStats(): Promise<Map<string, any>> {
    const stats = new Map();

    for (const [database, worker] of this.workers) {
      try {
        const workerStats = await worker.getStats();
        stats.set(database, workerStats);
      } catch (error) {
        logger.error(`Error getting stats for ${database}:`, error);
        stats.set(database, { error: 'Failed to get stats' });
      }
    }

    return stats;
  }

  /**
   * Obtiene un worker específico por nombre de base de datos
   */
  getWorker(database: string): KeyManagerWorker | undefined {
    return this.workers.get(database);
  }
}