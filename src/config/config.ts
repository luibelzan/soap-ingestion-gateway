import dotenv from 'dotenv';

dotenv.config();

export interface InstanceConfig {
  port: number;
  database: string;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  schema: string;
}

export interface AppConfig {
  database: DatabaseConfig;
  instances: InstanceConfig[];
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue!;
}

function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value ? parseInt(value, 10) : defaultValue!;
}

function loadInstances(): InstanceConfig[] {
  const instancesCount = getEnvNumber('INSTANCES_COUNT', 12);
  const instances: InstanceConfig[] = [];

  for (let i = 1; i <= instancesCount; i++) {
    const portKey = `INSTANCE_${i}_PORT`;
    const databaseKey = `INSTANCE_${i}_DATABASE`;

    const port = process.env[portKey];
    const database = process.env[databaseKey];

    if (port && database) {
      instances.push({
        port: parseInt(port, 10),
        database,
      });
    }
  }

  if (instances.length === 0) {
    throw new Error('No instances configured. Please check your .env file.');
  }

  return instances;
}

export function loadConfig(): AppConfig {
  return {
    database: {
      host: getEnvVar('DB_HOST'),
      port: getEnvNumber('DB_PORT', 5432),
      username: getEnvVar('DB_USERNAME'),
      password: getEnvVar('DB_PASSWORD'),
      schema: getEnvVar('DB_SCHEMA', 'core'),
    },
    instances: loadInstances(),
  };
}

export const config = loadConfig();
