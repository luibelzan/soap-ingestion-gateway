/**
 * Script de prueba manual: procesa UN fichero de principio a fin
 * (tipo por carpeta contenedora -> parsea -> inserta -> mueve a
 * Procesado/Error/Desconocidos), igual que hace el watcher real
 * (src/watcher.ts), pero para un solo fichero indicado a mano.
 *
 * Uso:
 *   npx ts-node src/tryIt.ts <ruta-al-fichero> <connection-string-postgres> [schema]
 *
 * El fichero debe estar dentro de una carpeta con el nombre del tipo,
 * p.ej.: .../Import/S44/SAG..._S44_..._20260710060000
 *
 * El esquema es opcional; si no se indica, se usa "public".
 */
import { Pool } from 'pg';
import { processFile } from './core/fileProcessor';

async function main() {
  const [, , filePath, connectionString, schemaArg] = process.argv;
  const schema = schemaArg ?? 'public';

  if (!filePath || !connectionString) {
    console.error(
      'Uso: npx ts-node src/tryIt.ts <ruta-al-fichero> <connection-string-postgres> [schema]'
    );
    process.exit(1);
  }

  console.log(`Esquema: ${schema}`);

  const pool = new Pool({ connectionString });

  try {
    const result = await processFile(filePath, pool, schema);
    console.log('Resultado:', result);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Error procesando el fichero:', err);
  process.exit(1);
});
