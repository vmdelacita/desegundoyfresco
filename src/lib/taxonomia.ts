import zonasJson from '../data/zonas.json';

export interface NodoZona {
  nombre: string;
  slug: string;
  hijos?: NodoZona[];
}

export const zonas = zonasJson as NodoZona[];

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
