import { promises as fs } from 'fs';

const filePath =
  'C:\\GD\\Distribuidoras\\Demo\\Import\\S02\\CIR4622404095_0_S02_0_20260817033055';

async function main() {
  console.log('Fichero:', filePath);

  for (let i = 1; i <= 200; i++) {
    const statStart = performance.now();

    const stat = await fs.stat(filePath);

    const statEnd = performance.now();

    const readStart = performance.now();

    const buffer = await fs.readFile(filePath);

    const readEnd = performance.now();

    console.log({
      intento: i,
      sizeKB: Number((buffer.length / 1024).toFixed(2)),
      statMs: Number((statEnd - statStart).toFixed(2)),
      readMs: Number((readEnd - readStart).toFixed(2)),
      totalMs: Number((readEnd - statStart).toFixed(2)),
    });
  }
}

main().catch(console.error);