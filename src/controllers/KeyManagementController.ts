import { Request, Response } from 'express';
import { Pool } from 'pg';
import { KeyManagementService, BulkKeyInsertData } from '../services/KeyManagementService';
import { Logger } from '../utils/logger';

const logger = new Logger('KeyManagementController');

/**
 * Controlador para la gestión masiva de claves
 */
export class KeyManagementController {
  private keyManagementService: KeyManagementService;

  constructor(pool: Pool, schema: string) {
    this.keyManagementService = new KeyManagementService(pool, schema);
  }

  /**
   * POST /api/keys/validate-excel
   * Valida los datos del Excel antes de procesarlos
   */
  validateExcel = async (req: Request, res: Response) => {
    try {
      const { excelData } = req.body;

      if (!excelData || !Array.isArray(excelData)) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere un array de datos del Excel'
        });
      }

      const validation = this.keyManagementService.validateExcelData(excelData);

      return res.json({
        success: validation.valid,
        totalCounters: excelData.length,
        errors: validation.errors
      });
    } catch (error: any) {
      logger.error('Error validating Excel data:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * POST /api/keys/bulk-insert
   * Procesa e inserta claves masivamente
   */
  bulkInsert = async (req: Request, res: Response) => {
    try {
      const data: BulkKeyInsertData = req.body;

      if (!data.excelData || !data.opticalPort || !data.remotePLC) {
        return res.status(400).json({
          success: false,
          error: 'Faltan datos requeridos (excelData, opticalPort, remotePLC)'
        });
      }

      // Procesar claves con callback de progreso
      const result = await this.keyManagementService.processBulkKeys(data);

      return res.json({
        success: result.success,
        inserted: result.inserted,
        total: data.excelData.length,
        errors: result.errors
      });
    } catch (error: any) {
      logger.error('Error in bulk insert:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * POST /api/keys/get-by-counters
   * Obtiene las claves de los contadores especificados
   */
  getByCounters = async (req: Request, res: Response) => {
    try {
      const { counterIds } = req.body;

      if (!counterIds || !Array.isArray(counterIds)) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere un array de IDs de contadores'
        });
      }

      const keys = await this.keyManagementService.getKeysByCounters(counterIds);

      return res.json({
        success: true,
        data: keys,
        count: keys.length
      });
    } catch (error: any) {
      logger.error('Error getting keys by counters:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * GET /api/keys/check/:cntId
   * Verifica si un contador ya tiene claves registradas
   */
  checkCounter = async (req: Request, res: Response) => {
    try {
      const { cntId } = req.params;

      if (typeof cntId !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Parámetro cntId inválido'
        });
      }

      const exists = await this.keyManagementService.counterExists(cntId);

      return res.json({
        success: true,
        exists
      });
    } catch (error: any) {
      logger.error('Error checking counter:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * DELETE /api/keys/:cntId
   * Elimina las claves de un contador
   */
  deleteCounter = async (req: Request, res: Response) => {
    try {
      const { cntId } = req.params;

      if (typeof cntId !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Parámetro cntId inválido'
        });
      }

      const deleted = await this.keyManagementService.deleteCounterKeys(cntId);

      return res.json({
        success: deleted,
        message: deleted ? 'Claves eliminadas correctamente' : 'Error al eliminar claves'
      });
    } catch (error: any) {
      logger.error('Error deleting counter keys:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };
}