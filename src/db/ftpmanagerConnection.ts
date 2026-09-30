import { Pool } from 'pg';
import ftpmanagerDbConfig from '../config/ftpmanagerDb.json';

export interface FtpmanagerDbConfig {
  connectionString: string;
  schema: string;
}

let pool: Pool | null = null;

// Este pool lo comparten las 36 distribuidoras a la vez (cada fichero
// procesado, de cualquier distribuidora, escribe aquí). Por eso su
// límite no puede ser tan bajo como el de un pool individual por
// distribuidora — pero tampoco hace falta que sea tan alto como la
// suma de todas ellas, ya que aquí solo se hace un INSERT rápido por
// fichero, no toda la transacción de negocio.
const FTPMANAGER_POOL_MAX = Number(process.env.FTPMANAGER_POOL_MAX) || 20;

export function getFtpmanagerPool(): Pool {
  if (!pool) {
    const config = ftpmanagerDbConfig as FtpmanagerDbConfig;
    pool = new Pool({
      connectionString: config.connectionString,
      max: FTPMANAGER_POOL_MAX,
    });
  }
  return pool;
}

export function getFtpmanagerSchema(): string {
  return (ftpmanagerDbConfig as FtpmanagerDbConfig).schema;
}

export async function closeFtpmanagerPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}