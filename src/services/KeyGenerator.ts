import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { Logger } from '../utils/logger';

const logger = new Logger('KeyGenerator');

const execAsync = promisify(exec);

export interface KeyPair {
  key_val: string;
  key_wrap: string;
}

export interface KeyGeneratorResult {
  success: boolean;
  data?: KeyPair | { key_wrap: string } | { key_val: string };
  error?: string;
}

/**
 * Servicio para generar claves usando el script Python de AES Key Wrap
 */
export class KeyGenerator {
  private pythonScript: string;

  constructor() {
    // Ruta al script Python en la raíz del proyecto
    this.pythonScript = path.join(process.cwd(), 'key_generator.py');
  }

  /**
   * Genera un par de claves (plaintext y wrapped) usando un KEK
   * @param kekHex - Key Encryption Key en hexadecimal
   * @param keySizeBits - Tamaño de la clave a generar en bits (default: 128)
   * @returns Par de claves con key_val (plaintext) y key_wrap (wrapped)
   */
  async generateKeyPair(kekHex: string, keySizeBits: number = 128): Promise<KeyPair> {
    try {
      logger.info(`Generating key pair with KEK and size ${keySizeBits} bits`);
      
      const command = `python "${this.pythonScript}" generate ${kekHex} ${keySizeBits}`;
      const { stdout, stderr } = await execAsync(command);

      if (stderr) {
        logger.warn(`Python stderr: ${stderr}`);
      }

      const result: KeyGeneratorResult = JSON.parse(stdout.trim());

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to generate key pair');
      }

      const keyPair = result.data as KeyPair;
      logger.info(`Key pair generated successfully`);
      
      return keyPair;
    } catch (error: any) {
      logger.error(`Error generating key pair: ${error.message}`);
      throw new Error(`Key generation failed: ${error.message}`);
    }
  }

  /**
   * Envuelve (wrap) una clave plaintext usando un KEK
   * @param kekHex - Key Encryption Key en hexadecimal
   * @param plaintextHex - Clave plaintext en hexadecimal
   * @returns Clave envuelta (wrapped) en hexadecimal
   */
  async wrapKey(kekHex: string, plaintextHex: string): Promise<string> {
    try {
      logger.info(`Wrapping key`);
      
      const command = `python "${this.pythonScript}" wrap ${kekHex} ${plaintextHex}`;
      const { stdout, stderr } = await execAsync(command);

      if (stderr) {
        logger.warn(`Python stderr: ${stderr}`);
      }

      const result: KeyGeneratorResult = JSON.parse(stdout.trim());

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to wrap key');
      }

      const wrapped = (result.data as { key_wrap: string }).key_wrap;
      logger.info(`Key wrapped successfully`);
      
      return wrapped;
    } catch (error: any) {
      logger.error(`Error wrapping key: ${error.message}`);
      throw new Error(`Key wrapping failed: ${error.message}`);
    }
  }

  /**
   * Desenvuelve (unwrap) una clave usando un KEK
   * @param kekHex - Key Encryption Key en hexadecimal
   * @param wrappedHex - Clave envuelta en hexadecimal
   * @returns Clave plaintext en hexadecimal
   */
  async unwrapKey(kekHex: string, wrappedHex: string): Promise<string> {
    try {
      logger.info(`Unwrapping key`);
      
      const command = `python "${this.pythonScript}" unwrap ${kekHex} ${wrappedHex}`;
      const { stdout, stderr } = await execAsync(command);

      if (stderr) {
        logger.warn(`Python stderr: ${stderr}`);
      }

      const result: KeyGeneratorResult = JSON.parse(stdout.trim());

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to unwrap key');
      }

      const plaintext = (result.data as { key_val: string }).key_val;
      logger.info(`Key unwrapped successfully`);
      
      return plaintext;
    } catch (error: any) {
      logger.error(`Error unwrapping key: ${error.message}`);
      throw new Error(`Key unwrapping failed: ${error.message}`);
    }
  }

  /**
   * Genera un conjunto completo de claves para un contador (B32)
   * Incluye: MasterKey, LocalDASec (2), RemoteDASec, CDTSec (GUnKey, GAuKey)
   * @param masterKek - KEK para la MasterKey
   * @returns Objeto con todas las claves generadas
   */
  async generateB32Keys(masterKek: string) {
    try {
      logger.info('Generating complete B32 key set');

      // Generar MasterKey
      const masterKey = await this.generateKeyPair(masterKek, 128);

      // Generar claves GUnKey y GAuKey (usando MasterKey como KEK)
      const gunKey = await this.generateKeyPair(masterKey.key_val, 128);
      const gauKey = await this.generateKeyPair(masterKey.key_val, 128);

      return {
        master_key_id: 1, // ID fijo o generado
        masterkey_wrap: masterKey.key_wrap,
        gun_key_id: 5, // IDs según especificación
        gun_key_wrap: gunKey.key_wrap,
        gun_key_val: gunKey.key_val,
        gau_key_id: 6,
        gau_key_wrap: gauKey.key_wrap,
        gau_key_val: gauKey.key_val
      };
    } catch (error: any) {
      logger.error(`Error generating B32 keys: ${error.message}`);
      throw error;
    }
  }

  /**
   * Genera claves para un contador B31 (solo DASec con CDTSec)
   * @param masterKek - KEK para generar las claves
   * @returns Objeto con claves B31
   */
  async generateB31Keys(masterKek: string) {
    try {
      logger.info('Generating B31 key set');

      // Generar claves GUnKey y GAuKey
      const gunKey = await this.generateKeyPair(masterKek, 128);
      const gauKey = await this.generateKeyPair(masterKek, 128);

      return {
        gun_key_id: 5,
        gun_key_val: gunKey.key_val,
        gau_key_id: 6,
        gau_key_val: gauKey.key_val
      };
    } catch (error: any) {
      logger.error(`Error generating B31 keys: ${error.message}`);
      throw error;
    }
  }
}

// Exportar instancia singleton
export const keyGenerator = new KeyGenerator();
