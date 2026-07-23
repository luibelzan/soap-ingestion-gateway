import { existsSync, mkdirSync, readFileSync, renameSync } from 'fs';
import { basename, dirname, join } from 'path';
import { Pool } from 'pg';
import { parseFileName } from './fileNameParser';
import { parserRegistry } from '../parsers/registry';
import { insertProcesamientoLog } from './procesamientoLog';

export type EstadoProcesamiento = 'PROCESADO' | 'VACIO' | 'ERROR' | 'DESCONOCIDO';

export interface ProcessFileResult {
  fileName: string;
  /** Tipo determinado por el nombre de la carpeta contenedora (p.ej. "S44") */
  tipo: string;
  estado: EstadoProcesamiento;
  mensaje?: string;
  filasPrincipales?: number;
  filasError?: number;
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Mueve el fichero a una subcarpeta de control (Procesado/Vacios/Error/
 * Desconocidos) DENTRO de la misma carpeta de tipo en la que llegó, p.ej.:
 *   Import/S44/fichero  ->  Import/S44/Procesado/fichero
 */
function moveToControlFolder(
  filePath: string,
  subfolder: 'Procesado' | 'Vacios' | 'Error' | 'Desconocidos'
): string {
  const tipoDir = dirname(filePath);
  const destDir = join(tipoDir, subfolder);
  ensureDir(destDir);
  const dest = join(destDir, basename(filePath));
  renameSync(filePath, dest);
  return dest;
}

/**
 * Registra el resultado en t_procesamiento_log (tabla transversal usada
 * para métricas/histórico). Un fallo al registrar el log NO debe tumbar
 * el procesado del fichero (que ya ha terminado en este punto), así que
 * se captura y solo se deja constancia por consola.
 */
async function logResultado(pool: Pool, schema: string, result: ProcessFileResult): Promise<void> {
  try {
    await insertProcesamientoLog(pool, schema, {
      nombreFichero: result.fileName,
      tipo: result.tipo,
      resultado: result.estado,
      filasPrincipales: result.filasPrincipales ?? null,
      filasError: result.filasError ?? null,
      mensaje: result.mensaje ?? null,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error registrando en t_procesamiento_log:', err);
  }
}

/**
 * Procesa un único fichero: detecta el tipo por el nombre de la carpeta
 * que lo contiene (no por el nombre del fichero), parsea, inserta en BD,
 * mueve el fichero según el resultado, y deja constancia en
 * t_procesamiento_log (para las estadísticas de la API).
 *
 * Se asume una estructura de carpetas tipo:
 *   <carpetaImport>/S44/<ficheros>
 *   <carpetaImport>/S45/<ficheros>
 *   ...
 * con las subcarpetas de control (Procesado/Vacios/Error/Desconocidos)
 * creadas automáticamente dentro de cada carpeta de tipo.
 */
export async function processFile(
  filePath: string,
  pool: Pool,
  schema: string
): Promise<ProcessFileResult> {
  const fileName = basename(filePath);
  const tipo = basename(dirname(filePath)).toUpperCase();

  let fileNameInfo;
  try {
    fileNameInfo = parseFileName(fileName);
  } catch (err) {
    moveToControlFolder(filePath, 'Error');
    const result: ProcessFileResult = {
      fileName,
      tipo,
      estado: 'ERROR',
      mensaje: `Nombre de fichero con formato inesperado: ${(err as Error).message}`,
    };
    await logResultado(pool, schema, result);
    return result;
  }

  // El tipo del nombre de fichero es solo informativo aquí; el tipo que
  // manda es el de la carpeta. Si no coinciden, se avisa mediante el
  // mensaje de resultado, pero no bloquea el procesado.
  const avisoTipoDistinto =
    fileNameInfo.tipo !== tipo
      ? ` (aviso: el nombre de fichero sugiere tipo "${fileNameInfo.tipo}", distinto de la carpeta "${tipo}")`
      : '';

  const entry = parserRegistry[tipo];

  if (!entry) {
    moveToControlFolder(filePath, 'Desconocidos');
    const result: ProcessFileResult = {
      fileName,
      tipo,
      estado: 'DESCONOCIDO',
      mensaje: `Tipo de fichero "${tipo}" no soportado todavía por el servicio${avisoTipoDistinto}`,
    };
    await logResultado(pool, schema, result);
    return result;
  }

  try {
    const xmlContent = readFileSync(filePath, 'utf-8');
    const data = entry.parser.parse(xmlContent);
    const insertResult = await entry.repository.insert(pool, fileNameInfo, schema, data as never);

    // "Vacío": el fichero se ha parseado e insertado sin errores, pero
    // no contenía ninguna lectura real (ni en la tabla principal ni en
    // la de error).
    const esVacio = insertResult.filasPrincipales === 0 && insertResult.filasError === 0;
    const estadoFinal: EstadoProcesamiento = esVacio ? 'VACIO' : 'PROCESADO';
    const carpetaDestino = esVacio ? 'Vacios' : 'Procesado';

    moveToControlFolder(filePath, carpetaDestino);

    const result: ProcessFileResult = {
      fileName,
      tipo,
      estado: estadoFinal,
      mensaje: avisoTipoDistinto || undefined,
      filasPrincipales: insertResult.filasPrincipales,
      filasError: insertResult.filasError,
    };
    await logResultado(pool, schema, result);
    return result;
  } catch (err) {
    moveToControlFolder(filePath, 'Error');
    const result: ProcessFileResult = {
      fileName,
      tipo,
      estado: 'ERROR',
      mensaje: `${(err as Error).message}${avisoTipoDistinto}`,
    };
    await logResultado(pool, schema, result);
    return result;
  }
}
