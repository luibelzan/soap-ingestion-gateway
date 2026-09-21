import { Router } from 'express';
import { DatabaseController } from '../controllers/DatabaseController';

export function createDatabaseRoutes(): Router {
  const router = Router();
  const controller = new DatabaseController();

  // Listar bases de datos disponibles
  router.get('/', controller.listDatabases);

  return router;
}
