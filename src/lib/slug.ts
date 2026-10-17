/**
 * Convierte un nombre en el "slug" de una URL con las mismas reglas que WordPress:
 * sin tildes, en minúsculas, sin apóstrofes ni «+», y con guiones entre palabras.
 * Ejemplos: "Aigüestortes" → "aiguestortes", "L'Escala" → "lescala", "V+" → "v".
 */
export function slugify(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’+]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
