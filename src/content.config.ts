import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { buscarZona, caminosDeZona, rocas, SEPARADOR_ZONA, tiposDeEscalada } from './lib/taxonomia';

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

/** Ruta de una foto de public/ (la portada de una vía o de una página). */
const rutaDeFoto = z
  .string()
  .startsWith('/', 'La portada es una ruta que empieza por «/», p. ej. /wp-content/uploads/2026/07/foto.jpg')
  .superRefine((ruta, ctx) => {
    if (existsSync(join(process.cwd(), 'public', ruta))) return;
    ctx.addIssue({
      code: 'custom',
      message: `La foto de portada no existe en public${ruta}. Ejecuta «npm run fotos» o corrige la ruta.`,
    });
  });

/** Comentarios antiguos de WordPress, como texto fijo. `respuesta` marca los que contestan a otro. */
const comentarios = z
  .array(z.object({ autor: z.string().min(1), fecha: z.coerce.date(), texto: z.string().min(1), respuesta: z.boolean().optional() }))
  .default([]);

/** Campos que toda vía publicada debe tener; los borradores pueden dejarlos vacíos. */
const OBLIGATORIOS = ['zona', 'roca', 'tipo', 'portada'] as const;

const vias = defineCollection({
  // El nombre del archivo es el final de la URL: nombre.md → /AAAA/MM/DD/nombre/
  loader: glob({
    base: './src/content/vias',
    pattern: '**/*.md',
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
  schema: z
    .object({
      titulo: z.string().min(1),
      fecha: z.coerce.date(),
      autor: reference('autores'),
      // Una lista ([Aragón, Ordesa]) o el texto que escribe el editor web («Aragón › Ordesa»)
      zona: z
        .preprocess(
          (valor) => (typeof valor === 'string' ? valor.split('›').map((nivel) => nivel.trim()) : valor),
          z
            .array(z.string())
            .min(1, 'La zona es obligatoria, p. ej. Aragón › Ordesa')
            .superRefine((camino, ctx) => {
              if (buscarZona(camino)) return;
              ctx.addIssue({
                code: 'custom',
                message: `La zona «${camino.join(SEPARADOR_ZONA)}» no existe. Zonas válidas: ${caminosDeZona().join(' | ')}. Para añadir una nueva, edítala en src/data/zonas.json (en el editor, «Listas» › «Zonas»).`,
              });
            }),
        )
        .optional(),
      // Una crónica de sector (Gelida, Cavallers) no tiene un solo grado: no sale en las páginas de grado.
      grado: z.string().min(1).optional(),
      longitud: z.number().positive().optional(),
      roca: z.enum(rocas as [string, ...string[]], { error: () => `La roca debe ser una de: ${rocas.join(', ')}. Para añadir otra, edítala en src/data/rocas.json (en el editor, «Listas» › «Rocas»).` }).optional(),
      tipo: z.enum(tiposDeEscalada as [string, ...string[]], { error: () => `El tipo debe ser uno de: ${tiposDeEscalada.join(', ')}. Para añadir otro, edítalo en src/data/tipos.json (en el editor, «Listas» › «Tipos»).` }).optional(),
      fechaEscalada: z.coerce.date().optional(),
      material: z.string().optional(),
      horario: z.string().optional(),
      coordenadas: coordenadas.optional(),
      // `true` si salen del GPS de las fotos (Fases 4 y 5b); las que se escriben a mano nunca se sustituyen.
      coordenadasAuto: z.boolean().optional(),
      portada: rutaDeFoto.optional(),
      etiquetas: z.array(z.string()).default([]),
      // Los borradores no se publican: no salen en la web, el RSS, el mapa ni el buscador.
      borrador: z.boolean().default(false),
      comentarios,
    })
    .superRefine((ficha, ctx) => {
      if (ficha.borrador) return;
      for (const campo of OBLIGATORIOS) {
        if (ficha[campo]) continue;
        ctx.addIssue({ code: 'custom', path: [campo], message: `Falta «${campo}». Solo los borradores (borrador: true) pueden dejarlo vacío.` });
      }
    })
    // Las páginas solo usan vías publicadas, que ya traen estos campos; los borradores no llegan a ninguna.
    .transform((ficha) => ficha as typeof ficha & { zona: string[]; roca: string; tipo: string; portada: string }),
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
  schema: z.object({ titulo: z.string().min(1), portada: rutaDeFoto.optional(), comentarios }),
});

export const collections = { vias, autores, paginas };
