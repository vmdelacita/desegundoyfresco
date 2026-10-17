# De segundo y fresco: notas para Claude

Blog de escalada que se migra de WordPress.com a una web estática con Astro, alojada en GitHub Pages y servida en desegundoyfresco.com. El autor y dueño del blog es Víctor (GitHub: `vmdelacita`). Todo, el contenido y la comunicación con él, va en español.

## Cómo trabajar

- Se avanza **fase a fase** siguiendo `Plan de migración de De segundo y fresco.md`; no pases a la siguiente sin que Víctor haya probado el resultado en local (`npm run dev`).
- **Avisa antes de cada decisión** de la tabla de decisiones del plan (comentarios, editor web, suscripción por email) y propón una opción por defecto.
- El plan y `INVENTARIO.md` son **notas privadas**: están en `.gitignore` y no se suben al repositorio público. Léelos al empezar; contienen las decisiones tomadas y las cifras de partida. Si no están (otro equipo), pídeselos a Víctor.
- Lo que está en `import/` (XML de WordPress y fotos originales) nunca se sube ni se modifica.
- Las acciones hacia fuera (crear o cambiar repositorios, activar Pages, tocar DNS o la redirección de WordPress.com) las decide Víctor; confirma antes.

## Estado

| Fase | Estado |
| --- | --- |
| 0 Preparativos y cuentas | Hecha |
| 1 Exportar contenido e inventario | Hecha (`INVENTARIO.md`) |
| 2 Proyecto Astro y estructura | Hecha: esqueleto funcionando con 3 vías de muestra; repositorio `vmdelacita/desegundoyfresco` |
| 3 Diseño | Siguiente. Víctor debe aportar 2 o 3 referencias y lo que no quiere. El aspecto actual es provisional |
| 4 Convertir las entradas antiguas | Pendiente |
| 5, 5b, 6, 7, 8 | Pendientes |

Las 3 vías de muestra (`aliga-al-tozal-200m-6b`, `fulgencio-al-hueso`, `griviola-bella-al-montgros-250m-6a`) tienen el texto abreviado y la Fase 4 las sustituye por la conversión completa, con el mismo nombre de archivo.

## Decisiones ya tomadas

- **Borradores** (13): se migran como `borrador: true`. El repositorio es público, así que se podrán leer en GitHub.
- **Pingbacks** (130): se descartan. Solo se importan los 31 comentarios reales, como texto fijo al final de cada post.
- **GIF animados**: los 3 que usan posts (`2017/04/timelapse1.gif`, `2020/04/timelapse_maladeta_01.gif`, `2016/05/ezgif-com-optimize.gif`) pasan a vídeo `.mp4` en bucle y sin sonido; `2017/04/timelapse.gif` (70 MB, sin uso) se descarta. `ffmpeg` está instalado.
- **Etiquetas**: se descartan `victor`, `destacado`, `destacada` y «Vía larga» / «via larga»; el resto se conserva.
- **Autores**: se usa el nombre de usuario de WordPress (Víctor es `otnoesmusica`, mostrado como «Víctor»).
- **Colaboradores**: solo escribe Víctor.
- **Generador**: Astro. Editor web, comentarios y suscripción por email se deciden en la Fase 5.

## Cómo está montado

- Astro 7 (requiere Node ≥ 22.22). `README.md` explica comandos, estructura y la ficha de la vía; no lo repitas aquí.
- La ficha de la vía y sus validaciones están en `src/content.config.ts`: si falta un campo, la zona no existe en `src/data/zonas.json`, la portada no está en `public/` o las coordenadas son inválidas, `npm run build` se detiene diciendo qué entrada y qué campo.
- Las URLs son las de WordPress (`/AAAA/MM/DD/nombre/`, `/category/zona/aragon/ordesa/`, `/tag/…`, `/author/…`, `/wp-content/uploads/…`) y terminan en barra. `src/lib/slug.ts` reproduce los slugs de WordPress: coincide con las 62 categorías y las 375 etiquetas del export.
- El grado se agrupa en categorías como en WordPress («6b+» y «6b/A1» van con «6b», «V+» con «V»).
- La URL de cada entrada antigua hay que tomarla del campo `<link>` del XML, no recalcularla desde la fecha. Cinco entradas tuvieron otro nombre en la URL (lista en `INVENTARIO.md`) y necesitarán un alias.
- Las fotos reducidas viven en `public/wp-content/uploads/` con la ruta original. Se generan con `npm run fotos -- --usadas` desde `import/media`; ese script borra los metadatos, GPS incluido, así que **las coordenadas hay que leerlas de las originales antes** (Fases 4 y 5b). Estimación para las 665 fotos usadas: unos 510 MB reducidos (límite de GitHub Pages: 1 GB).

## Trampas conocidas

- **YAML**: al escribir la ficha, entrecomilla los textos con « #» o «:». Sin comillas, `#3` se pierde como comentario. El conversor de la Fase 4 debe escribir el frontmatter con una librería YAML, no con plantillas de texto.
- **Mayúsculas**: GitHub Pages distingue mayúsculas; cuatro fotos de `2018/12/` se llaman `IMG_20181208_*.jpg` y hay que conservar el nombre exacto.
- **Editores**: 59 de las 128 entradas publicadas están en formato de bloques de WordPress y 69 en el editor clásico (`[caption]`); el conversor tiene que manejar ambos.
- **RSS**: `/feed/` se sirve desde `feed/index.html`, con tipo `text/html`. Hay que comprobarlo con lectores RSS reales en la Fase 6.
- **Servidor de desarrollo**: `astro dev` en Astro 7 se pone solo en segundo plano cuando no hay terminal interactiva; se para con `npx astro dev stop`. El panel de vista previa de la app no lo arranca bien: lánzalo con Bash y abre `http://localhost:4321` en el navegador integrado.
- **Cobertura del mapa**: solo 36 de las 128 entradas publicadas tienen alguna foto con GPS; el resto necesitará coordenadas a mano (Fases 4 y 5b).
