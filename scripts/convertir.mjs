#!/usr/bin/env node
// Convierte la exportación de WordPress (import/wordpress-export/**/*.xml) en las vías y páginas
// de src/content, con su ficha, sus comentarios y las coordenadas sacadas del GPS de las fotos.
//
//   npm run convertir                      informe en seco: no escribe nada, solo cuenta y avisa
//   npm run convertir -- --escribir        crea los archivos que no existen
//   npm run convertir -- --escribir --sobrescribir     reescribe también los que ya existen
//   npm run convertir -- --solo slug-1,slug-2          limita la conversión a esas entradas
//   npm run convertir -- --xml RUTA        otro archivo de exportación
//
// Nunca toca import/. Genera import/informe-fase4.md (lo que hay que revisar a mano) e
// import/sin-coordenadas.csv (vías sin punto en el mapa). Con --sobrescribir se pierden las
// correcciones hechas a mano en los archivos que ya existan.
import { existsSync } from 'node:fs';
import { mkdir, open, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { XMLParser } from 'fast-xml-parser';
import TurndownService from 'turndown';
import YAML from 'yaml';
import exifr from 'exifr';

const args = process.argv.slice(2);
const opcion = (nombre) => {
  const i = args.indexOf(`--${nombre}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const escribir = args.includes('--escribir');
const sobrescribir = args.includes('--sobrescribir');
const soloEstas = opcion('solo')?.split(',').map((s) => s.trim());

const RAIZ = process.cwd();
const IMPORT = join(RAIZ, 'import');
const MEDIA = join(IMPORT, 'media');
const PUBLIC_UPLOADS = join(RAIZ, 'public/wp-content/uploads');
const DOMINIO_WP = 'desegundoyfresco.wordpress.com';

// ---------------------------------------------------------------------------------------------
// Decisiones ya tomadas (ver CLAUDE.md)

/** Etiquetas de sistema que se descartan. */
const ETIQUETAS_FUERA = new Set(['victor', 'destacado', 'destacada', 'via-larga']);
/** GIF animados que se pasan a vídeo. El resto de GIF no se usa en ninguna entrada. */
const GIF_A_VIDEO = new Set(['2017/04/timelapse1.gif', '2020/04/timelapse_maladeta_01.gif', '2016/05/ezgif-com-optimize.gif']);
/** Páginas de WordPress que se migran (el mapa antiguo se descarta). */
const PAGINAS = new Set(['quienes-somos', 'como-monto-reuniones']);

// ---------------------------------------------------------------------------------------------
// Utilidades

const slugify = (texto) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’+]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const ENTIDADES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#039;': "'", '&#8217;': '’', '&nbsp;': ' ' };
const decodificar = (s) => s.replace(/&(?:amp|lt|gt|quot|nbsp|#0?39|#8217);/g, (m) => ENTIDADES[m]);

const MESES = {
  enero: 1, gener: 1, febrero: 2, febrer: 2, marzo: 3, marc: 3, abril: 4, mayo: 5, maig: 5, junio: 6, juny: 6,
  julio: 7, juliol: 7, agosto: 8, agost: 8, septiembre: 9, setiembre: 9, setembre: 9, octubre: 10,
  noviembre: 11, novembre: 11, diciembre: 12, desembre: 12,
};

/** «30 de diciembre de 2014», «5 de març del 2017», «10/12/2016» → «2014-12-30». */
function fechaDeTexto(texto) {
  // «22, 23 y 24 de mayo de 2022» → se toma el primer día
  const t = texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/^(\d{1,2})(?:\s*(?:,|y|-|al)\s*\d{1,2})+(\s+de\b)/, '$1$2');
  let m = t.match(/(\d{1,2})\s*(?:de|d')?\s*([a-z]+)\s*(?:de|del)?\s*(\d{4})/);
  if (m && MESES[m[2]]) return `${m[3]}-${String(MESES[m[2]]).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = t.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return undefined;
}

/** Longitud y grado del título: «(285m, 6b)», «(V+, 350m)», «(250 + 300m, 6b)», «(~500m, III)». */
function datosDelTitulo(titulo) {
  const grupos = [...titulo.matchAll(/\(([^()]*)\)/g)].map((m) => m[1]);
  for (const grupo of grupos) {
    const trozos = grupo.split(',').map((t) => t.trim());
    const conMetros = trozos.find((t) => /\d\s*m\b/i.test(t));
    if (conMetros) {
      const longitud = [...conMetros.matchAll(/\d+(?:[.,]\d+)?/g)].reduce((suma, n) => suma + Number(n[0].replace(',', '.')), 0);
      const grado = trozos.find((t) => t !== conMetros && /^(?:[IV]+\+?|\d[abc]?\+?)(?:\/\S+)?$/i.test(t));
      return { longitud, grado };
    }
    if (trozos.length === 1 && /^(?:[IV]+\+?|\d[abc]\+?)(?:\/\S+)?$/.test(trozos[0])) return { grado: trozos[0] };
  }
  return {};
}

const metros = (a, b) => {
  const rad = (g) => (g * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 12742000 * Math.asin(Math.sqrt(h));
};

/** Punto central del grupo más numeroso de fotos (radio de 3 km): descarta la del parking o el bar. */
function centroPrincipal(puntos) {
  let mejor = [];
  for (const p of puntos) {
    const grupo = puntos.filter((q) => metros(p, q) <= 3000);
    if (grupo.length > mejor.length) mejor = grupo;
  }
  const lat = mejor.reduce((s, p) => s + p.lat, 0) / mejor.length;
  const lng = mejor.reduce((s, p) => s + p.lng, 0) / mejor.length;
  return { lat: +lat.toFixed(5), lng: +lng.toFixed(5), fotos: mejor.length, descartadas: puntos.length - mejor.length };
}

// ---------------------------------------------------------------------------------------------
// Lectura de la exportación

async function encontrarXml() {
  const dado = opcion('xml');
  if (dado) return resolve(dado);
  const base = join(IMPORT, 'wordpress-export');
  const buscar = async (dir) => {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const ruta = join(dir, e.name);
      if (e.isDirectory()) {
        const dentro = await buscar(ruta);
        if (dentro) return dentro;
      } else if (e.name.endsWith('.xml')) return ruta;
    }
  };
  const xml = await buscar(base);
  if (!xml) throw new Error(`No encuentro el XML de WordPress en ${base}`);
  return xml;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  processEntities: false,
  parseTagValue: false,
  isArray: (n) => ['item', 'wp:postmeta', 'wp:comment', 'category', 'wp:category'].includes(n),
});
const canal = parser.parse(await readFile(await encontrarXml(), 'utf8')).rss.channel;
const items = canal.item;
const texto = (valor) => (valor && typeof valor === 'object' ? (valor['#text'] ?? '') : (valor ?? ''));

/** Categorías declaradas: nicename → { nombre, padre }. */
const categorias = new Map(canal['wp:category'].map((c) => [c['wp:category_nicename'], { nombre: decodificar(c['wp:cat_name']), padre: c['wp:category_parent'] || null }]));
const raizDe = (nicename) => {
  let actual = nicename;
  while (categorias.get(actual)?.padre) actual = categorias.get(actual).padre;
  return actual;
};
const cadenaDe = (nicename) => {
  const cadena = [];
  for (let actual = nicename; actual && categorias.has(actual); actual = categorias.get(actual).padre) cadena.unshift(actual);
  return cadena;
};

const meta = (item, clave) => (item['wp:postmeta'] ?? []).find((m) => m['wp:meta_key'] === clave)?.['wp:meta_value'];
const adjuntos = new Map(
  items
    .filter((i) => i['wp:post_type'] === 'attachment')
    .map((i) => [i['wp:post_id'], new URL(i['wp:attachment_url']).pathname.replace(/^.*\/wp-content\/uploads\//, '')]),
);
const zonasJson = JSON.parse(await readFile(join(RAIZ, 'src/data/zonas.json'), 'utf8'));
const autoresConocidos = new Set((await readdir(join(RAIZ, 'src/content/autores'))).map((f) => f.replace(/\.json$/, '')));

// ---------------------------------------------------------------------------------------------
// Qué hay que convertir

const publicas = items.filter((i) => i['wp:post_type'] === 'post' && i['wp:status'] === 'publish');
const borradores = items.filter((i) => i['wp:post_type'] === 'post' && i['wp:status'] === 'draft');
const paginas = items.filter((i) => i['wp:post_type'] === 'page' && i['wp:status'] === 'publish' && PAGINAS.has(i['wp:post_name']));

const informe = { revisar: [], inferido: [], faltan: [] };
const nota = (tipo, item, mensaje) => {
  const linea = `**${decodificar(item.title)}** — ${mensaje}`;
  if (!informe[tipo].includes(linea)) informe[tipo].push(linea);
};

/** Dirección de cada entrada publicada (la del campo <link>, no la recalculada) y nombre del archivo. */
const urlDe = new Map(); // id de WordPress → /AAAA/MM/DD/nombre/
const nombresUsados = new Set();
const slugDe = new Map();
for (const item of [...publicas, ...borradores]) {
  const id = item['wp:post_id'];
  const enlace = new URL(item.link);
  const partes = enlace.pathname.split('/').filter(Boolean);
  let slug;
  if (item['wp:status'] === 'publish') {
    slug = decodeURIComponent(partes[3]);
    urlDe.set(id, `/${partes.slice(0, 3).join('/')}/${partes[3]}/`);
  } else {
    slug = item['wp:post_name'] || slugify(decodificar(item.title));
  }
  while (nombresUsados.has(slug)) slug += '-borrador';
  nombresUsados.add(slug);
  slugDe.set(id, slug);
}
/** Direcciones antiguas (el nombre de la entrada cambió) → dirección actual. */
const aliasDe = new Map();
for (const item of publicas) {
  const viejo = meta(item, '_wp_old_slug');
  if (!viejo) continue;
  const actual = urlDe.get(item['wp:post_id']);
  const fechaVieja = meta(item, '_wp_old_date')?.replaceAll('-', '/') ?? actual.split('/').slice(1, 4).join('/');
  aliasDe.set(`/${fechaVieja}/${viejo}/`, actual);
}
const urlPorId = (id) => urlDe.get(id);
const urlsPublicas = new Set(urlDe.values());

// ---------------------------------------------------------------------------------------------
// HTML de WordPress → Markdown

/** Recoloca las fotos de la biblioteca: https://…wordpress.com/wp-content/uploads/AAAA/MM/f.jpg?w=700 → /wp-content/uploads/AAAA/MM/f.jpg */
function rutaLocal(url) {
  const m = url?.match(/\/wp-content\/uploads\/([^?#]+)/);
  return m ? `/wp-content/uploads/${m[1]}` : url;
}
const destino = (url) => url.replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29');

function altUtil(alt, pie) {
  const a = decodificar(alt ?? '').trim();
  // Casi todos los «alt» de WordPress son el nombre del archivo; solo valen los que son frases.
  return /\s/.test(a) && a !== pie ? a.replace(/[[\]]/g, '') : '';
}

let contexto; // la entrada que se está convirtiendo (para avisos)

function imagenMd(img, pie) {
  if (!img.getAttribute('src')) {
    nota('inferido', contexto, 'tenía un bloque de imagen vacío (sin foto); se ha quitado');
    return '';
  }
  const src = rutaLocal(img.getAttribute('src'));
  const titulo = pie?.replace(/\s+/g, ' ').trim();
  if (/\.gif$/i.test(src)) {
    const rel = src.replace('/wp-content/uploads/', '');
    if (!GIF_A_VIDEO.has(rel)) {
      nota('revisar', contexto, `usa un GIF que no está en la lista de conversión: ${rel}`);
      return `![](${destino(src)})`;
    }
    const video = `<video src="${src.replace(/\.gif$/i, '.mp4')}" autoplay loop muted playsinline></video>`;
    return titulo ? `<figure>${video}<figcaption>${titulo}</figcaption></figure>` : video;
  }
  const t = titulo ? ` "${titulo.replace(/"/g, '\\"')}"` : '';
  return `![${altUtil(img.getAttribute('alt'), titulo)}](${destino(src)}${t})`;
}

/** Enlaces internos → relativos; el resto se deja tal cual. */
function enlaceInterno(href) {
  let url;
  try {
    url = new URL(href, `https://${DOMINIO_WP}`);
  } catch {
    return href;
  }
  if (url.hostname !== DOMINIO_WP && url.hostname !== 'desegundoyfresco.com') return href;
  const ruta = url.pathname;
  const idEntrada = url.searchParams.get('p') ?? url.searchParams.get('page_id');
  if (idEntrada) {
    const destinoId = urlPorId(idEntrada);
    if (destinoId) return destinoId;
    nota('revisar', contexto, `enlace a la entrada ${idEntrada}, que no está publicada: ${href}`);
    return href;
  }
  if (aliasDe.has(ruta)) return aliasDe.get(ruta);
  if (/^\/\d{4}\/\d{2}\/\d{2}\//.test(ruta)) {
    if (!urlsPublicas.has(ruta)) nota('revisar', contexto, `enlace a una entrada que no existe en la web nueva: ${ruta}`);
    return ruta + url.hash;
  }
  if (ruta.startsWith('/wp-content/uploads/')) return ruta;
  if (ruta === '/' || /^\/(category|tag|author|page)\//.test(ruta) || /^\/[a-z-]+\/$/.test(ruta)) return ruta + url.hash;
  nota('revisar', contexto, `enlace interno que no sé a dónde llevar: ${href}`);
  return href;
}

const td = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  strongDelimiter: '**',
  br: '\\',
});
td.addRule('figura', {
  filter: 'figure',
  replacement(contenido, nodo) {
    const imagenes = nodo.querySelectorAll('img');
    if (imagenes.length !== 1) return contenido; // galería: cada foto ya es su propia figura
    return `\n\n${imagenMd(imagenes[0], nodo.querySelector('figcaption')?.textContent)}\n\n`;
  },
});
td.addRule('imagen', { filter: 'img', replacement: (_, nodo) => imagenMd(nodo) });
td.addRule('tachado', { filter: ['s', 'del', 'strike'], replacement: (c) => `~~${c}~~` });
td.addRule('enlace', {
  filter: (nodo) => nodo.nodeName === 'A' && nodo.getAttribute('href'),
  replacement(contenido, nodo) {
    if (!contenido.trim()) return '';
    return `[${contenido}](${destino(enlaceInterno(nodo.getAttribute('href')))})`;
  },
});

/** wpautop de WordPress: líneas en blanco → párrafos; un salto de línea suelto → <br>. */
function wpautop(html) {
  const BLOQUE = /^<(?:p|div|figure|ul|ol|li|h[1-6]|blockquote|pre|hr|table)\b/i;
  return html
    .split(/\n{2,}/)
    .map((trozo) => trozo.trim())
    .filter(Boolean)
    .map((trozo) => (BLOQUE.test(trozo) ? trozo : `<p>${trozo.replace(/\n/g, '<br />\n')}</p>`))
    .join('\n\n');
}

function prepararHtml(crudo, enBloques) {
  let html = crudo.replace(/\r\n?/g, '\n').replace(/<!--[\s\S]*?-->/g, '');
  html = html.replace(/\[googlemaps[^\]]*\]/g, '');
  // [youtube https://…] → un enlace: incrustar el vídeo cargaría YouTube en la web.
  html = html.replace(/\[youtube[ =]([^\]\s]+)\s*\]/g, '<p><a href="$1">$1</a></p>');
  // [caption …]<a><img></a> Pie[/caption] → <figure><img><figcaption>Pie</figcaption></figure>
  html = html.replace(/\[caption[^\]]*\]([\s\S]*?)\[\/caption\]/g, (_, dentro) => {
    const m = dentro.match(/^\s*(?:<a\b[^>]*>\s*)?(<img\b[^>]*>)(?:\s*<\/a>)?\s*([\s\S]*)$/);
    if (!m) {
      nota('revisar', contexto, `un pie de foto sin foto: «${dentro.replace(/<[^>]+>/g, '').trim().slice(0, 60)}»`);
      return `<p>${dentro}</p>`;
    }
    const pie = m[2].trim();
    return `<figure>${m[1]}${pie ? `<figcaption>${pie}</figcaption>` : ''}</figure>`;
  });
  // Las fotos enlazaban a su archivo grande; en la web nueva ya están a 2.000 px.
  html = html.replace(/<a\b[^>]*href="[^"]*\/wp-content\/uploads\/[^"]*"[^>]*>\s*(<img\b[^>]*>)\s*<\/a>/g, '$1');
  if (!enBloques) html = wpautop(html);
  // Dos <br> seguidos son un párrafo nuevo; un <br> al principio o al final de un párrafo sobra.
  return html
    .replace(/(?:<br\s*\/?>\s*){2,}/g, '</p><p>')
    .replace(/<p>\s*(?:<br\s*\/?>\s*)+/g, '<p>')
    .replace(/(?:\s*<br\s*\/?>)+\s*<\/p>/g, '</p>');
}

function htmlAMarkdown(crudo) {
  const enBloques = crudo.includes('<!-- wp:');
  let md = td.turndown(prepararHtml(crudo, enBloques));
  md = md
    .replace(/[  ]/g, ' ')
    .replace(/​/g, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/^\\$\n?/gm, '') // línea con solo un salto
    .replace(/^(\s*)(-|\d+\.) {2,}(?=\S)/gm, '$1$2 ') // turndown deja tres espacios tras el guion de las listas
    .replace(/https?:\/\/[^\s)>\]]+/g, (u) => u.replace(/\\([_*~])/g, '$1'))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return md;
}

/** «Fecha», «Material» y «Horario» del final del texto → campos de la ficha, quitados del cuerpo. */
const CLAVES_PIE = { fecha: 'fechaEscalada', fechas: 'fechaEscalada', data: 'fechaEscalada', material: 'material', materials: 'material', horario: 'horario', horari: 'horario' };
const LINEAS_DEL_PIE = 30; // el pie a veces va seguido de una foto o de una despedida
function extraerPie(md) {
  const lineas = md.split('\n');
  const ficha = {};
  const quitar = new Set();
  for (let i = lineas.length - 1; i >= Math.max(0, lineas.length - LINEAS_DEL_PIE); i--) {
    const m = lineas[i].trim().match(/^\**\s*([A-Za-zÀ-ÿ]+)\s*\**\s*:\s*\**\s*(.+?)\s*$/);
    const clave = m && CLAVES_PIE[m[1].toLowerCase()];
    if (!clave) continue;
    // Los saltos de línea entre «Material», «Fecha» y «Horario» dejan una «\» al final de cada línea.
    ficha[clave] ??= m[2].replace(/\\$/, '').replace(/\*+$/g, '').replace(/^\*+/, '').trim();
    quitar.add(i);
  }
  const cuerpo = lineas
    .filter((_, i) => !quitar.has(i))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/(?:\n+---)+\s*$/g, '')
    .replace(/\\$/, '')
    .trim();
  return { cuerpo, ficha };
}

// ---------------------------------------------------------------------------------------------
// Ficha

function resolverZona(item) {
  const nicenames = (item.category ?? []).filter((c) => c['@_domain'] === 'category' && raizDe(c['@_nicename']) === 'zona' && c['@_nicename'] !== 'zona').map((c) => c['@_nicename']);
  if (nicenames.length === 0) return undefined;
  const cadenas = nicenames.map((n) => cadenaDe(n).slice(1)).sort((a, b) => b.length - a.length);
  const cadena = cadenas[0];
  if (!cadenas.every((c) => c.every((n, i) => n === cadena[i]))) nota('revisar', item, `tiene zonas en ramas distintas (${nicenames.join(', ')}); se usa ${cadena.join(' › ')}`);
  // Se resuelve por «slug» contra src/data/zonas.json, que es la lista que valida el sitio.
  const camino = [];
  let nivel = zonasJson;
  for (const s of cadena) {
    const nodo = nivel?.find((n) => n.slug === s);
    if (!nodo) {
      nota('revisar', item, `la zona «${s}» no está en src/data/zonas.json`);
      return undefined;
    }
    camino.push(nodo.nombre);
    nivel = nodo.hijos;
  }
  return camino;
}

const categoriaDe = (item, raiz) => {
  const c = (item.category ?? []).find((x) => x['@_domain'] === 'category' && raizDe(x['@_nicename']) === raiz && x['@_nicename'] !== raiz);
  return c && decodificar(texto(c));
};

function etiquetasDe(item) {
  const vistas = new Set();
  const salida = [];
  for (const c of item.category ?? []) {
    if (c['@_domain'] !== 'post_tag') continue;
    const slug = c['@_nicename'];
    if (ETIQUETAS_FUERA.has(slug) || vistas.has(slug)) continue;
    vistas.add(slug);
    salida.push(decodificar(texto(c)));
  }
  return salida.sort((a, b) => a.localeCompare(b, 'es'));
}

function comentariosDe(item) {
  const reales = (item['wp:comment'] ?? []).filter((c) => c['wp:comment_approved'] === '1' && ['', 'comment'].includes(c['wp:comment_type']));
  const porId = new Map(reales.map((c) => [c['wp:comment_id'], c]));
  const nivel = (c) => (c['wp:comment_parent'] !== '0' && porId.has(c['wp:comment_parent']) ? 1 + nivel(porId.get(c['wp:comment_parent'])) : 0);
  const hijos = (id) => reales.filter((c) => c['wp:comment_parent'] === id);
  const ordenados = [];
  const recorrer = (c) => {
    ordenados.push(c);
    hijos(c['wp:comment_id']).forEach(recorrer);
  };
  reales.filter((c) => nivel(c) === 0).forEach(recorrer);
  // Solo nombre, fecha y texto: el correo y la IP del export no salen de import/.
  return ordenados.map((c) => ({
    autor: decodificar(c['wp:comment_author']),
    fecha: c['wp:comment_date'].slice(0, 10),
    ...(nivel(c) ? { respuesta: true } : {}),
    texto: decodificar(c['wp:comment_content'].replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '')).replace(/\r\n?/g, '\n').trim(),
  }));
}

