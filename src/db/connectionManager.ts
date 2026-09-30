import { Pool } from 'pg';

export interface DistribuidoraConfig {
  nombre: string;
  carpetaImport: string;
  connectionString: string;
  /** Esquema de PostgreSQL donde viven las tablas t_s02, t_s04... (p. ej. "public" o "core") */
  schema: string;
  /**
   * Tamaño máximo del Pool de conexiones pg para esta distribuidora.
   * Por defecto 5. Con varias distribuidoras compartiendo el mismo
   * servidor Postgres (mismo max_connections repartido entre todas),
   * un valor conservador por defecto es más seguro que uno alto —
   * mejor subirlo con datos reales de uso que empezar alto y quedarse
   * sin conexiones para el resto de distribuidoras de ese servidor.
   */
  poolMax?: number;
}

/**
 * Mantiene un Pool de PostgreSQL por distribuidora, creado bajo demanda
 * y reutilizado durante toda la vida del proceso. Este mismo Pool lo
 * reutiliza también el listener SOAP (ver soapListenerBootstrap.ts)
 * para la misma base de datos, en vez de abrir uno propio aparte.
 */
export class ConnectionManager {
  private pools = new Map<string, Pool>();

  constructor(private readonly distribuidoras: DistribuidoraConfig[]) {}

  getPool(nombreDistribuidora: string): Pool {
    const existing = this.pools.get(nombreDistribuidora);
    if (existing) return existing;

    const config = this.getConfig(nombreDistribuidora);
    const pool = new Pool({
      connectionString: config.connectionString,
      max: config.poolMax ?? 5,
    });
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