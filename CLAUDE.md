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
| 3 Diseño | Primera dirección programada (ver «Diseño»); Víctor debe probarla en local y ajustar. Faltan logo, la página «Explorar» y decidir si habrá modo oscuro |
| 4 Convertir las entradas antiguas | Hecha el 18 oct 2026 (ver «Conversión»): 128 publicadas + 13 borradores + 2 páginas, la web compila; Víctor debe revisarla en local y decidir las coordenadas que faltan |
| 5, 5b, 6, 7, 8 | Pendientes |


## Decisiones ya tomadas

- **Borradores** (13): se migran como `borrador: true`. El repositorio es público, así que se podrán leer en GitHub.
- **Pingbacks** (130): se descartan. Solo se importan los 31 comentarios reales, como texto fijo al final de cada post.
- **GIF animados**: los 3 que usan posts (`2017/04/timelapse1.gif`, `2020/04/timelapse_maladeta_01.gif`, `2016/05/ezgif-com-optimize.gif`) pasan a vídeo `.mp4` en bucle y sin sonido; `2017/04/timelapse.gif` (70 MB, sin uso) se descarta. `ffmpeg` está instalado.
- **Etiquetas**: se descartan `victor`, `destacado`, `destacada` y «Vía larga» / «via larga»; el resto se conserva.
- **Autores**: se usa el nombre de usuario de WordPress (Víctor es `otnoesmusica`, mostrado como «Víctor»).
- **Colaboradores**: solo escribe Víctor.
- **Generador**: Astro. Editor web, comentarios y suscripción por email se deciden en la Fase 5.

## Diseño (Fase 3, 17 oct 2026)

- **Referencias de Víctor**: Baker Mountain Guides (Awwwards), panoramicas360.net y auntirdepedra.com. Lo común: fondo blanco, fotos grandes, menú simple.
- **Fondo blanco**, sin modo oscuro por ahora: Víctor pidió el blanco y el plan preveía modo oscuro automático, así que queda por confirmar si lo quiere.
- **Menú superior** (fijo al bajar en escritorio): «Cómo monto reuniones» y «Mapa». «Quiénes somos» sobra; «Zonas» sale porque la navegación por zonas irá dentro del mapa (Fase 5). Las páginas de zona y de «Quiénes somos» siguen existiendo (conservan su URL); a las zonas se llega desde el menú de categorías de la portada.
- **La foto de portada es la imagen destacada de WordPress**: las 128 entradas publicadas la tienen y está en la biblioteca. La Fase 4 debe rellenar `portada` con la `_thumbnail_id` de cada entrada, no con la primera foto del texto. La página «¿Cómo monto reuniones?» también tiene (campo `portada` opcional en `paginas`).
- Portada = la vía más reciente a todo el ancho (`Hero.astro`) + «Últimas vías» en **dos columnas** (`TarjetaVia.astro`) y, a la derecha, el **menú de categorías** (`MenuCategorias.astro`: zonas, grados, piedra y tipo, desplegables y sin JavaScript; debajo de las tarjetas en pantallas estrechas). Lo mismo en `/page/N/`. Las páginas de zona, etiqueta y autor siguen a tres columnas y sin menú lateral. Las zonas son fotos con su nombre (`Tesela.astro`). Paginación: 9 en la portada (1 + 8) y 8 por página después (`src/lib/paginacion.ts`).
- **Página de la vía** (ajustes del 18 oct): bajo el título van las mismas tres tarjetas que en la portada (grado, longitud, zona; `chipsDeVia` en `src/lib/vias.ts`); la ficha no muestra el «tipo» (el campo sigue en la ficha y en las páginas de `/category/tipo-de-escalada/`); la fecha de publicación va en el pie, junto al autor; y al final hay dos tarjetas con la entrada anterior (más antigua) y la siguiente (más reciente) por fecha de publicación (`NavegacionVias.astro`, que reutiliza `TarjetaVia`).
- Tarjetas y cabeceras muestran el título **sin el «(285m, 6b)»** (`tituloCorto` en `src/lib/vias.ts`); la etiqueta `<title>` conserva el título completo. Grado y longitud salen en la ficha. Las **URLs no se tocan**: son las de WordPress (62 de las 128 llevan la longitud en el nombre, p. ej. `…-260m-v`, y el resto nunca la tuvo).
- **Color principal turquesa**. Los títulos sobre fotos (portada, vía, zonas, grado de la tarjeta) van en bloques turquesa **semitransparentes** (`--velo`) con texto blanco; `--turquesa` es para rellenos y `--acento` (más oscuro) para texto y enlaces, para que se lean sobre blanco.
- Tipografías **incluidas en la web con `@fontsource`**, sin pedirlas a Google (sin terceros ni aviso de cookies): **EB Garamond** para los títulos y las fichas bajo el título (referencia de Víctor: portadas de Quaderns Crema; se puede cambiar con `--titulos`). Con **cifras elzevirianas** (`oldstyle-nums`, como `\oldstylenums` en LaTeX): el paquete de Fontsource trae Garamond sin esa función, así que la web usa **una copia propia reducida a latín** en `src/assets/fonts/` (hecha con `pyftsubset` desde el Garamond completo, que conserva `onum` y `smcp`; licencia OFL incluida en la carpeta), **Montserrat ExtraBold (800)** en mayúsculas para los nombres de las vías (`--nombres`; el 900, Black, es aún más grueso; Víctor quería Lemon Milk, pero solo es gratis para uso personal y su archivo acabaría en el repositorio público, así que se usa esta alternativa libre OFL), **Barlow Condensed** para menú, etiquetas y datos de la ficha (`--etiquetas`) y **Source Serif 4** para el texto de las entradas (`--lectura`).
- Colores y tipografías, como variables CSS al principio de `src/layouts/Base.astro`.
- Pendiente de la Fase 5/6: las fotos de portada pesan hasta 1 MB y las tarjetas las cargan enteras; hará falta una versión reducida para las miniaturas.

