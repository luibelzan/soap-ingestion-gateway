import { promises as fs, existsSync, mkdirSync } from 'fs';
import { basename, dirname, join } from 'path';
import { Pool } from 'pg';
import { parseFileName } from './fileNameParser';
import { parserRegistry } from '../parsers/registry';
import { insertProcesamientoLog } from './procesamientoLog';
import pino from 'pino';
import { monitorEventLoopDelay } from 'node:perf_hooks';

const eventLoopMonitor = monitorEventLoopDelay({
  resolution: 20,
});

eventLoopMonitor.enable();

export type EstadoProcesamiento =
  | 'PROCESADO'
  | 'VACIO'
  | 'ERROR'
  | 'DESCONOCIDO';

export interface DuracionProcesamiento {
  lecturaMs: number;
  parseoMs: number;
  insercionMs: number;
  movimientoMs: number;
  totalMs: number;
}

export interface ProcessFileResult {
  fileName: string;
  /** Tipo determinado por el nombre de la carpeta contenedora (p.ej. "S44") */
  tipo: string;
  estado: EstadoProcesamiento;
  mensaje?: string;
  filasPrincipales?: number;
  filasError?: number;
  duracion: DuracionProcesamiento;
}

// -----------------------------------------------------------------------------
// LOGS
// -----------------------------------------------------------------------------

// Carpeta de logs junto al proyecto (no dentro de dist/, para que
// sobreviva a un `npm run build`)
const LOGS_DIR = join(__dirname, '..', 'logs');

if (!existsSync(LOGS_DIR)) {
  mkdirSync(LOGS_DIR, { recursive: true });
}

const LOG_FILE = join(LOGS_DIR, 'watcher.log');

const logger = pino(
  pino.transport({
    targets: [
      {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
        },
        level: 'info',
      },
      {
        target: 'pino/file',
        options: {
          destination: LOG_FILE,
          mkdir: true,
          append: true,
        },
        level: 'info',
      },
    ],
  })
);

// -----------------------------------------------------------------------------
// CACHE DE CARPETAS
// -----------------------------------------------------------------------------

// Cache en memoria de carpetas de control (Procesado/Vacios/Error/
// Desconocidos) que ya sabemos que existen.
const carpetasVerificadas = new Set<string>();

async function ensureDir(dir: string): Promise<void> {
  if (carpetasVerificadas.has(dir)) {
    return;
  }

  if (!existsSync(dir)) {
    await fs.mkdir(dir, { recursive: true });
  }

  carpetasVerificadas.add(dir);
}

// -----------------------------------------------------------------------------
// MOVIMIENTO DE FICHEROS
// -----------------------------------------------------------------------------

/**
 * Mueve el fichero a una subcarpeta de control (Procesado/Vacios/Error/
 * Desconocidos) dentro de la misma carpeta de tipo en la que llegó.
 */
async function moveToControlFolder(
  filePath: string,
  subfolder: 'Procesado' | 'Vacios' | 'Error' | 'Desconocidos'
): Promise<string> {
  const tipoDir = dirname(filePath);
  const destDir = join(tipoDir, subfolder);

  await ensureDir(destDir);

  const dest = join(destDir, basename(filePath));

  await fs.rename(filePath, dest);

  return dest;
}

// -----------------------------------------------------------------------------
// LOG DE RESULTADO
// -----------------------------------------------------------------------------

/**
 * Registra el resultado en t_procesamiento_log.
 *
 * Un fallo al registrar el log NO debe tumbar el procesado del fichero.
 */
async function logResultado(
  pool: Pool,
  schema: string,
  result: ProcessFileResult
): Promise<void> {
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
    console.error(
      'Error registrando en t_procesamiento_log:',
      err
    );
  }
}

// -----------------------------------------------------------------------------
// PROCESS FILE
// -----------------------------------------------------------------------------

