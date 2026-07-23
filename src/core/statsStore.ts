export interface UltimoProcesado {
  fichero: string;
  tipo: string;
  estado: string;
  fecha: string; // ISO 8601, momento en que se registró (no el Fh del fichero)
}

const ultimoPorDistribuidora = new Map<string, UltimoProcesado>();

export function registrarUltimoProcesado(distribuidora: string, info: UltimoProcesado): void {
  ultimoPorDistribuidora.set(distribuidora, info);
}

export function obtenerUltimoProcesado(distribuidora: string): UltimoProcesado | null {
  return ultimoPorDistribuidora.get(distribuidora) ?? null;
}
