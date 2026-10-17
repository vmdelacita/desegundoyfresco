import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { buscarZona, caminosDeZona } from './lib/taxonomia';

/** «42.64, -0.04» (como lo copia Google Maps) → { lat, lng }. */
const coordenadas = z
  .string()
  .transform((valor, ctx) => {
    const m = valor.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    const lat = m ? Number(m[1]) : NaN;
    const lng = m ? Number(m[2]) : NaN;
    if (!m || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      ctx.addIssue({ code: 'custom', message: `Coordenadas no válidas: «${valor}». Usa el formato «42.64, -0.04».` });
      return z.NEVER;
    }
    return { lat, lng };
  });

const vias = defineCollection({
  // El nombre del archivo es el final de la URL: nombre.md → /AAAA/MM/DD/nombre/
  loader: glob({
    base: './src/content/vias',
    pattern: '**/*.md',
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
  schema: z.object({
    titulo: z.string().min(1),
    fecha: z.coerce.date(),
    autor: reference('autores'),
    zona: z
      .array(z.string())
      .min(1, 'La zona es obligatoria, p. ej. [Aragón, Ordesa]')
      .superRefine((camino, ctx) => {
        if (buscarZona(camino)) return;
        ctx.addIssue({
          code: 'custom',
          message: `La zona «${camino.join(' › ')}» no existe. Zonas válidas: ${caminosDeZona().join(' | ')}. Para añadir una nueva, edita src/data/zonas.json.`,
        });
      }),
    grado: z.string().min(1),
    longitud: z.number().positive().optional(),
    roca: z.string().min(1),
    tipo: z.string().min(1),
    fechaEscalada: z.coerce.date().optional(),
    material: z.string().optional(),
    horario: z.string().optional(),
    coordenadas: coordenadas.optional(),
    portada: z
      .string()
      .startsWith('/', 'La portada es una ruta que empieza por «/», p. ej. /wp-content/uploads/2026/07/foto.jpg')
      .superRefine((ruta, ctx) => {
        if (existsSync(join(process.cwd(), 'public', ruta))) return;
        ctx.addIssue({
          code: 'custom',
          message: `La foto de portada no existe en public${ruta}. Ejecuta «npm run fotos» o corrige la ruta.`,
        });
      }),
    etiquetas: z.array(z.string()).default([]),
    // Los borradores no se publican: no salen en la web, el RSS, el mapa ni el buscador.
    borrador: z.boolean().default(false),
  }),
});

const autores = defineCollection({
  loader: glob({ base: './src/content/autores', pattern: '*.json' }),
  schema: z.object({ nombre: z.string().min(1) }),
});

const paginas = defineCollection({
  loader: glob({
    base: './src/content/paginas',
    pattern: '*.md',
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
  schema: z.object({ titulo: z.string().min(1) }),
});

export const collections = { vias, autores, paginas };
