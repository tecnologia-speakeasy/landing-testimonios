#!/usr/bin/env node
/**
 * Empaqueta la API (carpeta lambda/) en un .zip listo para subir a la Lambda:
 *
 *   npm run build:lambda
 *
 * Deja lambda/dist/api-landings.zip, con un solo archivo `index.mjs` que trae
 * todo adentro (el código, `pg`, `zod` y la validación de src/lib). En la
 * consola de Lambda: pestaña Code → Upload from → .zip file.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateRawSync } from 'node:zlib';
import { build } from 'esbuild';

const raizProyecto = join(dirname(fileURLToPath(import.meta.url)), '..');
const carpetaSalida = join(raizProyecto, 'lambda', 'dist');
const archivoJs = join(carpetaSalida, 'index.mjs');
const archivoZip = join(carpetaSalida, 'api-landings.zip');

await build({
  entryPoints: [join(raizProyecto, 'lambda', 'index.ts')],
  outfile: archivoJs,
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  // `pg` es CommonJS y usa `require` para los módulos de Node; en un bundle ESM
  // hay que darle uno.
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  // Módulo opcional de `pg` (bindings nativos de libpq) que no se usa.
  external: ['pg-native'],
  logLevel: 'warning',
});

writeFileSync(archivoZip, crearZip([{ nombre: 'index.mjs', contenido: readFileSync(archivoJs) }]));

const kb = (ruta) => `${(readFileSync(ruta).length / 1024).toFixed(0)} KB`;
console.log(`Listo: ${archivoZip} (${kb(archivoZip)}; index.mjs ${kb(archivoJs)})`);

/**
 * Un .zip con los archivos dados, comprimidos con deflate. Node no trae cómo
 * crear .zip y la consola de Lambda solo acepta ese formato; para un par de
 * archivos basta con escribir el formato a mano.
 *
 * Los archivos se marcan con permisos Unix 644: un .zip hecho en Windows sin
 * ellos puede dejar a Lambda sin permiso para leer el código.
 */
function crearZip(archivos) {
  mkdirSync(carpetaSalida, { recursive: true });

  const ahora = new Date();
  const hora = (ahora.getHours() << 11) | (ahora.getMinutes() << 5) | (ahora.getSeconds() >> 1);
  const fecha = ((ahora.getFullYear() - 1980) << 9) | ((ahora.getMonth() + 1) << 5) | ahora.getDate();

  const locales = [];
  const centrales = [];
  let desplazamiento = 0;

  for (const { nombre, contenido } of archivos) {
    const nombreBytes = Buffer.from(nombre, 'utf8');
    const comprimido = deflateRawSync(contenido, { level: 9 });
    const suma = crc32(contenido);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // firma
    local.writeUInt16LE(20, 4); // versión necesaria (2.0)
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(8, 8); // método: deflate
    local.writeUInt16LE(hora, 10);
    local.writeUInt16LE(fecha, 12);
    local.writeUInt32LE(suma, 14);
    local.writeUInt32LE(comprimido.length, 18);
    local.writeUInt32LE(contenido.length, 22);
    local.writeUInt16LE(nombreBytes.length, 26);
    local.writeUInt16LE(0, 28); // largo del campo extra

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); // firma
    central.writeUInt16LE((3 << 8) | 20, 4); // hecho en Unix, versión 2.0
    central.writeUInt16LE(20, 6); // versión necesaria
    central.writeUInt16LE(0, 8); // flags
    central.writeUInt16LE(8, 10); // método: deflate
    central.writeUInt16LE(hora, 12);
    central.writeUInt16LE(fecha, 14);
    central.writeUInt32LE(suma, 16);
    central.writeUInt32LE(comprimido.length, 20);
    central.writeUInt32LE(contenido.length, 24);
    central.writeUInt16LE(nombreBytes.length, 28);
    central.writeUInt16LE(0, 30); // largo del campo extra
    central.writeUInt16LE(0, 32); // largo del comentario
    central.writeUInt16LE(0, 34); // disco
    central.writeUInt16LE(0, 36); // atributos internos
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38); // archivo normal, permisos 644
    central.writeUInt32LE(desplazamiento, 42);

    locales.push(local, nombreBytes, comprimido);
    centrales.push(central, nombreBytes);
    desplazamiento += local.length + nombreBytes.length + comprimido.length;
  }

  const directorio = Buffer.concat(centrales);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0); // firma
  fin.writeUInt16LE(0, 4); // disco
  fin.writeUInt16LE(0, 6); // disco del directorio
  fin.writeUInt16LE(archivos.length, 8);
  fin.writeUInt16LE(archivos.length, 10);
  fin.writeUInt32LE(directorio.length, 12);
  fin.writeUInt32LE(desplazamiento, 16);
  fin.writeUInt16LE(0, 20); // largo del comentario

  return Buffer.concat([...locales, directorio, fin]);
}