## Conversión (Fase 4, 18 oct 2026)

- **Herramienta**: `scripts/convertir.mjs` (`npm run convertir`; README, «Convertir la exportación»). Por defecto es un informe en seco; `--escribir --sobrescribir` pisa lo corregido a mano, así que para rehacer entradas sueltas se usa `--solo`.
- **Resultado**: 141 entradas (128 publicadas, 13 borradores) y 2 páginas (`quienes-somos`, `como-monto-reuniones`); 31 comentarios reales; 801 fotos reducidas (552 MB en `public/wp-content/uploads/`); 3 GIF a `.mp4`. 12.498 enlaces y fotos internos del resultado comprobados (0 rotos); el texto convertido conserva las palabras del original. Informe privado: `import/informe-fase4.md`.
- **Grado y longitud salen del título** («(285m, 6b)»; con varias longitudes se suman), no de las categorías; la zona, la roca y el tipo, de las categorías de WordPress, resueltas por `slug` contra `src/data/zonas.json`.
- **Inferencias hechas** (listadas en el informe): 4 vías sin tipo → «Vía larga» (por longitud), Haus-Estrems Parte I copia de la Parte II, Cassiopea → Caliza (como las otras 16 de Montrebei), Mompart usa la primera foto como portada (no tenía imagen destacada).
- **Sin grado**: Gelida y Cavallers son crónicas de sector. El esquema ya no exige `grado`; esas dos no salen en las páginas de grado. Víctor puede ponerles un rango si lo prefiere.
- **Coordenadas** (19 oct 2026): las 128 publicadas tienen punto. Regla de Víctor: **una pared, un punto**; todas las vías de la misma pared comparten las mismas coordenadas (las dio él a mano o eligió el punto de una foto de esa pared). Quedan 16 vías con punto automático de foto (`coordenadasAuto: true`), sin unificar con su pared: Tozal del Mallo ×3 en Ordesa, Falconera de Montsant ×2, Calanques ×2, etc. Los puntos redondeados a 2 decimales (p. ej. Paret de Catalunya en Montrebei, `42.06, 0.68`) son aproximados, de ±1 km. Faltan 12 borradores, que no salen en el mapa.
- **Pies de foto**: la foto es `![](ruta "Pie")`; el plugin `src/lib/pies-de-foto.mjs` la convierte en `<figure>` con `<figcaption>`. El texto alternativo solo se conserva si WordPress tenía una frase (casi todos eran nombres de archivo y se descartan). Las fotos ya no enlazan a su archivo grande.
- **Enlaces internos** pasan a rutas relativas (`/2016/12/12/…`); los vídeos de YouTube quedan como enlace (incrustarlos cargaría YouTube, sin terceros).
- **Comentarios**: campo `comentarios` de la ficha (autor, fecha, texto; `respuesta: true` si contestan a otro), mostrados al final por `Comentarios.astro`. No se importa ni el correo ni la IP de quien comentó.
- **Borradores**: pueden dejar vacíos zona, roca, tipo y portada; el esquema lo exige solo a las publicadas.
- **Pendiente para Fases 6/7**: 5 direcciones antiguas que necesitan alias (tabla al final del informe y de `INVENTARIO.md`).