async function leerCabecera(archivo) {
  const f = await open(archivo);
  try {
    const { buffer, bytesRead } = await f.read(Buffer.alloc(256 * 1024), 0, 256 * 1024, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await f.close();
  }
}

async function coordenadasDe(item, portada, md) {
  const lat = meta(item, 'geo_latitude');
  const lng = meta(item, 'geo_longitude');
  if (lat && lng) return { texto: `${+lat}, ${+lng}`, auto: false };
  const rutas = new Set([...md.matchAll(/\/wp-content\/uploads\/([^\s)"'?]+)/g)].map((m) => decodeURIComponent(m[1])));
  if (portada) rutas.add(portada.replace('/wp-content/uploads/', ''));
  const puntos = new Map();
  for (const ruta of rutas) {
    const archivo = join(MEDIA, ruta);
    if (!/\.jpe?g$/i.test(ruta) || !existsSync(archivo)) continue;
    // El EXIF está al principio del JPEG. Se lee la cabecera aquí porque exifr deja abiertos los archivos que abre él.
    const gps = await leerCabecera(archivo).then((b) => exifr.gps(b)).catch(() => undefined);
    if (gps?.latitude !== undefined) puntos.set(ruta, { lat: gps.latitude, lng: gps.longitude });
  }
  if (puntos.size === 0) return undefined;
  const delaPortada = portada && puntos.get(portada.replace('/wp-content/uploads/', ''));
  if (delaPortada) return { texto: `${delaPortada.lat.toFixed(5)}, ${delaPortada.lng.toFixed(5)}`, auto: true, fotos: puntos.size };
  const c = centroPrincipal([...puntos.values()]);
  return { texto: `${c.lat}, ${c.lng}`, auto: true, fotos: puntos.size, descartadas: c.descartadas };
}

// ---------------------------------------------------------------------------------------------
// Escritura

function frontmatter(datos) {
  const doc = new YAML.Document(datos, { version: '1.1' });
  YAML.visit(doc, {
    Seq(_, nodo) {
      if (nodo.items.every((i) => YAML.isScalar(i))) nodo.flow = true;
    },
  });
  // Las fechas sin comillas, como en el resto de la web (Astro las lee igual).
  return doc.toString({ lineWidth: 0, flowCollectionPadding: false }).replace(/^(\s*(?:- )?(?:fecha|fechaEscalada)): "(\d{4}-\d{2}-\d{2})"$/gm, '$1: $2');
}

const salida = { creados: 0, reescritos: 0, saltados: 0 };
async function guardar(ruta, contenido) {
  const existe = existsSync(ruta);
  if (existe && !sobrescribir) return void salida.saltados++;
  if (!escribir) return void (salida[existe ? 'reescritos' : 'creados']++);
  await mkdir(dirname(ruta), { recursive: true });
  await writeFile(ruta, contenido);
  salida[existe ? 'reescritos' : 'creados']++;
}

const sinCoordenadas = [];
const coordenadasAuto = [];
let fotosUsadas = new Set();

async function convertirVia(item) {
  contexto = item;
  const id = item['wp:post_id'];
  const titulo = decodificar(item.title).replace(/\s+/g, ' ').trim();
  const esBorrador = item['wp:status'] === 'draft';
  const slug = slugDe.get(id);
  const { longitud, grado: gradoTitulo } = datosDelTitulo(titulo);

  let md = htmlAMarkdown(item['content:encoded'] ?? '');
  const { cuerpo, ficha: pie } = extraerPie(md);
  md = cuerpo;
  for (const m of md.matchAll(/\/wp-content\/uploads\/([^\s)"'?]+)/g)) fotosUsadas.add(decodeURIComponent(m[1]));
  if (/\[\/?caption|\[youtube|\[gallery/.test(md)) nota('revisar', item, 'quedan códigos de WordPress sin convertir en el texto');
  if (new RegExp(`${DOMINIO_WP}`).test(md)) nota('revisar', item, `quedan enlaces a ${DOMINIO_WP} en el texto`);
  if (/<(?:div|span|table|iframe)\b/.test(md)) nota('revisar', item, 'quedan etiquetas HTML sueltas en el texto');

  const portadaId = meta(item, '_thumbnail_id');
  let portada = portadaId && adjuntos.get(portadaId) ? `/wp-content/uploads/${adjuntos.get(portadaId)}` : undefined;
  if (!portada) {
    const primera = md.match(/\/wp-content\/uploads\/[^\s)"'?]+\.(?:jpe?g|png)/i);
    portada = primera?.[0];
    if (portada) nota('inferido', item, 'no tiene imagen destacada: se usa la primera foto del texto como portada');
    else if (!esBorrador) nota('faltan', item, 'no tiene imagen destacada ni fotos en el texto');
  }
  if (portada) fotosUsadas.add(portada.replace('/wp-content/uploads/', ''));

  const zona = resolverZona(item);
  const roca = categoriaDe(item, 'tipo-de-piedra');
  const tipoBruto = categoriaDe(item, 'tipo-de-escalada');
  const tipo = tipoBruto && (slugify(tipoBruto) === 'via-larga' ? 'Vía larga' : tipoBruto);
  const gradoCategoria = categoriaDe(item, 'grado');
  if (gradoTitulo && gradoCategoria && slugify(gradoTitulo.split('/')[0].replace(/[+-]$/, '')) !== slugify(gradoCategoria)) {
    nota('inferido', item, `el grado del título (${gradoTitulo}) no coincide con la categoría de WordPress (${gradoCategoria}); se usa el del título`);
  }

  const coordenadas = esBorrador ? undefined : await coordenadasDe(item, portada, md);
  if (coordenadas?.auto) coordenadasAuto.push({ slug, ...coordenadas });
  if (!coordenadas && !esBorrador) sinCoordenadas.push({ slug, titulo, url: urlDe.get(id) });
  if (coordenadas?.descartadas) nota('inferido', item, `coordenadas automáticas: se descartaron ${coordenadas.descartadas} foto(s) lejos del grupo principal`);

  const autor = item['dc:creator'];
  if (!autoresConocidos.has(autor)) nota('faltan', item, `el autor «${autor}» no tiene archivo en src/content/autores`);

  if (pie.fechaEscalada) {
    const f = fechaDeTexto(pie.fechaEscalada);
    if (f) pie.fechaEscalada = f;
    else {
      nota('revisar', item, `no entiendo la fecha de la escalada: «${pie.fechaEscalada}»`);
      delete pie.fechaEscalada;
    }
  }

  const fechaUrl = urlDe.get(id)?.split('/').slice(1, 4).join('-');
  const datos = {
    titulo,
    fecha: fechaUrl ?? item['wp:post_date'].slice(0, 10),
    autor,
    zona,
    grado: gradoTitulo ?? gradoCategoria,
    longitud,
    roca,
    tipo,
    fechaEscalada: pie.fechaEscalada,
    material: pie.material,
    horario: pie.horario,
    coordenadas: coordenadas?.texto,
    coordenadasAuto: coordenadas?.auto || undefined,
    portada,
    etiquetas: etiquetasDe(item),
    borrador: esBorrador || undefined,
    comentarios: comentariosDe(item),
  };
  if (!datos.comentarios.length) delete datos.comentarios;
  return { slug, titulo, datos, md, item };
}

/** Completa lo que falta copiándolo de la otra parte de la misma vía («… - Parte I» / «… - Parte II»). */
function completarDesdeHermana(vias) {
  for (const via of vias) {
    const raiz = via.titulo.replace(/\s*-\s*Parte\s+[IV]+$/i, '');
    if (raiz === via.titulo) continue;
    const hermana = vias.find((v) => v !== via && v.titulo.replace(/\s*-\s*Parte\s+[IV]+$/i, '') === raiz);
    if (!hermana) continue;
    for (const campo of ['zona', 'grado', 'roca', 'tipo']) {
      if (via.datos[campo]) continue;
      via.datos[campo] = hermana.datos[campo];
      nota('inferido', via.item, `${campo} copiado de «${hermana.titulo}», la otra parte de la misma vía`);
    }
  }
}

/** Sin roca en WordPress: si todas las demás vías de la misma zona tienen la misma, se toma esa. */
function inferirRoca(via, vias) {
  const d = via.datos;
  if (d.borrador || d.roca || !d.zona) return;
  const mismaZona = vias.filter((v) => v !== via && !v.datos.borrador && v.datos.roca && v.datos.zona?.join() === d.zona.join());
  const rocas = new Set(mismaZona.map((v) => v.datos.roca));
  if (rocas.size !== 1) return;
  d.roca = [...rocas][0];
  nota('inferido', via.item, `roca: «${d.roca}» (WordPress no la tenía; es la de las otras ${mismaZona.length} vías de ${d.zona.join(' › ')})`);
}

/** Una vía larga de más de 50 m sin «tipo de escalada» en WordPress: se da por vía larga y se avisa. */
function inferirTipo(via) {
  const d = via.datos;
  if (d.borrador || d.tipo || !d.longitud || d.longitud < 50) return;
  d.tipo = 'Vía larga';
  nota('inferido', via.item, `tipo de escalada: «Vía larga» (WordPress no lo tenía y mide ${d.longitud} m)`);
}

// ---------------------------------------------------------------------------------------------

const seleccion = (lista) => (soloEstas ? lista.filter((i) => soloEstas.includes(slugDe.get(i['wp:post_id']))) : lista);
const vias = [];
for (const item of seleccion([...publicas, ...borradores])) vias.push(await convertirVia(item));
completarDesdeHermana(vias);
vias.forEach(inferirTipo);
vias.forEach((via) => inferirRoca(via, vias));

for (const via of vias) {
  const { datos, item } = via;
  if (datos.borrador) continue;
  const faltan = ['zona', 'roca', 'tipo', 'portada'].filter((c) => !datos[c]);
  if (faltan.length) nota('faltan', item, `faltan en la ficha: ${faltan.join(', ')}`);
  if (!datos.grado) nota('inferido', item, 'sin grado (ni el título ni las categorías de WordPress lo tienen): no saldrá en las páginas de grado');
  if (!datos.longitud && datos.tipo !== 'Deportiva') nota('inferido', item, 'sin longitud (el título no la lleva)');
}

for (const via of vias) {
  const cabecera = frontmatter(Object.fromEntries(Object.entries(via.datos).filter(([, v]) => v !== undefined)));
  await guardar(join(RAIZ, 'src/content/vias', `${via.slug}.md`), `---\n${cabecera}---\n\n${via.md}\n`);
}

for (const item of soloEstas ? [] : paginas) {
  contexto = item;
  const slug = item['wp:post_name'];
  const archivo = join(RAIZ, 'src/content/paginas', `${slug}.md`);
  const { cuerpo } = extraerPie(htmlAMarkdown(item['content:encoded'] ?? ''));
  for (const m of cuerpo.matchAll(/\/wp-content\/uploads\/([^\s)"'?]+)/g)) fotosUsadas.add(decodeURIComponent(m[1]));
  const portadaId = meta(item, '_thumbnail_id');
  let portada = portadaId && adjuntos.get(portadaId) ? `/wp-content/uploads/${adjuntos.get(portadaId)}` : undefined;
  if (!portada && existsSync(archivo)) portada = (await readFile(archivo, 'utf8')).match(/^portada:\s*(\S+)/m)?.[1]; // la de la Fase 3
  if (portada) fotosUsadas.add(portada.replace('/wp-content/uploads/', ''));
  const comentarios = comentariosDe(item);
  const datos = { titulo: decodificar(item.title).trim(), portada, ...(comentarios.length ? { comentarios } : {}) };
  await guardar(archivo, `---\n${frontmatter(Object.fromEntries(Object.entries(datos).filter(([, v]) => v !== undefined)))}---\n\n${cuerpo}\n`);
}

// GIF animados → vídeo en bucle y sin sonido
const videos = [];
if (escribir) {
  for (const rel of GIF_A_VIDEO) {
    const origen = join(MEDIA, rel);
    const final = join(PUBLIC_UPLOADS, rel.replace(/\.gif$/, '.mp4'));
    if (existsSync(final) || !existsSync(origen)) continue;
    await mkdir(dirname(final), { recursive: true });
    const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', origen, '-an', '-movflags', '+faststart', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-crf', '28', '-vf', "scale='min(1280,iw)':-2", final], { encoding: 'utf8' });
    videos.push(r.status === 0 ? `${rel} → .mp4` : `${rel}: ${r.stderr}`);
  }
}

// ---------------------------------------------------------------------------------------------
// Informes

const hoy = new Date().toISOString().slice(0, 10);
const seccion = (titulo, lista, explicacion) => (lista.length ? `## ${titulo} (${lista.length})\n\n${explicacion}\n\n${lista.map((l) => `- ${l}`).join('\n')}\n` : '');
const publicadas = vias.filter((v) => !v.datos.borrador).length;
await mkdir(IMPORT, { recursive: true });
if (escribir) {
  await writeFile(
    join(IMPORT, 'informe-fase4.md'),
    [
      `# Informe de la conversión (Fase 4) · ${hoy}`,
      '',
      `Entradas convertidas: ${vias.length} (${publicadas} publicadas, ${vias.length - publicadas} borradores) · páginas: ${soloEstas ? 0 : paginas.length}`,
      `Coordenadas automáticas: ${coordenadasAuto.length} · sin punto en el mapa: ${sinCoordenadas.length} (lista en sin-coordenadas.csv)`,
      '',
      seccion('Faltan datos', informe.faltan, 'La web no se genera con estas entradas hasta que tengan el dato.'),
      seccion('Inferido por mí', informe.inferido, 'Hecho con una regla; conviene confirmarlo.'),
      seccion('A revisar a mano', informe.revisar, 'El conversor no ha sabido resolverlo del todo.'),
      seccion('Direcciones antiguas que necesitan alias', [...aliasDe].map(([viejo, nuevo]) => `\`${viejo}\` → \`${nuevo}\``), 'WordPress redirigía estas direcciones; en la web nueva hay que crearles un alias (Fases 6 y 7).'),
    ].join('\n'),
  );
  // Agrupadas por zona: para poner un punto por pared y no uno por vía. La columna «coordenadas» se rellena a mano.
  const zonaDe = (slug) => vias.find((v) => v.slug === slug)?.datos.zona?.join(' › ') ?? '';
  const filas = sinCoordenadas.map((s) => ({ ...s, zona: zonaDe(s.slug) })).sort((a, b) => a.zona.localeCompare(b.zona, 'es') || a.url.localeCompare(b.url));
  const csv = ['slug,titulo,zona,url,coordenadas', ...filas.map((s) => [s.slug, s.titulo, s.zona, s.url, ''].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))];
  await writeFile(join(IMPORT, 'sin-coordenadas.csv'), csv.join('\n') + '\n');
}

console.log(`${escribir ? 'Escrito' : 'En seco (añade --escribir para guardar)'}: ${salida.creados} nuevos, ${salida.reescritos} ${escribir ? 'reescritos' : 'se reescribirían con --sobrescribir'}, ${salida.saltados} saltados por existir (usa --sobrescribir).`);
console.log(`Entradas: ${vias.length} (${publicadas} publicadas) · fotos distintas citadas: ${fotosUsadas.size} · coordenadas automáticas: ${coordenadasAuto.length} · sin coordenadas: ${sinCoordenadas.length}`);
if (videos.length) console.log(`Vídeos: ${videos.join('; ')}`);
for (const [nombre, lista] of Object.entries(informe)) console.log(`${nombre}: ${lista.length}`);
if (!escribir) for (const [nombre, lista] of Object.entries(informe)) lista.forEach((l) => console.log(`  [${nombre}] ${l}`));
