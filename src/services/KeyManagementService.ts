import { Pool } from 'pg';
import { KeyGenerator } from './KeyGenerator';
import { Logger } from '../utils/logger';
import { validateSqlIdentifier } from '../utils/sqlIdentifier';
import { TKeys } from '../entities/TKeys';

const logger = new Logger('KeyManagementService');

export interface ExcelRow {
  contador: string;
  master_key: string; // Master Key Value (plaintext en hexadecimal, 32 chars)
}

export interface OpticalPortConfig {
  clave_lectura: string;      // 8 chars -> local_2_secret
  clave_escritura: string;    // 8 chars -> local_1_secret
  clave_remota_fabrica: string; // 8 chars -> remote_secret & remote_factory_secret
}

export interface RemotePLCConfig {
  mode: 'global' | 'individual';
  global_key?: string;        // 32 chars (solo si mode = 'global')
  global_key_wrap?: string;   // 48 chars (solo si mode = 'global')
}

export interface BulkKeyInsertData {
  excelData: ExcelRow[];
  opticalPort: OpticalPortConfig;
  remotePLC: RemotePLCConfig;
  masterKek?: string; // DEPRECATED: No se usa. Cada master_key_value se usa como su propio KEK
  database?: string; // Base de datos seleccionada (opcional, usa la del Pool por defecto)
}

export interface ProcessingProgress {
  total: number;
  processed: number;
  failed: number;
  percentage: number;
}

/**
 * Servicio para gestión masiva de claves desde Excel
 */
export class KeyManagementService {
  private pool: Pool;
  private schema: string;
  private keyGenerator: KeyGenerator;

  constructor(pool: Pool, schema: string) {
    this.pool = pool;
    this.schema = validateSqlIdentifier(schema);
    this.keyGenerator = new KeyGenerator();
  }

  /**
   * Valida el formato del cnt_id (13 caracteres)
   */
  private validateCntId(cntId: string): boolean {
    return /^[A-Z0-9]{13}$/.test(cntId);
  }

