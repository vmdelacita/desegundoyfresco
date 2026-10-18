#!/usr/bin/env node
// Comprueba que las direcciones de la web antigua (WordPress) existen en la web nueva ya compilada.
//
//   npm run build && npm run comprobar-urls
//   npm run comprobar-urls -- --dist OTRA_CARPETA     otra carpeta compilada
//   npm run comprobar-urls -- --xml RUTA              otro archivo de exportación
//
// Mira, en dist/: las entradas y páginas publicadas, sus direcciones antiguas (_wp_old_slug), las categorías,
// etiquetas y autores que usan, y las fotos de la biblioteca que sus textos usan. Termina con error si falta
// algo que no se descartó a propósito. Nunca toca import/.
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { XMLParser } from 'fast-xml-parser';

const args = process.argv.slice(2);
const opcion = (nombre) => {
  const i = args.indexOf(`--${nombre}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const RAIZ = process.cwd();
const DIST = join(RAIZ, opcion('dist') ?? 'dist');
if (!existsSync(join(DIST, 'index.html'))) {
  console.error(`No encuentro la web compilada en ${DIST}. Ejecuta antes «npm run build».`);
  process.exit(2);
}

// Decisiones tomadas en la Fase 4 (CLAUDE.md, «Decisiones ya tomadas»): estas etiquetas no se migran.
const ETIQUETAS_FUERA = new Set(['victor', 'destacado', 'destacada', 'via-larga']);

async function encontrarXml() {
  const buscar = async (dir) => {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const ruta = join(dir, e.name);
      if (e.isDirectory()) {
        const dentro = await buscar(ruta);
        if (dentro) return dentro;
      } else if (e.name.endsWith('.xml')) return ruta;
    }
  };
  const base = join(RAIZ, 'import', 'wordpress-export');
  const xml = opcion('xml') ?? (existsSync(base) ? await buscar(base) : undefined);
  if (!xml) throw new Error(`No encuentro el XML de WordPress en ${base}`);
  return xml;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  processEntities: false,
  parseTagValue: false,
  isArray: (n) => ['item', 'wp:postmeta', 'category', 'wp:category'].includes(n),
});
const canal = parser.parse(await readFile(await encontrarXml(), 'utf8')).rss.channel;
const items = canal.item;

const categorias = new Map(canal['wp:category'].map((c) => [c['wp:category_nicename'], c['wp:category_parent'] || null]));
const cadenaDe = (nicename) => {
  const cadena = [];
  for (let actual = nicename; actual; actual = categorias.get(actual)) cadena.unshift(actual);
  return cadena;
};
const meta = (item, clave) => (item['wp:postmeta'] ?? []).find((m) => m['wp:meta_key'] === clave)?.['wp:meta_value'];
const rutaDe = (url) => new URL(url).pathname;

/** ¿Existe esa dirección en dist/? Las que terminan en barra son carpetas con index.html. */
const existe = (ruta) => {
  const limpia = decodeURIComponent(ruta);
  if (existsSync(join(DIST, limpia.endsWith('/') ? join(limpia, 'index.html') : limpia))) return true;
  // Los GIF animados pasaron a vídeo (.mp4): la entrada ya usa el vídeo (CLAUDE.md, «Decisiones ya tomadas»).
  return limpia.endsWith('.gif') && existsSync(join(DIST, limpia.replace(/\.gif$/, '.mp4')));
};

// Lo que se espera encontrar, por tipo: { ruta → motivo }.
const esperado = {
  'Entradas': new Map(),
  'Páginas': new Map(),
  'Direcciones antiguas de entradas': new Map(),
  'Categorías': new Map(),
  'Etiquetas': new Map(),
  'Autores': new Map(),
  'Fotos usadas en las entradas': new Map(),
};
const descartadas = new Map(); // ruta → motivo, para lo que no se migró a propósito

const publicadas = items.filter((i) => i['wp:status'] === 'publish');
const entradas = publicadas.filter((i) => i['wp:post_type'] === 'post');
const paginas = publicadas.filter((i) => i['wp:post_type'] === 'page');

for (const e of entradas) {
  esperado['Entradas'].set(rutaDe(e.link), e.title);
  const viejo = meta(e, '_wp_old_slug');
  if (viejo) esperado['Direcciones antiguas de entradas'].set(rutaDe(e.link).replace(/[^/]+\/$/, `${viejo}/`), e.title);
  for (const c of e.category ?? []) {
    const nicename = c['@_nicename'];
    if (c['@_domain'] === 'category') {
      const cadena = cadenaDe(nicename);
      // WordPress también tiene página para cada categoría de la que cuelga (/category/zona/aragon/).
      for (let n = 1; n <= cadena.length; n++) esperado['Categorías'].set(`/category/${cadena.slice(0, n).join('/')}/`, '');
    } else if (c['@_domain'] === 'post_tag') {
      const ruta = `/tag/${nicename}/`;
      esperado['Etiquetas'].set(ruta, '');
      if (ETIQUETAS_FUERA.has(nicename)) descartadas.set(ruta, 'etiqueta descartada a propósito');
    }
  }
  esperado['Autores'].set(`/author/${e['dc:creator']}/`, '');
  // Fotos que muestra el texto de la entrada (src; no los href de enlace ni data-orig-file, que apuntan al original sin editar).
  for (const m of (e['content:encoded'] ?? '').matchAll(/\bsrc=["'][^"']*?(\/wp-content\/uploads\/[^"'?#]+)/g)) {
    esperado['Fotos usadas en las entradas'].set(m[1], e.title);
  }
}
for (const p of paginas) esperado['Páginas'].set(rutaDe(p.link), p.title);

// Las 3 direcciones que no vienen del XML.
esperado['Páginas'].set('/', 'portada');
esperado['Páginas'].set('/feed/', 'RSS');
esperado['Páginas'].set('/page/2/', 'paginación de la portada');

let faltan = 0;
console.log(`Web nueva: ${DIST}\n`);
for (const [tipo, rutas] of Object.entries(esperado)) {
  const sin = [];
  let descartes = 0;
  for (const [ruta, motivo] of rutas) {
    if (existe(ruta)) continue;
    if (descartadas.has(ruta)) descartes++;
    else sin.push([ruta, motivo]);
  }
  const bien = rutas.size - sin.length - descartes;
  console.log(`${sin.length ? '✗' : '✓'} ${tipo}: ${bien} de ${rutas.size} existen${descartes ? ` (${descartes} descartadas a propósito)` : ''}`);
  for (const [ruta, motivo] of sin.slice(0, 25)) console.log(`    falta ${ruta}${motivo ? `   (${motivo})` : ''}`);
  if (sin.length > 25) console.log(`    … y ${sin.length - 25} más`);
  faltan += sin.length;
}

const adjuntos = items.filter((i) => i['wp:post_type'] === 'attachment').length;
const usadas = esperado['Fotos usadas en las entradas'].size;
console.log(`\nLa biblioteca de WordPress tiene ${adjuntos} adjuntos; los textos de las entradas usan ${usadas} direcciones de fotos. El resto no se migró.`);
console.log(faltan ? `\nDirecciones antiguas que faltan en la web nueva: ${faltan}.` : '\nTodas las direcciones antiguas comprobadas existen en la web nueva.');
process.exit(faltan ? 1 : 0);
