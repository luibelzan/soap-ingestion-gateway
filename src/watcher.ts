import pino from 'pino';
import PQueue from 'p-queue';
import { existsSync, mkdirSync } from 'fs';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import distribuidorasConfig from './config/distribuidoras.json';
import { ConnectionManager, DistribuidoraConfig } from './db/connectionManager';
import { processFile } from './core/fileProcessor';
import { getFtpmanagerPool, getFtpmanagerSchema, closeFtpmanagerPool } from './db/ftpmanagerConnection';
import { insertMasterLog } from './core/masterLog';
import { startSoapListener, stopSoapListener, SoapListenerHandles } from './soapListenerBootstrap';
import { calcularIndicesLectura } from './core/readingIndexScheduler';
import type { OpcionesRecalculoReadingIndex } from './core/readingIndex';

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
        options: { colorize: true, translateTime: 'SYS:standard' },
        level: 'info',
      },
      {
        target: 'pino/file',
        options: { destination: LOG_FILE, mkdir: true, append: true },
        level: 'info',
      },
    ],
  })
);

logger.info(`Log también disponible en: ${LOG_FILE}`);

const distribuidoras = distribuidorasConfig as DistribuidoraConfig[];
const connectionManager = new ConnectionManager(distribuidoras);
const ftpmanagerPool = getFtpmanagerPool();
const ftpmanagerSchema = getFtpmanagerSchema();

// -----------------------------------------------------------------------------
// CONFIGURACIÓN
// -----------------------------------------------------------------------------

const CONCURRENCIA_POR_DISTRIBUIDORA = Number(process.env.WATCHER_CONCURRENCY_POR_DISTRIBUIDORA) || 5;

// Cada cuánto se revisan las carpetas de Import en busca de ficheros
const INTERVALO_ESCANEO_MS = Number(process.env.WATCHER_SCAN_INTERVAL_MS) || 3000;

// Un fichero se considera terminado de escribir si su mtime tiene al
// menos esta antigüedad (sustituye al awaitWriteFinish de chokidar)
const ANTIGUEDAD_MINIMA_MS = Number(process.env.WATCHER_ANTIGUEDAD_MINIMA_MS) || 2000;

// Máximo de tareas pendientes por distribuidora; el resto espera en
// disco hasta que haya hueco en la cola
const MAX_EN_COLA = Number(process.env.WATCHER_MAX_EN_COLA) || 100;

const CARPETAS_CONTROL = new Set(['Procesado', 'Vacios', 'Error', 'Desconocidos']);

// Índices de lectura: se calculan cuando una distribuidora se queda
// sin ficheros que procesar y ha habido cambios desde el último cálculo.
const OPCIONES_INDICES: OpcionesRecalculoReadingIndex = {
  diasS02: 60,
  mesesS04: 2,
  diasS05: 35,
  zonaHoraria: 'Europe/Madrid',
};

// Separación mínima entre dos cálculos de la misma distribuidora, para
// no recalcular tras cada fichero cuando llegan de uno en uno.
// 0 = recalcular siempre que se vacíe.
const INDICES_INTERVALO_MIN_MS = Number(process.env.INDICES_INTERVALO_MIN_MS ?? 60_000);

// Si llegan ficheros sin parar y la distribuidora nunca se vacía, se
// fuerza un cálculo como mucho cada este tiempo.
const INDICES_ESPERA_MAX_MS = Number(process.env.INDICES_ESPERA_MAX_MS) || 30 * 60_000;

// -----------------------------------------------------------------------------
// COLAS
// -----------------------------------------------------------------------------

const queues = new Map<string, PQueue>();

function getQueue(nombreDistribuidora: string): PQueue {
  let queue = queues.get(nombreDistribuidora);
  if (!queue) {
    queue = new PQueue({ concurrency: CONCURRENCIA_POR_DISTRIBUIDORA });
    queues.set(nombreDistribuidora, queue);
  }
  return queue;
}

// Rutas encoladas o en proceso, para no encolarlas dos veces entre
// escaneos consecutivos
const enCurso = new Set<string>();

