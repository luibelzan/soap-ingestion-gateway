import express, { Express } from 'express';
import { Pool } from 'pg';
import { getData } from '../controllers/EventsController';
import { Logger } from '../utils/logger';
import { MetricsService } from '../services/MetricsService';
import { createKeyManagementRoutes } from '../routes/KeyManagementRoutes';
import { createDatabaseRoutes } from '../routes/DatabaseRoutes';
import { xmlBodyParser } from '../middleware/Xmlbodyparser';
import cors from 'cors';

const bodyParser = require('body-parser');

const logger = new Logger('Server');

// Almacenar referencias a Pools para health checks
const pools = new Map<number, Pool>();

/**
 * @param port     Puerto en el que arranca este servidor Express.
 * @param pool     Pool de PostgreSQL ya creado para esta base de datos
 *                 (sustituye al DataSource de TypeORM).
 * @param database Nombre de la base de datos (solo informativo, para
 *                 logs y los endpoints /health, /metrics, /status).
 * @param schema   Esquema donde viven las tablas (p.ej. "core"),
 *                 pasado a los controladores que lo necesitan.
 */
export async function createServer(port: number, pool: Pool, database: string, schema: string): Promise<void> {
  if (!database) {
    logger.warn(`Skipping server creation - no database configured for port ${port}`);
    return;
  }

  try {
    // pg.Pool no tiene un "initialize()" explícito: las conexiones se
    // abren bajo demanda. Se hace una consulta trivial para verificar
    // que la conexión funciona antes de levantar el servidor, igual
    // que antes se esperaba a dataSource.initialize().
    await pool.query('SELECT 1');
    logger.info(`Database connection established: ${database}`);

    const app: Express = express();
    
    // Middleware
    app.use(cors()); // Habilitar CORS para frontend React
    app.use(xmlBodyParser());
    app.use(bodyParser.json({ limit: '50mb' })); // Aumentar límite para archivos Excel grandes
    app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

    // API REST endpoints para gestión de claves
    app.use('/api/keys', createKeyManagementRoutes(pool, schema));
    
    // API REST endpoints para listar bases de datos
    app.use('/api/databases', createDatabaseRoutes());

    // SOAP endpoints
    app.post('/WS_STGSoapService', getData(pool, schema));
    app.post('/WS_STG/WS_STG.asmx', getData(pool, schema));
    app.post('/WS_DC/WS_DC.asmx', getData(pool, schema));
    app.post('/', getData(pool, schema));

    // Health check endpoint
    app.get('/health', (_req, res) => {
      const uptime = process.uptime();
      const memoryUsage = process.memoryUsage();
      
      res.json({
        status: 'ok',
        database,
        port,
        uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
        memory: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
        },
        timestamp: new Date().toISOString()
      });
    });

    // Metrics endpoint
    app.get('/metrics', (_req, res) => {
      const operations = MetricsService.getOperations();
      const stats: any = {};
      
      operations.forEach(op => {
        stats[op] = MetricsService.getStats(op);
      });

      res.json({
        database,
        operations: stats,
        recent: MetricsService.getRecent(20)
      });
    });

    // Status endpoint (información general)
    app.get('/status', async (_req, res) => {
      try {
        let isConnected = false;
        try {
          await pool.query('SELECT 1');
          isConnected = true;
        } catch {
          isConnected = false;
        }

        res.json({
          status: isConnected ? 'connected' : 'disconnected',
          database,
          port,
          uptime: process.uptime(),
          pid: process.pid,
          nodeVersion: process.version,
          platform: process.platform
        });
      } catch (error: any) {
        res.status(500).json({
          status: 'error',
          error: error.message
        });
      }
    });

    pools.set(port, pool);

    app.listen(port, () => {
      logger.info(`Server listening on port ${port} for database: ${database}`);
      logger.info(`Health check available at: http://localhost:${port}/health`);
      logger.info(`Metrics available at: http://localhost:${port}/metrics`);
    });
  } catch (error: any) {
    const errorCode = error?.code || 'UNKNOWN';
    const errorMessage = error?.message || JSON.stringify(error);
    
    if (errorCode === '3D000') {
      logger.error(`Database '${database}' does not exist. Please create it first.`);
    } else {
      logger.error(`Error connecting to database ${database} (code: ${errorCode}): ${errorMessage}`);
    }
    
    throw error;
  }
}

export function getPool(port: number): Pool | undefined {
  return pools.get(port);
}