/**
 * Crea automáticamente una subcarpeta por cada tipo de fichero
 * soportado (S02, S04, G01...) dentro de la carpeta de importación de
 * una distribuidora. Útil para preparar el entorno de pruebas sin
 * tener que crear ~35 carpetas a mano.
 *
 * Uso:
 *   npx ts-node src/scripts/setupFolders.ts <nombre-distribuidora>
 *
 * Ejemplo:
 *   npx ts-node src/scripts/setupFolders.ts Demo
 *
 * Lee la carpeta de importación desde config/distribuidoras.json.
 */
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import distribuidorasConfig from '../config/distribuidoras.json';
import { parserRegistry } from '../parsers/registry';
import { DistribuidoraConfig } from '../db/connectionManager';

function main() {
  const [, , nombreDistribuidora] = process.argv;

  if (!nombreDistribuidora) {
    console.error('Uso: npx ts-node src/scripts/setupFolders.ts <nombre-distribuidora>');
    process.exit(1);
  }

  const distribuidoras = distribuidorasConfig as DistribuidoraConfig[];
  const dist = distribuidoras.find((d) => d.nombre === nombreDistribuidora);

  if (!dist) {
    console.error(
      `No se encontró la distribuidora "${nombreDistribuidora}" en config/distribuidoras.json`
    );
    process.exit(1);
  }

  const tipos = Object.keys(parserRegistry).sort();

  console.log(`Creando ${tipos.length} subcarpetas en: ${dist.carpetaImport}`);

  if (!existsSync(dist.carpetaImport)) {
    mkdirSync(dist.carpetaImport, { recursive: true });
    console.log(`  (creada la propia carpeta de importación, no existía)`);
  }

  for (const tipo of tipos) {
    const tipoDir = join(dist.carpetaImport, tipo);
    if (existsSync(tipoDir)) {
      console.log(`  ${tipo}: ya existía`);
    } else {
      mkdirSync(tipoDir, { recursive: true });
      console.log(`  ${tipo}: creada`);
    }
  }

  console.log('Listo.');
}

main();
