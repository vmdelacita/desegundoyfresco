import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { copyFile, mkdir } from 'node:fs/promises';

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

export default defineConfig({
  site: 'https://desegundoyfresco.com',
  // Igual que WordPress: todas las URLs terminan en barra y cada página es una carpeta.
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [sitemap(), feedEnRutaWordPress],
});
