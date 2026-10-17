import { getCollection, type CollectionEntry } from 'astro:content';
import { slugify } from './slug';
import { buscarZona, gradoBase, ordenGrado, RAIZ_CATEGORIA, zonas, type NodoZona } from './taxonomia';

export type Via = CollectionEntry<'vias'>;

const dos = (n: number) => String(n).padStart(2, '0');

/** Todas las vías publicadas (sin borradores), de la más reciente a la más antigua. */
export async function todasLasVias(): Promise<Via[]> {
  const vias = await getCollection('vias', ({ data }) => !data.borrador);
  return vias.sort((a, b) => b.data.fecha.valueOf() - a.data.fecha.valueOf());
}

/** Dirección de una vía, igual que en WordPress: /AAAA/MM/DD/nombre/ */
export function urlVia(via: Via): string {
  const f = via.data.fecha;
  return `/${f.getUTCFullYear()}/${dos(f.getUTCMonth() + 1)}/${dos(f.getUTCDate())}/${via.id}/`;
}

export function formatearFecha(fecha: Date): string {
  return fecha.toLocaleDateString('es-ES', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' });
}

/** Camino de zona de una vía como lista de nodos con su dirección: Aragón → Ordesa. */
export function migasDeZona(via: Via): { nombre: string; url: string }[] {
  const nodos = buscarZona(via.data.zona) ?? [];
  return nodos.map((n, i) => ({
    nombre: n.nombre,
    url: `/category/${RAIZ_CATEGORIA.zona}/${nodos.slice(0, i + 1).map((x) => x.slug).join('/')}/`,
  }));
}

export const urlGrado = (grado: string) => `/category/${RAIZ_CATEGORIA.grado}/${slugify(gradoBase(grado))}/`;
export const urlEtiqueta = (nombre: string) => `/tag/${slugify(nombre)}/`;
export const urlAutor = (id: string) => `/author/${id}/`;

// --- Categorías (zona, grado, roca, tipo), con las mismas URLs que WordPress ---

export interface Categoria {
  /** Ruta bajo /category/, sin barras en los extremos: "zona/aragon/ordesa" */
  ruta: string;
  titulo: string;
  /** Nivel superior al que pertenece: Zona, Grado, Tipo de piedra, Tipo de escalada */
  grupo: string;
  padre?: { titulo: string; url: string };
  hijos: { titulo: string; url: string; total: number }[];
  vias: Via[];
}

export const urlCategoria = (ruta: string) => `/category/${ruta}/`;

/** Agrupa por «slug» valores escritos a mano (Vía larga / Vía Larga) y se queda con el primer nombre visto. */
function agrupar(vias: Via[], valor: (v: Via) => string, ordenar?: (a: string, b: string) => number) {
  const grupos = new Map<string, { nombre: string; vias: Via[] }>();
  for (const v of vias) {
    const nombre = valor(v);
    const slug = slugify(nombre);
    const g = grupos.get(slug) ?? { nombre, vias: [] };
    g.vias.push(v);
    grupos.set(slug, g);
  }
  return [...grupos.entries()].sort(([, a], [, b]) => (ordenar ? ordenar(a.nombre, b.nombre) : a.nombre.localeCompare(b.nombre, 'es')));
}

export async function todasLasCategorias(): Promise<Categoria[]> {
  const vias = await todasLasVias();
  const categorias: Categoria[] = [];

  // Zonas: una vía cuenta en su zona y en todas las zonas que la contienen.
  const raizZona = RAIZ_CATEGORIA.zona;
  const recorrer = (nodos: NodoZona[], ancestros: NodoZona[]): { titulo: string; url: string; total: number }[] => {
    const resumen: { titulo: string; url: string; total: number }[] = [];
    for (const nodo of nodos) {
      const camino = [...ancestros, nodo];
      const enZona = vias.filter((v) => {
        const z = buscarZona(v.data.zona) ?? [];
        return camino.every((n, i) => z[i]?.slug === n.slug);
      });
      if (enZona.length === 0) continue;
      const ruta = `${raizZona}/${camino.map((n) => n.slug).join('/')}`;
      const hijos = recorrer(nodo.hijos ?? [], camino);
      const padre = ancestros.length
        ? { titulo: ancestros.at(-1)!.nombre, url: urlCategoria(`${raizZona}/${ancestros.map((n) => n.slug).join('/')}`) }
        : { titulo: 'Zonas', url: urlCategoria(raizZona) };
      categorias.push({ ruta, titulo: nodo.nombre, grupo: 'Zona', padre, hijos, vias: enZona });
      resumen.push({ titulo: nodo.nombre, url: urlCategoria(ruta), total: enZona.length });
    }
    return resumen;
  };
  const zonasConVias = recorrer(zonas, []);
  categorias.push({ ruta: raizZona, titulo: 'Zonas', grupo: 'Zona', hijos: zonasConVias, vias: [] });

  // Grado, roca y tipo: se generan a partir de lo que haya en las fichas.
  const simples: [keyof typeof RAIZ_CATEGORIA, string, string, (v: Via) => string, ((a: string, b: string) => number)?][] = [
    ['grado', 'Grados', 'Grado', (v) => gradoBase(v.data.grado), (a, b) => ordenGrado(a) - ordenGrado(b)],
    ['roca', 'Tipos de piedra', 'Tipo de piedra', (v) => v.data.roca],
    ['tipo', 'Tipos de escalada', 'Tipo de escalada', (v) => v.data.tipo],
  ];
  for (const [clave, tituloRaiz, grupo, valor, ordenar] of simples) {
    const raiz = RAIZ_CATEGORIA[clave];
    const grupos = agrupar(vias, valor, ordenar);
    const hijos = grupos.map(([slug, g]) => ({ titulo: g.nombre, url: urlCategoria(`${raiz}/${slug}`), total: g.vias.length }));
    for (const [slug, g] of grupos) {
      categorias.push({
        ruta: `${raiz}/${slug}`,
        titulo: g.nombre,
        grupo,
        padre: { titulo: tituloRaiz, url: urlCategoria(raiz) },
        hijos: [],
        vias: g.vias,
      });
    }
    categorias.push({ ruta: raiz, titulo: tituloRaiz, grupo, hijos, vias: [] });
  }
  return categorias;
}

// --- Etiquetas y autores ---

export async function todasLasEtiquetas() {
  const vias = await todasLasVias();
  const grupos = new Map<string, { nombre: string; vias: Via[] }>();
  for (const v of vias) {
    for (const nombre of v.data.etiquetas) {
      const slug = slugify(nombre);
      const g = grupos.get(slug) ?? { nombre, vias: [] };
      g.vias.push(v);
      grupos.set(slug, g);
    }
  }
  return [...grupos.entries()].map(([slug, g]) => ({ slug, ...g }));
}
