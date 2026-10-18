// Plugin de Markdown (Sätteri, el procesador de Astro 7): una foto con título,
// ![texto](foto.jpg "Pie de foto"), sale como figura con su pie visible, y todas las fotos se
// cargan en diferido (las entradas llevan hasta 30). El título de la imagen es el pie; el texto
// entre corchetes es el «alt», para lectores de pantalla.

const esBlanco = (nodo) => nodo.type === 'text' && !nodo.value.trim();
const enDiferido = { loading: 'lazy', decoding: 'async' };

export const piesDeFoto = {
  name: 'pies-de-foto',
  element: [
    {
      filter: ['p'],
      visit(parrafo, ctx) {
        const contenido = parrafo.children.filter((c) => !esBlanco(c));
        const [img] = contenido;
        if (contenido.length !== 1 || img.type !== 'element' || img.tagName !== 'img' || !img.properties?.title) return;
        const { title, ...propiedades } = img.properties;
        ctx.replaceNode(parrafo, {
          type: 'element',
          tagName: 'figure',
          properties: {},
          children: [
            { ...img, properties: { ...propiedades, ...enDiferido } },
            { type: 'element', tagName: 'figcaption', properties: {}, children: [{ type: 'text', value: String(title) }] },
          ],
        });
      },
    },
    {
      filter: ['img'],
      visit(img, ctx) {
        for (const [clave, valor] of Object.entries(enDiferido)) ctx.setProperty(img, clave, valor);
      },
    },
  ],
};
