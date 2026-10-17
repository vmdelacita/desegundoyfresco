# De segundo y fresco

Blog de escalada hecho con [Astro](https://astro.build). El plan completo de la migración desde WordPress está en `Plan de migración de De segundo y fresco.md` y el recuento de lo exportado en `INVENTARIO.md`.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm install` | Instala las dependencias (solo la primera vez). |
| `npm run dev` | Arranca la web en local, en http://localhost:4321. Los cambios se ven al guardar. |
| `npm run build` | Genera la web completa en `dist/` y comprueba que todas las fichas son válidas. |
| `npm run preview` | Sirve `dist/` tal y como quedará en GitHub Pages. |
| `npm run fotos -- --usadas` | Reduce las fotos que usan las vías (ver más abajo). |

Para parar el servidor de desarrollo: `npx astro dev stop`.

## Dónde está cada cosa

```
src/content/vias/       una vía por archivo .md (el nombre del archivo es el final de la URL)
src/content/autores/    un archivo .json por autor (el nombre es su usuario de WordPress)
src/content/paginas/    páginas fijas (/quienes-somos/…)
src/data/zonas.json     árbol de zonas (Aragón › Ordesa…)
src/content.config.ts   la ficha de la vía y sus validaciones
src/pages/              las rutas de la web
src/lib/                URLs, grados y categorías
scripts/fotos.mjs       reducción de fotos
public/wp-content/uploads/   fotos ya reducidas, con la misma ruta que en WordPress
import/                 exportación de WordPress y fotos originales (no se sube a GitHub)
```

## La ficha de una vía

```yaml
---
titulo: Àliga al Tozal (200m, 6b)          # obligatorio
fecha: 2026-07-24                          # obligatorio; con el nombre del archivo forma la URL
autor: otnoesmusica                        # obligatorio; un archivo de src/content/autores
zona: [Aragón, Ordesa]                     # obligatorio; debe existir en src/data/zonas.json
grado: 6b                                  # obligatorio
longitud: 200                              # metros
roca: Arenisca                             # obligatorio
tipo: Vía larga                            # obligatorio
fechaEscalada: 2026-07-21
material: "Un juego de totem y un camalot #3"
horario: unas 4 horas
coordenadas: "42.64, -0.04"                # como lo copia Google Maps
portada: /wp-content/uploads/2026/07/foto.jpg   # obligatorio; el archivo debe existir en public/
etiquetas: [fisura, techo]
borrador: false                            # true = no se publica
---
```

Si falta un campo obligatorio, la zona no existe, la portada no está o las coordenadas no tienen el formato correcto, `npm run build` se para y dice qué entrada y qué campo.

**Texto con «#» o «:»**: entre comillas, como en `material`. Sin ellas, YAML trata lo que va detrás de « #» como un comentario y se pierde.

## Direcciones

Se mantienen las de WordPress: vías en `/AAAA/MM/DD/nombre/`, zonas en `/category/zona/aragon/ordesa/`, grados en `/category/grado/6a/`, piedra en `/category/tipo-de-piedra/granito/`, tipo en `/category/tipo-de-escalada/via-larga/`, etiquetas en `/tag/fisura/`, autores en `/author/usuario/`, portada en `/` y `/page/2/`, y fotos en `/wp-content/uploads/AAAA/MM/nombre.jpg`.

Una vía cuenta en su zona y en todas las zonas que la contienen. El grado se agrupa como en WordPress («6b+» y «6b/A1» van con «6b», «V+» con «V»). Las zonas, grados, piedras, tipos y etiquetas sin ninguna vía publicada no generan página.

## Añadir una zona

Edita `src/data/zonas.json` y añade el nodo con su nombre y su `slug` (el nombre sin tildes, en minúsculas y con guiones).

## Fotos

`scripts/fotos.mjs` lee las originales de `import/media`, las reduce a 2.000 px de ancho como máximo, las comprime y las escribe en `public/wp-content/uploads/` con la misma ruta. No modifica las originales y **borra los metadatos, incluido el GPS**. Solo procesa JPG y PNG; los GIF se tratan aparte.
