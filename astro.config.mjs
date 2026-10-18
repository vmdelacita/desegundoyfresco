import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { copyFile, mkdir } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { satteri } from '@astrojs/markdown-satteri';
import { piesDeFoto } from './src/lib/pies-de-foto.mjs';

// WordPress servía el RSS en /feed/. GitHub Pages solo sirve /feed/ si existe
// feed/index.html, así que copiamos feed.xml ahí al terminar la compilación.
// (Se sirve como text/html, pero los lectores RSS leen el XML igualmente.)
const feedEnRutaWordPress = {
  name: 'feed-en-ruta-wordpress',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      await mkdir(new URL('feed/', dir), { recursive: true });
      await copyFile(new URL('feed.xml', dir), new URL('feed/index.html', dir));
    },
  },
};

// El índice del buscador (Pagefind) se genera al compilar, en dist/pagefind/. En `npm run dev` se sirve desde ahí:
// basta con haber ejecutado `npm run build` una vez (el índice será el de ese momento).
const buscadorEnDesarrollo = {
  name: 'buscador-en-desarrollo',
  hooks: {
    'astro:server:setup': ({ server }) => {
      const tipos = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm' };
      server.middlewares.use('/pagefind', (req, res, next) => {
        const archivo = normalize(join(process.cwd(), 'dist', 'pagefind', decodeURIComponent((req.url ?? '').split('?')[0])));
        if (!archivo.startsWith(join(process.cwd(), 'dist', 'pagefind')) || !existsSync(archivo)) return next();
        res.setHeader('Content-Type', tipos[extname(archivo)] ?? 'application/octet-stream');
        createReadStream(archivo).pipe(res);
      });
    },
  },
};

export default defineConfig({
  site: 'https://desegundoyfresco.com',
  // Igual que WordPress: todas las URLs terminan en barra y cada página es una carpeta.
  trailingSlash: 'always',
  build: { format: 'directory' },
  markdown: { processor: satteri({ hastPlugins: [piesDeFoto] }) },
  integrations: [sitemap(), feedEnRutaWordPress, buscadorEnDesarrollo],
});
