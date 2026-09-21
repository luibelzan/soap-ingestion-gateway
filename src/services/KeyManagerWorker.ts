import { Pool } from 'pg';
import { B32Builder } from './B32Builder';
import { SoapClient } from './SoapClient';
import { Logger } from '../utils/logger';
import { MetricsService } from './MetricsService';
import { validateSqlIdentifier } from '../utils/sqlIdentifier';
import { TKeys } from '../entities/TKeys';

const logger = new Logger('KeyManagerWorker');

export interface WorkerConfig {
  pollIntervalMs: number;
  maxRetries: number;
  retryDelayMs: number;
  batchSize: number;
}

// =============================================================
// Nombres de tabla confirmados contra las entidades TypeORM originales:
//   - B32History -> core.b32_history (@Entity({ schema: 'core', name: 'b32_history' }))
//   - TKeys      -> core.t_keys      (@Entity({ schema: 'core', name: 't_keys' }))
// =============================================================

export interface B32HistoryRow {
  id: number;
  s31_id: number | null;
  cnc_id: string;
  cnt_id: string;
  ws_endpoint_used: string | null;
  order_type: string | null;
  status: string;
  error_message: string | null;
  fecha_envio: string;
  fecha_respuesta: string | null;
  xml_payload_sent: string | null;
  id_pet_sent: number | null;
}

/**
 * Actualiza una orden por id, con un SET dinámico a partir de los
 * campos indicados (sustituye a b32Repository.update(id, {...})).
 */
async function updateOrder(
  pool: Pool,
  schema: string,
  orderId: number,
  fields: Partial<Omit<B32HistoryRow, 'id'>>
): Promise<void> {
  const keys = Object.keys(fields);
  if (keys.length === 0) return;

  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = keys.map((k) => (fields as Record<string, unknown>)[k]);
  values.push(orderId);

  await pool.query(`UPDATE ${schema}.b32_history SET ${setClauses} WHERE id = $${values.length}`, values);
}

export class KeyManagerWorker {
  private pool: Pool;
  private schema: string;
  private config: WorkerConfig;
  private isRunning: boolean = false;
  private pollTimer?: NodeJS.Timeout;

  constructor(pool: Pool, schema: string, config?: Partial<WorkerConfig>) {
    this.pool = pool;
    this.schema = validateSqlIdentifier(schema);
    this.config = {
      pollIntervalMs: config?.pollIntervalMs || 5000,
      maxRetries: config?.maxRetries || 3,
      retryDelayMs: config?.retryDelayMs || 60000,
      batchSize: config?.batchSize || 10
    };
  }