/**
 * Procesa un único fichero:
 *
 * 1. Detecta el tipo por la carpeta.
 * 2. Valida el nombre.
 * 3. Lee el fichero.
 * 4. Decodifica UTF-8.
 * 5. Parsea.
 * 6. Inserta en BD.
 * 7. Mueve el fichero.
 * 8. Registra el resultado.
 *
 * Todas las operaciones de fichero son asíncronas.
 *
 * La lectura está instrumentada para poder diferenciar:
 *
 *   statMs
 *       Tiempo necesario para obtener los metadatos del fichero.
 *
 *   lecturaMs
 *       Tiempo necesario para fs.readFile().
 *
 *   sizeBytes
 *       Tamaño real del fichero.
 *
 *   lecturaMBps
 *       Velocidad efectiva de lectura.
 *
 *   eventLoopMaxMs / eventLoopP99Ms
 *       Indicadores de posible bloqueo del event loop.
 */
export async function processFile(
  filePath: string,
  pool: Pool,
  schema: string
): Promise<ProcessFileResult> {
  const inicioTotal = Date.now();

  const fileName = basename(filePath);
  const tipo = basename(dirname(filePath)).toUpperCase();

  let fileNameInfo;

  // ---------------------------------------------------------------------------
  // PARSE DEL NOMBRE
  // ---------------------------------------------------------------------------

  try {
    fileNameInfo = parseFileName(fileName);
  } catch (err) {
    const inicioMovimiento = Date.now();

    await moveToControlFolder(filePath, 'Error');

    const movimientoMs = Date.now() - inicioMovimiento;

    const result: ProcessFileResult = {
      fileName,
      tipo,
      estado: 'ERROR',
      mensaje: `Nombre de fichero con formato inesperado: ${
        (err as Error).message
      }`,
      duracion: {
        lecturaMs: 0,
        parseoMs: 0,
        insercionMs: 0,
        movimientoMs,
        totalMs: Date.now() - inicioTotal,
      },
    };

    await logResultado(pool, schema, result);

    return result;
  }

  // ---------------------------------------------------------------------------
  // COMPROBACIÓN DEL TIPO
  // ---------------------------------------------------------------------------

  // El tipo del nombre de fichero es solo informativo aquí; el tipo que
  // manda es el de la carpeta.
  const avisoTipoDistinto =
    fileNameInfo.tipo !== tipo
      ? ` (aviso: el nombre de fichero sugiere tipo "${fileNameInfo.tipo}", distinto de la carpeta "${tipo}")`
      : '';

  const entry = parserRegistry[tipo];

  if (!entry) {
    const inicioMovimiento = Date.now();

    await moveToControlFolder(
      filePath,
      'Desconocidos'
    );

    const movimientoMs = Date.now() - inicioMovimiento;

    const result: ProcessFileResult = {
      fileName,
      tipo,
      estado: 'DESCONOCIDO',
      mensaje:
        `Tipo de fichero "${tipo}" no soportado todavía por el servicio` +
        avisoTipoDistinto,
      duracion: {
        lecturaMs: 0,
        parseoMs: 0,
        insercionMs: 0,
        movimientoMs,
        totalMs: Date.now() - inicioTotal,
      },
    };

    await logResultado(pool, schema, result);

    return result;
  }

  // ---------------------------------------------------------------------------
  // PROCESAMIENTO
  // ---------------------------------------------------------------------------

  try {
    // -------------------------------------------------------------------------
    // STAT
    // -------------------------------------------------------------------------

    const inicioStat = Date.now();

    const stat = await fs.stat(filePath);

    const statMs = Date.now() - inicioStat;

    const sizeBytes = stat.size;
    const sizeMB = sizeBytes / 1024 / 1024;

    // -------------------------------------------------------------------------
    // LECTURA
    // -------------------------------------------------------------------------

    const readId = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const lecturaInicio = new Date();

    const inicioLectura = Date.now();

    const buffer = await fs.readFile(filePath);

    const lecturaMs = Date.now() - inicioLectura;

    const lecturaFin = new Date();

    // Velocidad efectiva de lectura.
    //
    // No representa necesariamente la velocidad física del disco:
    // fs.readFile() puede estar esperando al sistema operativo,
    // almacenamiento, caché, antivirus, etc.
    const lecturaMBps =
      lecturaMs > 0
        ? sizeMB / (lecturaMs / 1000)
        : 0;

    // -------------------------------------------------------------------------
    // MÉTRICAS DEL EVENT LOOP
    // -------------------------------------------------------------------------

    const eventLoopMaxMs =
      eventLoopMonitor.max / 1e6;

    const eventLoopP99Ms =
      eventLoopMonitor.percentile(99) / 1e6;

    // Reiniciamos después de medir la lectura para que las métricas
    // posteriores no contaminen el siguiente fichero.
    eventLoopMonitor.reset();

    // -------------------------------------------------------------------------
    // LOG DE DIAGNÓSTICO
    // -------------------------------------------------------------------------

    logger.info(
      {
        readId,
        filePath,
        fileName,
        tipo,

        // Información del fichero
        sizeBytes,
        sizeMB: Number(sizeMB.toFixed(2)),

        // Timing del filesystem
        statMs,
        lecturaMs,

        // Velocidad efectiva
        lecturaMBps: Number(
          lecturaMBps.toFixed(2)
        ),

        // Timestamps para correlacionar con otros procesos
        lecturaInicio: lecturaInicio.toISOString(),
        lecturaFin: lecturaFin.toISOString(),

        // Event loop
        eventLoopMaxMs: Number(
          eventLoopMaxMs.toFixed(2)
        ),
        eventLoopP99Ms: Number(
          eventLoopP99Ms.toFixed(2)
        ),
      },
      'Lectura de fichero'
    );

    // -------------------------------------------------------------------------
    // DECODE UTF-8
    // -------------------------------------------------------------------------

    const inicioDecode = Date.now();

    const xmlContent = buffer.toString('utf8');

    const decodeMs = Date.now() - inicioDecode;

    logger.debug(
      {
        readId,
        filePath,
        decodeMs,
      },
      'Decode UTF-8'
    );

    // -------------------------------------------------------------------------
    // PARSEO
    // -------------------------------------------------------------------------

    const inicioParseo = Date.now();

    const data = entry.parser.parse(xmlContent);

    const parseoMs = Date.now() - inicioParseo;

    // -------------------------------------------------------------------------
    // INSERCIÓN
    // -------------------------------------------------------------------------

    const inicioInsercion = Date.now();

    const insertResult = await entry.repository.insert(
      pool,
      fileNameInfo,
      schema,
      data as never
    );

    const insercionMs = Date.now() - inicioInsercion;

    // -------------------------------------------------------------------------
    // RESULTADO
    // -------------------------------------------------------------------------

    // "Vacío": el fichero se ha parseado e insertado sin errores,
    // pero no contenía ninguna lectura real.
    const esVacio =
      insertResult.filasPrincipales === 0 &&
      insertResult.filasError === 0;

    const estadoFinal: EstadoProcesamiento =
      esVacio
        ? 'VACIO'
        : 'PROCESADO';

    const carpetaDestino =
      esVacio
        ? 'Vacios'
        : 'Procesado';

    // -------------------------------------------------------------------------
    // MOVIMIENTO
    // -------------------------------------------------------------------------

    const inicioMovimiento = Date.now();

    await moveToControlFolder(
      filePath,
      carpetaDestino
    );

    const movimientoMs =
      Date.now() - inicioMovimiento;

    // -------------------------------------------------------------------------
    // RESULTADO FINAL
    // -------------------------------------------------------------------------

    const result: ProcessFileResult = {
      fileName,
      tipo,
      estado: estadoFinal,
      mensaje:
        avisoTipoDistinto || undefined,
      filasPrincipales:
        insertResult.filasPrincipales,
      filasError:
        insertResult.filasError,
      duracion: {
        lecturaMs,
        parseoMs,
        insercionMs,
        movimientoMs,
        totalMs:
          Date.now() - inicioTotal,
      },
    };

    await logResultado(
      pool,
      schema,
      result
    );

    return result;
  } catch (err) {
    // -------------------------------------------------------------------------
    // ERROR
    // -------------------------------------------------------------------------

    const inicioMovimiento = Date.now();

    await moveToControlFolder(
      filePath,
      'Error'
    );

    const movimientoMs =
      Date.now() - inicioMovimiento;

    const result: ProcessFileResult = {
      fileName,
      tipo,
      estado: 'ERROR',
      mensaje:
        `${(err as Error).message}${avisoTipoDistinto}`,
      duracion: {
        lecturaMs: 0,
        parseoMs: 0,
        insercionMs: 0,
        movimientoMs,
        totalMs:
          Date.now() - inicioTotal,
      },
    };

    await logResultado(
      pool,
      schema,
      result
    );

    return result;
  }
}
