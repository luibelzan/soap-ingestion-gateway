import { Request, Response } from 'express';
import { config } from '../config/config';
//import { Logger } from '../utils/logger';

//const logger = new Logger('DatabaseController');

/**
 * Controlador para gestión de bases de datos disponibles
 */
export class DatabaseController {
  /**
   * GET /api/databases
   * Obtiene la lista de bases de datos configuradas
   */
  listDatabases = async (_req: Request, res: Response) => {
    try {
      const databases = config.instances.map((instance) => ({
        name: instance.database,
        port: instance.port,
      }));

      return res.json({
        success: true,
        databases,
        count: databases.length,
      });
    } catch (error: any) {
      //logger.error('Error listing databases:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  };
}
