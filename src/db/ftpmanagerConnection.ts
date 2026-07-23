import { Pool } from 'pg';
import ftpmanagerDbConfig from '../config/ftpmanagerDb.json';

export interface FtpmanagerDbConfig {
  connectionString: string;
  schema: string;
}

let pool: Pool | null = null;

export function getFtpmanagerPool(): Pool {
  if (!pool) {
    const config = ftpmanagerDbConfig as FtpmanagerDbConfig;
    pool = new Pool({ connectionString: config.connectionString });
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
