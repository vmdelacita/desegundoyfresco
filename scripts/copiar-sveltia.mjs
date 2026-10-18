// Copia el editor (Sveltia CMS) de node_modules a public/admin/sveltia/, sin los mapas de depuración.
// Se ejecuta solo antes de `npm run dev` y `npm run build`; la copia no se sube al repositorio.
import { cp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const origen = join(process.cwd(), 'node_modules/@sveltia/cms/dist');
const destino = join(process.cwd(), 'public/admin/sveltia');

if (!existsSync(origen)) {
  console.error('Falta @sveltia/cms: ejecuta «npm install».');
  process.exit(1);
}
await rm(destino, { recursive: true, force: true });
await cp(origen, destino, {
  recursive: true,
  filter: (ruta) => !ruta.endsWith('.map') && !ruta.endsWith('.mjs'),
});