// -----------------------------------------------------------------------------
// ESTADO DE LOS ÍNDICES DE LECTURA
// -----------------------------------------------------------------------------

interface EstadoIndices {
  /** Hay datos nuevos desde el último cálculo */
  pendiente: boolean;
  /** Momento del primer cambio aún no reflejado en los índices */
  primerCambioSinCalcular: number | null;
  /** Momento en que terminó el último cálculo */
  ultimoCalculo: number;
  /** Cálculo en marcha, si lo hay */
  enMarcha?: Promise<void>;
}

const estadoIndices = new Map<string, EstadoIndices>();

function getEstadoIndices(nombreDistribuidora: string): EstadoIndices {
  let estado = estadoIndices.get(nombreDistribuidora);
  if (!estado) {
    // Se arranca como "pendiente" para que, tras un reinicio, se
    // recalcule en cuanto la distribuidora quede vacía (por si el
    // proceso anterior se detuvo antes de calcular).
    estado = { pendiente: true, primerCambioSinCalcular: Date.now(), ultimoCalculo: 0 };
    estadoIndices.set(nombreDistribuidora, estado);
  }
  return estado;
}

function marcarIndicesPendientes(nombreDistribuidora: string): void {
  const estado = getEstadoIndices(nombreDistribuidora);
  estado.pendiente = true;
  if (estado.primerCambioSinCalcular === null) {
    estado.primerCambioSinCalcular = Date.now();
  }
}

function lanzarCalculoIndices(dist: DistribuidoraConfig, motivo: string): void {
  const estado = getEstadoIndices(dist.nombre);

  // Se limpia ANTES de empezar: si durante el cálculo se procesan
  // ficheros nuevos, volverán a marcarlo y se recalculará después.
  estado.pendiente = false;
  estado.primerCambioSinCalcular = null;

  logger.info(`[${dist.nombre}] Calculando índices de lectura (${motivo})...`);

  estado.enMarcha = (async () => {
    try {
      // Ya registra en el log la duración por tipo y las filas
      await calcularIndicesLectura(connectionManager, dist, logger, OPCIONES_INDICES);
    } catch (err) {
      logger.error({ distribuidora: dist.nombre, err }, `[${dist.nombre}] Error calculando índices de lectura`);
      // Se reintentará cuando se cumpla el intervalo mínimo
      marcarIndicesPendientes(dist.nombre);
    } finally {
      estado.ultimoCalculo = Date.now();
      estado.enMarcha = undefined;
    }
  })();
}

/**
 * Decide si toca calcular los índices de una distribuidora.
 * `todoProcesado` indica que no queda nada en Import ni en la cola.
 */
function comprobarIndices(dist: DistribuidoraConfig, todoProcesado: boolean): void {
  const estado = getEstadoIndices(dist.nombre);
  if (detenido || !estado.pendiente || estado.enMarcha) return;

  const ahora = Date.now();
  const forzar =
    estado.primerCambioSinCalcular !== null &&
    ahora - estado.primerCambioSinCalcular >= INDICES_ESPERA_MAX_MS;

  if (forzar) {
    lanzarCalculoIndices(dist, `llevan más de ${Math.round(INDICES_ESPERA_MAX_MS / 60_000)} min sin calcularse`);
    return;
  }

  if (!todoProcesado) return;
  if (ahora - estado.ultimoCalculo < INDICES_INTERVALO_MIN_MS) return;

  lanzarCalculoIndices(dist, 'no quedan ficheros pendientes');
}

// -----------------------------------------------------------------------------
// INSTRUMENTACIÓN
// -----------------------------------------------------------------------------

