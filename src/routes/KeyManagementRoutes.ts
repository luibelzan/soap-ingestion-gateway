import { Router } from 'express';
import { Pool } from 'pg';
import { KeyManagementController } from '../controllers/KeyManagementController';

export function createKeyManagementRoutes(pool: Pool, schema: string): Router {
  const router = Router();
  const controller = new KeyManagementController(pool, schema);

  router.post('/validate-excel', controller.validateExcel);
  router.post('/bulk-insert', controller.bulkInsert);
  router.post('/get-by-counters', controller.getByCounters);
  router.get('/check/:cntId', controller.checkCounter);
  router.delete('/:cntId', controller.deleteCounter);

  return router;
}