  /**
   * Valida los datos del Excel
   */
  validateExcelData(data: ExcelRow[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data || data.length === 0) {
      errors.push('No se encontraron datos en el archivo Excel');
      return { valid: false, errors };
    }

    data.forEach((row, index) => {
      if (!row.contador) {
        errors.push(`Fila ${index + 1}: Falta el campo 'contador'`);
      } else if (!this.validateCntId(row.contador)) {
        errors.push(`Fila ${index + 1}: El contador '${row.contador}' no tiene formato válido (13 caracteres alfanuméricos)`);
      }

      if (!row.master_key) {
        errors.push(`Fila ${index + 1}: Falta el campo 'master_key'`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida la configuración de Optical Port
   */
  validateOpticalPort(config: OpticalPortConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.clave_lectura || config.clave_lectura.length !== 8) {
      errors.push('Clave de Lectura debe tener exactamente 8 caracteres');
    }

    if (!config.clave_escritura || config.clave_escritura.length !== 8) {
      errors.push('Clave de Escritura debe tener exactamente 8 caracteres');
    }

    if (!config.clave_remota_fabrica || config.clave_remota_fabrica.length !== 8) {
      errors.push('Clave Remota Fábrica debe tener exactamente 8 caracteres');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida la configuración de Remote PLC
   */
  validateRemotePLC(config: RemotePLCConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.mode === 'global') {
      if (!config.global_key || config.global_key.length !== 32) {
        errors.push('Key Global debe tener exactamente 32 caracteres');
      }

      if (!config.global_key_wrap || config.global_key_wrap.length !== 48) {
        errors.push('KeyWrap Global debe tener exactamente 48 caracteres');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Procesa un lote de claves y las inserta en la base de datos
   */
  async processBulkKeys(
    data: BulkKeyInsertData,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<{ success: boolean; inserted: number; errors: string[] }> {
    const errors: string[] = [];
    let inserted = 0;
    const total = data.excelData.length;

    try {
      logger.info(`Starting bulk key processing for ${total} counters`);

      // Validar datos
      const excelValidation = this.validateExcelData(data.excelData);
      if (!excelValidation.valid) {
        return { success: false, inserted: 0, errors: excelValidation.errors };
      }

      const opticalValidation = this.validateOpticalPort(data.opticalPort);
      if (!opticalValidation.valid) {
        return { success: false, inserted: 0, errors: opticalValidation.errors };
      }

      const plcValidation = this.validateRemotePLC(data.remotePLC);
      if (!plcValidation.valid) {
        return { success: false, inserted: 0, errors: plcValidation.errors };
      }

      // Procesar cada contador
      for (let i = 0; i < data.excelData.length; i++) {
        const row = data.excelData[i];

        try {
          // Generar masterkey_wrap usando el master_key_value como KEK
          // Cada contador usa su propio master_key_value como KEK para generar el wrap
          const masterkeyWrap = await this.keyGenerator.wrapKey(row.master_key, row.master_key);

          // Generar o usar claves según el modo
          let gunKeyVal: string;
          let gunKeyWrap: string;
          let gauKeyVal: string;
          let gauKeyWrap: string;

          if (data.remotePLC.mode === 'global') {
            // Modo Global: usar las mismas claves para todos
            gunKeyVal = data.remotePLC.global_key!;
            gunKeyWrap = data.remotePLC.global_key_wrap!;
            gauKeyVal = data.remotePLC.global_key!;
            gauKeyWrap = data.remotePLC.global_key_wrap!;
          } else {
            // Modo Individual: generar claves únicas usando master_key_value como KEK
            const gunKey = await this.keyGenerator.generateKeyPair(row.master_key, 128);
            const gauKey = await this.keyGenerator.generateKeyPair(row.master_key, 128);

            gunKeyVal = gunKey.key_val;
            gunKeyWrap = gunKey.key_wrap;
            gauKeyVal = gauKey.key_val;
            gauKeyWrap = gauKey.key_wrap;
          }

          // Insertar registro de claves.
          // creation_date no se envía (DEFAULT CURRENT_TIMESTAMP en la
          // propia BD); update_date se omite intencionalmente para que
          // quede NULL.
          await this.pool.query(
            `INSERT INTO ${this.schema}.t_keys
               (cnt_id, master_key_id, masterkey_wrap, master_key_value,
                local_1_client_id, local_1_secret, local_2_client_id, local_2_secret,
                remote_client_id, remote_secret, remote_factory_secret,
                gun_key_id, gun_key_wrap, gun_key_val,
                gau_key_id, gau_key_wrap, gau_key_val)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
            [
              row.contador,
              1, // master_key_id
              masterkeyWrap,
              row.master_key, // master_key_value (plaintext del Excel)
              1, // local_1_client_id
              data.opticalPort.clave_escritura,
              2, // local_2_client_id
              data.opticalPort.clave_lectura,
              4, // remote_client_id
              data.opticalPort.clave_remota_fabrica,
              data.opticalPort.clave_remota_fabrica, // remote_factory_secret
              5, // gun_key_id
              gunKeyWrap,
              gunKeyVal,
              6, // gau_key_id
              gauKeyWrap,
              gauKeyVal
            ]
          );

          inserted++;

          // Reportar progreso
          if (onProgress) {
            onProgress({
              total,
              processed: i + 1,
              failed: errors.length,
              percentage: Math.round(((i + 1) / total) * 100)
            });
          }

          logger.info(`Processed counter ${row.contador} (${i + 1}/${total})`);
        } catch (error: any) {
          const errorMsg = `Error procesando contador ${row.contador}: ${error.message}`;
          errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      logger.info(`Bulk processing completed: ${inserted}/${total} inserted, ${errors.length} errors`);

      return {
        success: errors.length === 0,
        inserted,
        errors
      };
    } catch (error: any) {
      logger.error(`Fatal error in bulk processing: ${error.message}`);
      return {
        success: false,
        inserted,
        errors: [error.message]
      };
    }
  }

  /**
   * Obtiene las claves de los contadores especificados
   */
  async getKeysByCounters(counterIds: string[]): Promise<TKeys[]> {
    const result = await this.pool.query<TKeys>(
      `SELECT * FROM ${this.schema}.t_keys
       WHERE cnt_id = ANY($1)
       ORDER BY creation_date DESC`,
      [counterIds]
    );
    return result.rows;
  }

  /**
   * Verifica si un contador ya tiene claves registradas
   */
  async counterExists(cntId: string): Promise<boolean> {
    const result = await this.pool.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM ${this.schema}.t_keys WHERE cnt_id = $1`,
      [cntId]
    );
    return (result.rows[0]?.n ?? 0) > 0;
  }

  /**
   * Elimina las claves de un contador
   */
  async deleteCounterKeys(cntId: string): Promise<boolean> {
    try {
      await this.pool.query(`DELETE FROM ${this.schema}.t_keys WHERE cnt_id = $1`, [cntId]);
      logger.info(`Deleted keys for counter ${cntId}`);
      return true;
    } catch (error: any) {
      logger.error(`Error deleting keys for counter ${cntId}: ${error.message}`);
      return false;
    }
  }
}