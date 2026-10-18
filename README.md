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
| `npm run convertir` | Convierte la exportación de WordPress en vías y páginas (ver «Convertir la exportación»). Sin opciones no escribe nada. |

Para parar el servidor de desarrollo: `npx astro dev stop`.

## Dónde está cada cosa

```
src/content/vias/       una vía por archivo .md (el nombre del archivo es el final de la URL)
src/content/autores/    un archivo .json por autor (el nombre es su usuario de WordPress)
src/content/paginas/    páginas fijas (/quienes-somos/…)
src/data/zonas.json     árbol de zonas (Aragón › Ordesa…)
src/content.config.ts   la ficha de la vía y sus validaciones
src/pages/              las rutas de la web
src/components/         piezas del diseño (foto grande, tarjeta de vía, zona con foto…)
src/layouts/Base.astro  cabecera, menú, pie y colores y tipografías de toda la web
src/lib/                URLs, grados y categorías; pies-de-foto.mjs es el plugin de Markdown de los pies de foto
scripts/fotos.mjs       reducción de fotos
scripts/convertir.mjs   conversión de la exportación de WordPress a Markdown
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
grado: 6b                                  # opcional; las crónicas de un sector (Gelida) no lo llevan
longitud: 200                              # metros
roca: Arenisca                             # obligatorio
tipo: Vía larga                            # obligatorio
fechaEscalada: 2026-07-21
material: "Un juego de totem y un camalot #3"
horario: unas 4 horas
coordenadas: "42.64, -0.04"                # como lo copia Google Maps
coordenadasAuto: true                      # solo si salen del GPS de las fotos; las escritas a mano no la llevan
portada: /wp-content/uploads/2026/07/foto.jpg   # obligatorio; el archivo debe existir en public/
etiquetas: [fisura, techo]
borrador: false                            # true = no se publica
comentarios:                               # los de WordPress, como texto fijo (no hay formulario)
  - autor: Pere
    fecha: 2015-09-24
    texto: Y además, era mi cumpleaños.
  - autor: Víctor
    fecha: 2015-09-25
    respuesta: true                        # contesta al comentario anterior
    texto: ¡Felicidades!
---
```

Los **borradores** (`borrador: true`) pueden dejar vacíos zona, roca, tipo y portada.

**Pies de foto**: `![](/wp-content/uploads/2026/07/foto.jpg "Pie de foto")`. El texto entre comillas se ve bajo la foto; el que va entre corchetes es el texto alternativo para lectores de pantalla.

Si falta un campo obligatorio, la zona no existe, la portada no está o las coordenadas no tienen el formato correcto, `npm run build` se para y dice qué entrada y qué campo.

**Texto con «#» o «:»**: entre comillas, como en `material`. Sin ellas, YAML trata lo que va detrás de « #» como un comentario y se pierde.

## Direcciones

Se mantienen las de WordPress: vías en `/AAAA/MM/DD/nombre/`, zonas en `/category/zona/aragon/ordesa/`, grados en `/category/grado/6a/`, piedra en `/category/tipo-de-piedra/granito/`, tipo en `/category/tipo-de-escalada/via-larga/`, etiquetas en `/tag/fisura/`, autores en `/author/usuario/`, portada en `/` y `/page/2/`, y fotos en `/wp-content/uploads/AAAA/MM/nombre.jpg`.

Una vía cuenta en su zona y en todas las zonas que la contienen. El grado se agrupa como en WordPress («6b+» y «6b/A1» van con «6b», «V+» con «V»). Las zonas, grados, piedras, tipos y etiquetas sin ninguna vía publicada no generan página.

## Añadir una zona

Edita `src/data/zonas.json` y añade el nodo con su nombre y su `slug` (el nombre sin tildes, en minúsculas y con guiones).

## Convertir la exportación

`scripts/convertir.mjs` lee el XML de `import/wordpress-export/` y escribe una vía por entrada en `src/content/vias/` y las páginas en `src/content/paginas/`: texto en Markdown, ficha (zona, grado y longitud del título, roca, tipo, «Fecha», «Material» y «Horario» del final del texto), etiquetas, comentarios y coordenadas.

```
npm run convertir                                   informe en seco: no escribe nada
npm run convertir -- --escribir                     crea los archivos que no existen
npm run convertir -- --escribir --sobrescribir      reescribe también los que ya existen
npm run convertir -- --solo slug-1,slug-2           limita la conversión a esas entradas
```

**Con `--sobrescribir` se pierde lo corregido a mano** en esos archivos: úsalo solo para rehacer una entrada concreta (`--solo`), por ejemplo tras volver a exportar WordPress. También reduce los GIF animados a `.mp4` (necesita `ffmpeg`). Después, `npm run fotos -- --usadas` prepara las fotos nuevas.

Deja dos archivos en `import/` (privados): `informe-fase4.md`, con lo que conviene revisar a mano, e `sin-coordenadas.csv`, con las vías sin punto en el mapa.

**Coordenadas**: las de WordPress si las había; si no, las de las fotos con GPS de la entrada. La foto de portada, si lleva GPS, manda; si no, se toma el centro del grupo principal (radio de 3 km) y se descartan las fotos lejanas. Salen marcadas con `coordenadasAuto: true`.

## Fotos

`scripts/fotos.mjs` lee las originales de `import/media`, las reduce a 2.000 px de ancho como máximo, las comprime y las escribe en `public/wp-content/uploads/` con la misma ruta. No modifica las originales y **borra los metadatos, incluido el GPS**. Solo procesa JPG y PNG; los GIF se tratan aparte.
