import { Pool } from 'pg';

export interface DistribuidoraConfig {
  nombre: string;
  carpetaImport: string;
  connectionString: string;
  /** Esquema de PostgreSQL donde viven las tablas t_s02, t_s04... (p. ej. "public" o "core") */
  schema: string;
}

/**
 * Mantiene un Pool de PostgreSQL por distribuidora, creado bajo demanda
 * y reutilizado durante toda la vida del proceso.
 */
export class ConnectionManager {
  private pools = new Map<string, Pool>();

  constructor(private readonly distribuidoras: DistribuidoraConfig[]) {}

  getPool(nombreDistribuidora: string): Pool {
    const existing = this.pools.get(nombreDistribuidora);
    if (existing) return existing;

    const config = this.getConfig(nombreDistribuidora);
    const pool = new Pool({ connectionString: config.connectionString });
    this.pools.set(nombreDistribuidora, pool);
    return pool;
  }

  getSchema(nombreDistribuidora: string): string {
    return this.getConfig(nombreDistribuidora).schema;
  }

  private getConfig(nombreDistribuidora: string): DistribuidoraConfig {
    const config = this.distribuidoras.find((d) => d.nombre === nombreDistribuidora);
    if (!config) {
      throw new Error(`No hay configuración de conexión para la distribuidora "${nombreDistribuidora}"`);
    }
    return config;
  }

  async closeAll(): Promise<void> {
    await Promise.all([...this.pools.values()].map((p) => p.end()));
  }
}
