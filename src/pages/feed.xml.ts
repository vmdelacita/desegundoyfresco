import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { migasDeZona, todasLasVias, urlVia } from '../lib/vias';

export async function GET(context: APIContext) {
  const vias = (await todasLasVias()).slice(0, 20);
  return rss({
    title: 'De segundo y fresco',
    description: 'Un blog de escalada en pared, fundamentalmente en Catalunya y alrededores',
    site: context.site!,
    trailingSlash: true,
    items: vias.map((via) => ({
      title: via.data.titulo,
      pubDate: via.data.fecha,
      link: urlVia(via),
      description: `${via.data.grado} · ${migasDeZona(via).map((z) => z.nombre).join(' › ')}`,
    })),
    customData: '<language>es</language>',
  });
}