  /**
   * Inicia el worker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Worker already running');
      return;
    }

    this.isRunning = true;
    logger.info('Key Manager Worker started', {
      pollInterval: this.config.pollIntervalMs,
      maxRetries: this.config.maxRetries,
      batchSize: this.config.batchSize
    });

    await this.poll();
  }

  /**
   * Detiene el worker
   */
  stop(): void {
    this.isRunning = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
    }
    logger.info('Key Manager Worker stopped');
  }

  /**
   * Polling loop - busca órdenes pendientes
   */
  private async poll(): Promise<void> {
    if (!this.isRunning) return;

    try {
      await this.processPendingOrders();
    } catch (error) {
      logger.error('Error in polling cycle:', error);
    }

    this.pollTimer = setTimeout(() => this.poll(), this.config.pollIntervalMs);
  }

  /**
   * Procesa órdenes pendientes
   */
  private async processPendingOrders(): Promise<void> {
    await MetricsService.measureAsync('processPendingOrders', async () => {
      const result = await this.pool.query<B32HistoryRow>(
        `SELECT * FROM ${this.schema}.b32_history
         WHERE status = 'PENDING'
            OR (status = 'RETRY' AND fecha_envio < NOW() - INTERVAL '1 minute')
         ORDER BY fecha_envio ASC
         LIMIT $1`,
        [this.config.batchSize]
      );

      const pendingOrders = result.rows;

      if (pendingOrders.length === 0) {
        return;
      }

      logger.info(`Processing ${pendingOrders.length} pending orders`);

      for (const order of pendingOrders) {
        await this.processOrder(order);
      }
    }, { schema: this.schema });
  }

  /**
   * Procesa una orden individual
   */
  private async processOrder(order: B32HistoryRow): Promise<void> {
    await MetricsService.measureAsync('processOrder', async () => {
      try {
        logger.info(`Processing order ${order.id} for CNT: ${order.cnt_id}`);

        // Validar endpoint
        if (!order.ws_endpoint_used || order.ws_endpoint_used === 'UNKNOWN') {
          await updateOrder(this.pool, this.schema, order.id, {
            status: 'FAILED',
            error_message: 'No WebService endpoint configured for this concentrator',
            fecha_respuesta: new Date().toISOString()
          });
          logger.error(`No endpoint configured for order ${order.id}, CNC: ${order.cnc_id}`);
          return;
        }

        // Buscar claves del contador
        const keysResult = await this.pool.query<TKeys>(
          `SELECT * FROM ${this.schema}.t_keys WHERE cnt_id = $1 LIMIT 1`,
          [order.cnt_id]
        );
        const keys = keysResult.rows[0];

        if (!keys) {
          await updateOrder(this.pool, this.schema, order.id, {
            status: 'FAILED',
            error_message: `No keys found for counter ${order.cnt_id}`,
            fecha_respuesta: new Date().toISOString()
          });
          logger.error(`No keys found for CNT: ${order.cnt_id}`);
          return;
        }

        // Determinar tipo de orden y validar claves según el tipo
        const orderType = order.order_type || 'B32';
        let validation;

        if (orderType === 'B31') {
          validation = B32Builder.validateKeysB31(keys);
        } else {
          validation = B32Builder.validateKeys(keys);
        }

        if (!validation.valid) {
          await updateOrder(this.pool, this.schema, order.id, {
            status: 'FAILED',
            error_message: `Incomplete keys for ${orderType}: ${validation.errors.join(', ')}`,
            fecha_respuesta: new Date().toISOString()
          });
          logger.error(`Incomplete keys for ${orderType} CNT: ${order.cnt_id}`, validation.errors);
          return;
        }

        // Generar IdPet único (timestamp + id)
        const idPet = parseInt(`${Date.now().toString().slice(-6)}${order.id.toString().padStart(3, '0')}`);

        // Construir XML según el tipo de orden
        let xmlPayload: string;

        if (orderType === 'B31') {
          xmlPayload = B32Builder.buildB31Order({
            idReq: 'B31',
            idPet,
            version: '4.0',
            cncId: order.cnc_id,
            cntId: order.cnt_id,
            keys
          });
          logger.info(`Building B31 order for CNT: ${order.cnt_id}`);
        } else {
          xmlPayload = B32Builder.buildB32Order({
            idReq: 'B32',
            idPet,
            version: '4.0',
            cncId: order.cnc_id,
            cntId: order.cnt_id,
            keys
          });
          logger.info(`Building B32 order for CNT: ${order.cnt_id}`);
        }

        // Actualizar con el payload y IdPet generado
        await updateOrder(this.pool, this.schema, order.id, {
          xml_payload_sent: xmlPayload,
          id_pet_sent: idPet,
          status: 'SENDING'
        });

        // Enviar la orden SOAP
        const response = await SoapClient.sendOrder(order.ws_endpoint_used, xmlPayload);

        if (response.success) {
          await updateOrder(this.pool, this.schema, order.id, {
            status: 'SUCCESS',
            fecha_respuesta: new Date().toISOString()
          });
          logger.info(`Order ${order.id} sent successfully to ${order.ws_endpoint_used}`);
        } else {
          // Determinar si debe reintentarse
          const shouldRetry = this.shouldRetry(order);

          await updateOrder(this.pool, this.schema, order.id, {
            status: shouldRetry ? 'RETRY' : 'FAILED',
            error_message: response.error || 'Unknown error',
            fecha_respuesta: new Date().toISOString()
          });

          if (shouldRetry) {
            logger.warn(`Order ${order.id} will be retried. Error: ${response.error}`);
          } else {
            logger.error(`Order ${order.id} failed permanently. Error: ${response.error}`);
          }
        }
      } catch (error: any) {
        logger.error(`Error processing order ${order.id}:`, error);

        await updateOrder(this.pool, this.schema, order.id, {
          status: 'FAILED',
          error_message: error?.message || 'Unexpected error',
          fecha_respuesta: new Date().toISOString()
        });
      }
    }, { orderId: order.id, cntId: order.cnt_id });
  }

  /**
   * Determina si una orden debe reintentarse
   */
  private shouldRetry(order: B32HistoryRow): boolean {
    // Contar cuántas veces ha sido reintentada (basado en actualizaciones)
    // Por simplicidad, si ya está en RETRY, no reintentar más
    return order.status === 'PENDING';
  }

  /**
   * Obtiene estadísticas del worker
   */
  async getStats(): Promise<{
    pending: number;
    retry: number;
    success: number;
    failed: number;
    total: number;
  }> {
    // Una sola consulta agrupando por status, en vez de 5 counts
    // separados como hacía la versión con TypeORM.
    const result = await this.pool.query<{ status: string; n: string }>(
      `SELECT status, COUNT(*)::int AS n FROM ${this.schema}.b32_history GROUP BY status`
    );

    const stats = { pending: 0, retry: 0, success: 0, failed: 0, total: 0 };

    for (const row of result.rows) {
      const n = Number(row.n);
      stats.total += n;
      if (row.status === 'PENDING') stats.pending = n;
      else if (row.status === 'RETRY') stats.retry = n;
      else if (row.status === 'SUCCESS') stats.success = n;
      else if (row.status === 'FAILED') stats.failed = n;
    }

    return stats;
  }
}