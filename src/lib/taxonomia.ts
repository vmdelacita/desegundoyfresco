import zonasJson from '../data/zonas.json';
import rocasJson from '../data/rocas.json';
import tiposJson from '../data/tipos.json';
import { slugify } from './slug';

export interface NodoZona {
  nombre: string;
  slug: string;
  hijos?: NodoZona[];
}

/** Separador de los niveles de una zona: «Catalunya › Montserrat › Agulles». */
export const SEPARADOR_ZONA = ' › ';

/**
 * src/data/zonas.json es una lista plana de rutas («Catalunya», «Catalunya › Montserrat»…), que es lo que edita
 * el editor web y lo que ofrece el desplegable de zona. De ahí sale el árbol; el slug de cada zona es su nombre
 * sin tildes, en minúsculas y con guiones, como en WordPress.
 */
export function construirArbol(rutas: string[]): NodoZona[] {
  const raiz: NodoZona[] = [];
  const nodos = new Map<string, NodoZona>();
  for (const ruta of rutas) {
    const camino = ruta.split('›').map((n) => n.trim());
    const clave = camino.join(SEPARADOR_ZONA);
    if (camino.some((n) => !n)) throw new Error(`src/data/zonas.json: la zona «${ruta}» tiene un nivel vacío.`);
    if (nodos.has(clave)) throw new Error(`src/data/zonas.json: la zona «${clave}» está repetida.`);
    const nodo: NodoZona = { nombre: camino.at(-1)!, slug: slugify(camino.at(-1)!) };
    nodos.set(clave, nodo);
    if (camino.length === 1) {
      raiz.push(nodo);
      continue;
    }
    const padre = nodos.get(camino.slice(0, -1).join(SEPARADOR_ZONA));
    if (!padre) throw new Error(`src/data/zonas.json: la zona «${clave}» necesita que exista antes «${camino.slice(0, -1).join(SEPARADOR_ZONA)}».`);
    (padre.hijos ??= []).push(nodo);
  }
  return raiz;
}

export const zonas = construirArbol(zonasJson.zonas);

/** Valores permitidos de roca y de tipo de escalada (src/data/rocas.json y tipos.json). */
export const rocas: string[] = rocasJson.valores;
export const tiposDeEscalada: string[] = tiposJson.valores;

/** Busca una zona por su camino de nombres (["Aragón", "Ordesa"]) y devuelve los nodos recorridos. */
export function buscarZona(camino: string[]): NodoZona[] | undefined {
  const nodos: NodoZona[] = [];
  let nivel: NodoZona[] | undefined = zonas;
  for (const nombre of camino) {
    const nodo: NodoZona | undefined = nivel?.find((n) => n.nombre === nombre);
    if (!nodo) return undefined;
    nodos.push(nodo);
    nivel = nodo.hijos;
  }
  return nodos;
}

/** Lista todos los caminos de zona válidos, para los mensajes de error. */
export function caminosDeZona(nivel: NodoZona[] = zonas, prefijo: string[] = []): string[] {
  return nivel.flatMap((n) => {
    const camino = [...prefijo, n.nombre];
    return [camino.join(' › '), ...caminosDeZona(n.hijos ?? [], camino)];
  });
}

/**
 * Grado «base» para agrupar vías, igual que las categorías de WordPress:
 * "6a/A1" → "6a", "6b+" → "6b", "V+/C1" → "V", "IV+" → "IV".
 */
export function gradoBase(grado: string): string {
  return grado.split('/')[0].trim().replace(/[+-]$/, '');
}

const ROMANOS: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5 };

/** Número para ordenar grados de menor a mayor: III < IV < V < 6a < 6b < 7a… */
export function ordenGrado(base: string): number {
  if (base in ROMANOS) return ROMANOS[base];
  const m = base.match(/^(\d+)([abc])?/);
  if (!m) return 99;
  return Number(m[1]) + (m[2] ? (m[2].charCodeAt(0) - 96) / 10 : 0);
}

/** Cadenas fijas de las URLs de categoría que ya usaba WordPress. */
export const RAIZ_CATEGORIA = {
  zona: 'zona',
  grado: 'grado',
  roca: 'tipo-de-piedra',
  tipo: 'tipo-de-escalada',
} as const;
