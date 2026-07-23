import { readdirSync, statSync } from 'fs';
import { join } from 'path';

export interface Backlog {
  /** Ficheros sueltos directamente en una carpeta de tipo, aún sin procesar */
  pendientes: number;
  /** Total histórico de ficheros movidos a alguna subcarpeta Error/ */
  totalEnError: number;
  /** Total histórico de ficheros movidos a alguna subcarpeta Desconocidos/ */
  totalDesconocidos: number;
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function countFiles(path: string): number {
  try {
    return readdirSync(path).filter((name) => !isDirectory(join(path, name))).length;
  } catch {
    return 0;
  }
}

/**
 * Recorre <carpetaImport>/<TIPO>/ para cada tipo, contando:
 *   - ficheros sueltos en <TIPO>/ (pendientes de que el watcher los recoja)
 *   - ficheros dentro de <TIPO>/Error/
 *   - ficheros dentro de <TIPO>/Desconocidos/
 * No cuenta lo que hay en Procesado/ (no aporta al backlog).
 */
export function scanBacklog(carpetaImport: string): Backlog {
  const backlog: Backlog = { pendientes: 0, totalEnError: 0, totalDesconocidos: 0 };

  let tipoFolders: string[];
  try {
    tipoFolders = readdirSync(carpetaImport).filter((name) =>
      isDirectory(join(carpetaImport, name))
    );
  } catch {
    return backlog;
  }

  for (const tipoFolder of tipoFolders) {
    const tipoPath = join(carpetaImport, tipoFolder);

    backlog.pendientes += countFiles(tipoPath);
    backlog.totalEnError += countFiles(join(tipoPath, 'Error'));
    backlog.totalDesconocidos += countFiles(join(tipoPath, 'Desconocidos'));
  }

  return backlog;
}
