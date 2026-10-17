#!/usr/bin/env node
// Reduce las fotos originales a 2.000 px de ancho como máximo, las comprime y las deja en
// public/wp-content/uploads/ con la misma ruta y el mismo nombre que tenían en WordPress.
//
//   npm run fotos                  todas las fotos de import/media
//   npm run fotos -- --usadas      solo las que usan las vías y páginas (src/content) como portada o en el texto
//   npm run fotos -- --forzar      rehace también las que ya existen
//   npm run fotos -- --origen DIR --destino DIR
//
// Nunca toca las originales. El resultado no lleva metadatos (ni GPS): las coordenadas
// hay que leerlas de las originales antes de publicar fotos nuevas (Fase 5b).
import { mkdir, readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import sharp from 'sharp';

const ANCHO_MAXIMO = 2000;
const CALIDAD_JPEG = 82;
const EN_PARALELO = 4;

const args = process.argv.slice(2);
const opcion = (nombre, porDefecto) => {
  const i = args.indexOf(`--${nombre}`);
  return i >= 0 ? args[i + 1] : porDefecto;
};
const origen = resolve(opcion('origen', 'import/media'));
const destino = resolve(opcion('destino', 'public/wp-content/uploads'));
const soloUsadas = args.includes('--usadas');
const forzar = args.includes('--forzar');

async function listar(dir) {
  const salida = [];
  for (const entrada of await readdir(dir, { withFileTypes: true })) {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) salida.push(...(await listar(ruta)));
    else salida.push(ruta);
  }
  return salida;
}

/** Rutas bajo /wp-content/uploads/ citadas en cualquier archivo de src/content. */
async function rutasUsadas() {
  const usadas = new Set();
  for (const archivo of await listar(resolve('src/content'))) {
    if (!/\.(md|mdx|json)$/.test(archivo)) continue;
    const texto = await readFile(archivo, 'utf8');
    for (const m of texto.matchAll(/\/wp-content\/uploads\/([^\s)"'?]+)/g)) usadas.add(decodeURIComponent(m[1]));
  }
  return usadas;
}

const kb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

if (!existsSync(origen)) {
  console.error(`No existe la carpeta de originales: ${origen}`);
  process.exit(1);
}

const usadas = soloUsadas ? await rutasUsadas() : null;
const todas = (await listar(origen)).filter((f) => !f.endsWith('.DS_Store'));
const pendientes = [];
const omitidasPorTipo = [];
let yaHechas = 0;

for (const archivo of todas) {
  const rel = relative(origen, archivo);
  if (usadas && !usadas.has(rel)) continue;
  const ext = extname(rel).toLowerCase();
  if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
    omitidasPorTipo.push(rel); // GIF animados y otros: se tratan aparte
    continue;
  }
  const salida = join(destino, rel);
  if (!forzar && existsSync(salida)) {
    yaHechas++;
    continue;
  }
  pendientes.push({ rel, archivo, salida, ext });
}

let antes = 0;
let despues = 0;
let hechas = 0;
const fallos = [];

async function procesar({ rel, archivo, salida, ext }) {
  try {
    await mkdir(dirname(salida), { recursive: true });
    // .rotate() aplica la orientación del móvil antes de borrar los metadatos.
    let img = sharp(archivo, { failOn: 'none' }).rotate().resize({ width: ANCHO_MAXIMO, withoutEnlargement: true });
    img = ext === '.png' ? img.png({ compressionLevel: 9, effort: 10 }) : img.jpeg({ quality: CALIDAD_JPEG, mozjpeg: true });
    await img.toFile(salida);
    antes += (await stat(archivo)).size;
    despues += (await stat(salida)).size;
    hechas++;
  } catch (error) {
    fallos.push(`${rel}: ${error.message}`);
  }
}

const cola = [...pendientes];
await Promise.all(
  Array.from({ length: EN_PARALELO }, async () => {
    while (cola.length) await procesar(cola.shift());
  }),
);

console.log(`Fotos reducidas: ${hechas}${antes ? ` (${kb(antes)} → ${kb(despues)})` : ''}`);
if (yaHechas) console.log(`Ya existían y se han dejado como estaban: ${yaHechas} (usa --forzar para rehacerlas)`);
if (omitidasPorTipo.length) console.log(`Omitidas por no ser JPG ni PNG: ${omitidasPorTipo.length} → ${omitidasPorTipo.join(', ')}`);
if (fallos.length) {
  console.error(`\nNo se han podido procesar ${fallos.length}:\n${fallos.join('\n')}`);
  process.exit(1);
}
