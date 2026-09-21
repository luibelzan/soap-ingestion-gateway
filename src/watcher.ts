import chokidar from 'chokidar';
import pino from 'pino';
import PQueue from 'p-queue';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import distribuidorasConfig from './config/distribuidoras.json';
import { ConnectionManager, DistribuidoraConfig } from './db/connectionManager';
import { processFile } from './core/fileProcessor';
import { getFtpmanagerPool, getFtpmanagerSchema, closeFtpmanagerPool } from './db/ftpmanagerConnection';
import { insertMasterLog } from './core/masterLog';
import { startSoapListener, stopSoapListener, SoapListenerHandles } from './soapListenerBootstrap';

// Carpeta de logs junto al proyecto (no dentro de dist/, para que
// sobreviva a un `npm run build`)
const LOGS_DIR = join(__dirname, '..', 'logs');
if (!existsSync(LOGS_DIR)) {
  mkdirSync(LOGS_DIR, { recursive: true });
}
const LOG_FILE = join(LOGS_DIR, 'watcher.log');

// Escribe a la vez en consola (formato legible) y en fichero (una
// línea JSON por evento, para poder buscar/filtrar después). El
// fichero de log no rota automáticamente: si esto corre mucho tiempo
// sin reiniciarse, considera añadir rotación (p.ej. con "pino-roll" o
// logrotate a nivel de sistema operativo).
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

// Una cola por distribuidora: procesa los ficheros de una misma
// distribuidora en serie (evita carreras en la misma BD), pero
// distribuidoras distintas se procesan en paralelo entre sí.
const queues = new Map<string, PQueue>();

function getQueue(nombreDistribuidora: string): PQueue {
  let queue = queues.get(nombreDistribuidora);
  if (!queue) {
    queue = new PQueue({ concurrency: 1 });
    queues.set(nombreDistribuidora, queue);
  }
  return queue;
}

for (const dist of distribuidoras) {
  const pool = connectionManager.getPool(dist.nombre);
  const schema = connectionManager.getSchema(dist.nombre);

  const watcher = chokidar.watch(dist.carpetaImport, {
    persistent: true,
    ignoreInitial: false, // procesa también lo que ya hubiera al arrancar el servicio
    depth: 1, // solo <carpetaImport>/<TIPO>/<fichero> — no entra en Procesado/Error/Desconocidos (depth 2)
    awaitWriteFinish: {
      stabilityThreshold: 2000, // espera 2s sin cambios de tamaño antes de procesar (fichero aún copiándose)
      pollInterval: 200,
    },
  });

  watcher.on('add', (filePath) => {
    getQueue(dist.nombre).add(async () => {
      try {
        const result = await processFile(filePath, pool, schema);

        logger.info(
          { distribuidora: dist.nombre, ...result },
          `[${dist.nombre}] ${result.tipo} ${result.fileName}: ${result.estado}`
        );

        // Espejo en la tabla maestra de la BD de ftpmanager (separada
        // de las de las distribuidoras). Un fallo aquí no afecta al
        // resultado ya registrado en t_procesamiento_log.
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
      }
    });
  });

  watcher.on('error', (err) => {
    logger.error({ distribuidora: dist.nombre, err }, `Error en el watcher de ${dist.nombre}`);
  });

  logger.info(`Vigilando ${dist.carpetaImport} para la distribuidora "${dist.nombre}"`);
}

// Arranca el listener SOAP (servidores por instancia, Key Manager
// Workers, endpoint de estadísticas) en el mismo proceso que el
// vigilante de carpetas. No bloquea el arranque del watcher si falla.
let soapListenerHandles: SoapListenerHandles | undefined;

startSoapListener()
  .then((handles) => {
    soapListenerHandles = handles;
    logger.info('SOAP Listener arrancado correctamente junto con el watcher de carpetas');
  })
  .catch((err) => {
    logger.error({ err }, 'Error arrancando el SOAP Listener (el watcher de carpetas sigue funcionando igualmente)');
  });

process.on('SIGINT', async () => {
  logger.info('Cerrando conexiones y deteniendo el servicio...');
  await connectionManager.closeAll();
  await closeFtpmanagerPool();
  if (soapListenerHandles) {
    await stopSoapListener(soapListenerHandles);
  }
  process.exit(0);
});