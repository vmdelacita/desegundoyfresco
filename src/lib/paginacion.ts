/**
 * Vías por página (/ y /page/2/, /page/3/…, como en WordPress). La portada destaca la primera con
 * foto grande y pone 8 tarjetas debajo; de la 2 en adelante van 8 tarjetas (2 columnas × 4), sin huecos.
 */
export const PRIMERA_PAGINA = 9;
export const POR_PAGINA = 8;

export function totalPaginas(totalVias: number): number {
  return totalVias <= PRIMERA_PAGINA ? 1 : 1 + Math.ceil((totalVias - PRIMERA_PAGINA) / POR_PAGINA);
}

/** Las vías de una página (la 1 es la portada). */
export function viasDePagina<T>(vias: T[], pagina: number): T[] {
  if (pagina === 1) return vias.slice(0, PRIMERA_PAGINA);
  const inicio = PRIMERA_PAGINA + (pagina - 2) * POR_PAGINA;
  return vias.slice(inicio, inicio + POR_PAGINA);
}
