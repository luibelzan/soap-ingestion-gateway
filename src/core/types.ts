import { Pool } from 'pg';

/**
 * Resultado del procesado de un fichero: usado para logging/trazabilidad,
 * independientemente del tipo de fichero concreto. No hay id de fichero
 * en base de datos (no existe tabla de cabecera); el nombre de fichero
 * es la referencia y va guardado como columna informativa en las propias
 * tablas de hechos.
 */
export interface ProcessResult {
  tipo: string;
  nombreFichero: string;
  /** Filas insertadas en la tabla principal (p. ej. t_s02) */
  filasPrincipales: number;
  /** Filas insertadas en la tabla de errores (p. ej. t_s02_error) */
  filasError: number;
}

/**
 * Contrato que debe cumplir el parser de cada tipo de fichero (S02, S13, G01...).
 * T es el tipo de dato ya parseado y listo para insertar.
 */
export interface FileParser<T> {
  tipo: string;
  parse(xmlContent: string): T;
}

/**
 * Contrato que debe cumplir el repository de cada tipo de fichero.
 * Recibe el pool de conexión YA resuelto para la distribuidora correspondiente.
 */
export interface FileRepository<T> {
  insert(
    pool: Pool,
    fileNameInfo: { rawFileName: string; cncId: string; fecha: string; hora: string },
    schema: string,
    data: T
  ): Promise<ProcessResult>;
}

/**
 * Entrada del registro de parsers: agrupa parser + repository para un tipo de fichero.
 */
export interface ParserRegistryEntry<T = unknown> {
  parser: FileParser<T>;
  repository: FileRepository<T>;
}