// Registra memoria y estado de las colas cada 5 segundos. Quítalo
// cuando ya no haga falta diagnosticar.
const INTERVALO_MEMORIA_MS = 5000;
setInterval(() => {
  const mem = process.memoryUsage();
  const colas = [...queues.entries()].map(([nombre, q]) => ({
    distribuidora: nombre,
    pendientes: q.size,
    enProceso: q.pending,
    indicesPendientes: estadoIndices.get(nombre)?.pendiente ?? false,
    calculandoIndices: Boolean(estadoIndices.get(nombre)?.enMarcha),
  }));
  logger.info(
    {
      memoria: {
        rssMB: Math.round(mem.rss / 1024 / 1024),
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
        externalMB: Math.round(mem.external / 1024 / 1024),
      },
      colas,
    },
    `Memoria: RSS=${Math.round(mem.rss / 1024 / 1024)}MB, heap=${Math.round(mem.heapUsed / 1024 / 1024)}/${Math.round(mem.heapTotal / 1024 / 1024)}MB`
  );
}, INTERVALO_MEMORIA_MS).unref();

// -----------------------------------------------------------------------------
// ENCOLADO Y PROCESADO
// -----------------------------------------------------------------------------

function encolarFichero(dist: DistribuidoraConfig, filePath: string): void {
  const pool = connectionManager.getPool(dist.nombre);
  const schema = connectionManager.getSchema(dist.nombre);

  enCurso.add(filePath);

  void getQueue(dist.nombre).add(async () => {
    try {
      const result = await processFile(filePath, pool, schema);

      // Solo los ficheros que han insertado datos afectan a los índices
      if (result.estado === 'PROCESADO') {
        marcarIndicesPendientes(dist.nombre);
      }

      logger.info(
        { distribuidora: dist.nombre, ...result },
        `[${dist.nombre}] ${result.tipo} ${result.fileName}: ${result.estado} (${result.duracion.totalMs}ms)`
      );

      try {
        await insertMasterLog(ftpmanagerPool, ftpmanagerSchema, {
          distribuidora: dist.nombre,
          nombreFichero: result.fileName,
          tipo: result.tipo,
          resultado: result.estado,
          filasPrincipales: result.filasPrincipales ?? null,
          filasError: result.filasError ?? null,
          mensaje: result.mensaje ?? null,
        });
      } catch (err) {
        logger.error(
          { distribuidora: dist.nombre, err },
          `[${dist.nombre}] Error escribiendo en la tabla maestra stats_resumen_cache`
        );
      }
    } catch (err) {
      logger.error(
        { distribuidora: dist.nombre, filePath, err },
        `[${dist.nombre}] Error inesperado procesando ${filePath}`
      );
    } finally {
      enCurso.delete(filePath);
    }
  });
}

// -----------------------------------------------------------------------------
// ESCÁNER PERIÓDICO (sustituye a chokidar y al backlog inicial)
// -----------------------------------------------------------------------------

let detenido = false;
const temporizadores = new Map<string, NodeJS.Timeout>();

interface ResultadoEscaneo {
  encolados: number;
  /** true si en Import no queda ningún fichero sin encolar (ni siquiera a medio escribir) */
  importVacio: boolean;
}

/**
 * Recorre las carpetas de tipo de la distribuidora y encola ficheros
 * hasta llenar el hueco disponible en su cola. El primer escaneo
 * recoge el backlog; los siguientes, los ficheros que vayan llegando.
 */