## Cómo está montado

- Astro 7 (requiere Node ≥ 22.22). `README.md` explica comandos, estructura y la ficha de la vía; no lo repitas aquí.
- La ficha de la vía y sus validaciones están en `src/content.config.ts`: si falta un campo, la zona no existe en `src/data/zonas.json`, la portada no está en `public/` o las coordenadas son inválidas, `npm run build` se detiene diciendo qué entrada y qué campo.
- Las URLs son las de WordPress (`/AAAA/MM/DD/nombre/`, `/category/zona/aragon/ordesa/`, `/tag/…`, `/author/…`, `/wp-content/uploads/…`) y terminan en barra. `src/lib/slug.ts` reproduce los slugs de WordPress: coincide con las 62 categorías y las 375 etiquetas del export.
- El grado se agrupa en categorías como en WordPress («6b+» y «6b/A1» van con «6b», «V+» con «V»).
- La URL de cada entrada antigua hay que tomarla del campo `<link>` del XML, no recalcularla desde la fecha. Cinco entradas tuvieron otro nombre en la URL (lista en `INVENTARIO.md`) y necesitarán un alias.
- Las fotos reducidas viven en `public/wp-content/uploads/` con la ruta original. Se generan con `npm run fotos -- --usadas` desde `import/media`; ese script borra los metadatos, GPS incluido, así que **las coordenadas hay que leerlas de las originales antes** (Fases 4 y 5b). Estimación para las 665 fotos usadas: unos 510 MB reducidos (límite de GitHub Pages: 1 GB).

## Trampas conocidas

- **Markdown en Astro 7**: el procesador por defecto es Sätteri, no remark/rehype. Los plugins van en `markdown.processor: satteri({ hastPlugins: [...] })` (ver `astro.config.mjs`); poner `rehypePlugins` hace fallar la compilación.
- **YAML**: al escribir la ficha, entrecomilla los textos con « #» o «:». Sin comillas, `#3` se pierde como comentario. El conversor de la Fase 4 debe escribir el frontmatter con una librería YAML, no con plantillas de texto.
- **Mayúsculas**: GitHub Pages distingue mayúsculas; cuatro fotos de `2018/12/` se llaman `IMG_20181208_*.jpg` y hay que conservar el nombre exacto.
- **Editores**: 59 de las 128 entradas publicadas están en formato de bloques de WordPress y 69 en el editor clásico (`[caption]`); el conversor tiene que manejar ambos.
- **RSS**: `/feed/` se sirve desde `feed/index.html`, con tipo `text/html`. Hay que comprobarlo con lectores RSS reales en la Fase 6.
- **Servidor de desarrollo**: `astro dev` en Astro 7 se pone solo en segundo plano cuando no hay terminal interactiva; se para con `npx astro dev stop`. El panel de vista previa de la app no lo arranca bien: lánzalo con Bash y abre `http://localhost:4321` en el navegador integrado.
- **Cobertura del mapa**: solo 36 de las 128 entradas publicadas tienen alguna foto con GPS; el resto necesitará coordenadas a mano (Fases 4 y 5b).