async function escanearDistribuidora(dist: DistribuidoraConfig): Promise<ResultadoEscaneo> {
  const queue = getQueue(dist.nombre);
  let hueco = MAX_EN_COLA - queue.size;
  if (hueco <= 0) return { encolados: 0, importVacio: false };

  const tipoFolders = (await readdir(dist.carpetaImport, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && !CARPETAS_CONTROL.has(entry.name))
    .map((entry) => entry.name);

  const ahora = Date.now();
  let encolados = 0;
  let enEspera = 0;

  for (const tipoFolder of tipoFolders) {
    const tipoPath = join(dist.carpetaImport, tipoFolder);

    let entradas;
    try {
      entradas = await readdir(tipoPath, { withFileTypes: true });
    } catch (err) {
      logger.error({ distribuidora: dist.nombre, err }, `[${dist.nombre}] Error listando ${tipoPath}`);
      // No sabemos qué hay dentro: mejor no dar Import por vacío
      enEspera++;
      continue;
    }

    for (const entrada of entradas) {
      if (!entrada.isFile()) continue;

      const filePath = join(tipoPath, entrada.name);
      if (enCurso.has(filePath)) continue;

      // Queda al menos un fichero sin encolar: Import no está vacío.
      // Si se ha pedido parar o la cola está llena, se sale aquí; el
      // resto se recogerá en el próximo escaneo.
      if (detenido || hueco <= 0) return { encolados, importVacio: false };

      let st;
      try {
        st = await stat(filePath);
      } catch {
        continue; // movido o borrado entre el readdir y el stat
      }

      // Posiblemente aún escribiéndose; se reintentará en el próximo escaneo
      if (ahora - st.mtimeMs < ANTIGUEDAD_MINIMA_MS) {
        enEspera++;
        continue;
      }

      encolarFichero(dist, filePath);
      hueco--;
      encolados++;
    }
  }

  return { encolados, importVacio: encolados === 0 && enEspera === 0 };
}

function iniciarEscaner(dist: DistribuidoraConfig): void {
  const ciclo = async (): Promise<void> => {
    if (detenido) return;

    try {
      const { encolados, importVacio } = await escanearDistribuidora(dist);
      if (encolados > 0) {
        logger.debug(`[${dist.nombre}] Escaneo: ${encolados} ficheros encolados`);
      }

      const queue = getQueue(dist.nombre);
      const colaVacia = queue.size === 0 && queue.pending === 0;
      comprobarIndices(dist, importVacio && colaVacia);
    } catch (err) {
      logger.error({ distribuidora: dist.nombre, err }, `[${dist.nombre}] Error en el escaneo de ${dist.carpetaImport}`);
    }

    if (!detenido) {
      temporizadores.set(dist.nombre, setTimeout(ciclo, INTERVALO_ESCANEO_MS));
    }
  };

  void ciclo();

  logger.info(
    `Escaneando ${dist.carpetaImport} cada ${INTERVALO_ESCANEO_MS}ms para la distribuidora "${dist.nombre}" ` +
      `(concurrencia: ${CONCURRENCIA_POR_DISTRIBUIDORA}, máx. en cola: ${MAX_EN_COLA})`
  );
}

for (const dist of distribuidoras) {
  iniciarEscaner(dist);
}

// -----------------------------------------------------------------------------
// SOAP LISTENER
// -----------------------------------------------------------------------------

let soapListenerHandles: SoapListenerHandles | undefined;

startSoapListener(connectionManager)
  .then((handles) => {
    soapListenerHandles = handles;
    logger.info('SOAP Listener arrancado correctamente junto con el watcher de carpetas');
  })
  .catch((err) => {
    logger.error({ err }, 'Error arrancando el SOAP Listener (el watcher de carpetas sigue funcionando igualmente)');
  });

// -----------------------------------------------------------------------------
// APAGADO ORDENADO
// -----------------------------------------------------------------------------

// Deja de escanear, DESCARTA lo pendiente en cola (sigue en Import y se
// recogerá en el próximo arranque), espera a que terminen los ficheros
// y cálculos de índices en marcha, y solo entonces cierra los Pools.
process.on('SIGINT', async () => {
  logger.info('Deteniendo: dejando de escanear y esperando a que terminen los ficheros en curso...');

  detenido = true;
  for (const t of temporizadores.values()) {
    clearTimeout(t);
  }

  for (const queue of queues.values()) {
    queue.pause();
    queue.clear();
  }

  await Promise.all([...queues.values()].map((q) => q.onIdle()));

  const calculosEnMarcha = [...estadoIndices.values()]
    .map((e) => e.enMarcha)
    .filter((p): p is Promise<void> => p !== undefined);
  if (calculosEnMarcha.length > 0) {
    logger.info(`Esperando a que terminen ${calculosEnMarcha.length} cálculos de índices en marcha...`);
    await Promise.all(calculosEnMarcha);
  }

  logger.info('Cerrando conexiones y deteniendo el servicio...');
  if (soapListenerHandles) {
    await stopSoapListener(soapListenerHandles);
  }
  await connectionManager.closeAll();
  await closeFtpmanagerPool();
  process.exit(0);
});