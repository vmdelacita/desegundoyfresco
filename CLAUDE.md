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
| 5 Funcionalidades | En marcha: el **mapa** (`src/pages/mapa-de-escaladas.astro`) está programado y probado en local (19 oct 2026); buscador con Pagefind programado (ver «Buscador»); contacto (ver «Contacto»); editor web (Sveltia en `/admin/`, ver «Editor web») programado, falta que Víctor lo pruebe en local con Chrome; estadísticas (GoatCounter, ver «Estadísticas») activas en la web publicada; falta que Víctor pruebe el editor |
| 5b | Sin hacer, y en buena parte superada: el editor borra el GPS y las coordenadas se ponen a mano por pared (ver «Editor web») |
| 6 Publicar en GitHub Pages | Preparado en local (ver «Publicación»); falta que Víctor active Pages y el DNS. No está subido |
| 7, 8 | Pendientes |


## Decisiones ya tomadas

- **Borradores** (13): se migran como `borrador: true`. El repositorio es público, así que se podrán leer en GitHub.
- **Pingbacks** (130): se descartan. Solo se importan los 31 comentarios reales, como texto fijo al final de cada post.
- **GIF animados**: los 3 que usan posts (`2017/04/timelapse1.gif`, `2020/04/timelapse_maladeta_01.gif`, `2016/05/ezgif-com-optimize.gif`) pasan a vídeo `.mp4` en bucle y sin sonido; `2017/04/timelapse.gif` (70 MB, sin uso) se descarta. `ffmpeg` está instalado.
- **Etiquetas**: se descartan `victor`, `destacado`, `destacada` y «Vía larga» / «via larga»; el resto se conserva.
- **Autores**: se usa el nombre de usuario de WordPress (Víctor es `otnoesmusica`, mostrado como «Víctor»).
- **Colaboradores**: solo escribe Víctor.
- **Generador**: Astro. Editor web y suscripción por email se deciden en la Fase 5.
- **Comentarios** (19 oct 2026): **no habrá comentarios nuevos**. Se descartó Cusdis porque su repositorio está archivado y declarado obsoleto (17 jul 2026); Giscus (exige cuenta de GitHub) y Hyvor Talk (de pago) tampoco convencieron. Los 31 comentarios antiguos siguen como texto fijo (`Comentarios.astro`, campo `comentarios` de la ficha). En su lugar, una página `/contacto/` en el menú superior (ver «Contacto»).

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

## Mapa (Fase 5, 19 oct 2026)

- Leaflet 1.9.4 (npm, sin CDN) con teselas de **OpenTopoMap** (único tercero: ven la IP, sin cookies). Un marcador por punto distinto (75 para 128 vías); si hay varias vías en el punto, el marcador lleva su número y el cuadro las lista. Botones por zona de primer nivel (`zonas.json`) que encuadran el mapa, más «Península y Pirineos» (vista inicial) y «Ver todo». Los datos salen de las fichas al compilar. La rueda del ratón solo hace zoom cuando el mapa tiene el foco. En móvil los botones van en una fila deslizante.
- Fuera de esta versión: filtros por grado y roca (irán en «Explorar»), agrupar marcadores al alejarse, fotos en los cuadros.

## Buscador (Fase 5, 19 oct 2026)

- **Pagefind** (`devDependencies`), sin servidor ni terceros. `npm run build` ahora es `astro build && pagefind --site dist`: genera el índice en `dist/pagefind/`. En `npm run dev` se sirve desde `dist/pagefind/` (integración `buscadorEnDesarrollo` de `astro.config.mjs`), así que hace falta haber ejecutado `npm run build` una vez; sin eso, `/buscar/` muestra un aviso. El índice de desarrollo es el de la última compilación.
- Página `/buscar/` (`src/pages/buscar.astro`) con la interfaz por defecto de Pagefind restilizada con las variables de la web; acepta `?q=`. Está en el menú. Solo se indexa lo marcado con `data-pagefind-body`: cada vía y las 2 páginas fijas (130 páginas). Se indexan título, texto y comentarios; la ficha, las tarjetas de la cabecera y la navegación a vías vecinas llevan `data-pagefind-ignore` para que los extractos salgan limpios. Filtros: zona, grado (base) y roca, en `<div hidden data-pagefind-ignore>` de la página de la vía.
- Limitación: como la ficha no se indexa, buscar «Riglos» solo encuentra vías que lo nombren en el texto (los filtros sí cubren la zona). Miniaturas: son la foto de portada entera (hasta 1 MB), cargada en diferido; hará falta una versión reducida (pendiente ya anotado para las tarjetas).

## Contacto (Fase 5, 19 oct 2026)

- Página `/contacto/` (`src/pages/contacto.astro`), en el menú superior, con formulario de nombre, correo y mensaje. Lo recibe **Web3Forms** (gratis, 250 mensajes/mes) y lo reenvía al correo de Víctor, que no aparece en la web. La clave de acceso está en `src/data/contacto.json`: es pública por diseño (solo permite enviar mensajes a Víctor). Si se vacía, la página muestra un aviso en vez del formulario.
- Contra el spam: campo trampa `botcheck`. Si entrara spam, activar hCaptcha en Web3Forms (cargaría un tercero, por eso solo si hiciera falta). El envío usa `fetch` con respuesta en la propia página; sin JavaScript, el formulario se envía igual y Web3Forms muestra su página de gracias.
- Al final de cada vía **no** hay enlace al formulario (Víctor lo descartó).

## Editor web (Fase 5, 19 oct 2026)

- **Sveltia CMS** en `/admin/` (`public/admin/index.html` + `config.yml`), elegido frente a Pages CMS porque vive en la propia web y reduce las fotos en el navegador (así no hace falta una acción de GitHub para reducirlas; la Fase 5b queda sin el GPS automático, ya que el editor borra el GPS y las coordenadas se ponen a mano por pared). Se instala con npm (`@sveltia/cms`) y `scripts/copiar-sveltia.mjs` lo copia a `public/admin/sveltia/` antes de `dev` y `build` (no se sube a GitHub). Versiones 0.x, pero el proyecto se declara «feature complete».
- **Entrada**: en local, «Work with Local Repository» en Chrome/Edge (sin token); en la web publicada, token de GitHub de grano fino (solo este repositorio, permiso «Contents: read and write»), caducidad a elección de Víctor, guardado en el navegador de cada dispositivo. No hay servicio OAuth. Cada «Guardar» es un commit en `main`.
- **Listas ampliables**: `src/data/zonas.json` (lista plana de rutas con « › »; el árbol y los slugs se calculan en `src/lib/taxonomia.ts`), `rocas.json` y `tipos.json`. El esquema valida contra ellas (roca y tipo, con `z.enum`; zona, con `buscarZona`). En el editor son «Listas» y los desplegables de la ficha leen esos mismos archivos (relation sobre una colección de archivos), así que añadir un valor lo ofrece al momento. No hay botón «+» dentro de la ficha. `zona` se guarda como texto (`Aragón › Ordesa`); el esquema sigue aceptando la lista `[Aragón, Ordesa]`, pero **no hay que usarla**: el editor, al guardar una ficha con la zona en lista, la recortaba a su primer nivel (lo vimos en la prueba del 19 oct). Las 131 fichas con zona se migraron a texto.
- **`config.yml` debe seguir a `src/content.config.ts`**: incluye todos los campos (también `comentarios` y `coordenadasAuto`) para que guardar una ficha antigua no pierda datos. Sin verificar todavía: que el editor conserve los pies de foto (`![](ruta "Pie")`) y el orden de los campos al guardar una ficha antigua.
- Fotos nuevas: `public/wp-content/uploads/nuevas/` (2000 px, WebP). Las antiguas siguen en `AAAA/MM/` en `.jpg`.

## Estadísticas (Fase 5, 18 oct 2026)

- **Decisión de Víctor: las dos**: GoatCounter para las visitas del día a día y Search Console (Fase 7) para el posicionamiento en Google. GoatCounter es gratis para uso personal, no usa cookies (sin banner) y no guarda la IP; es un tercero más, junto a OpenTopoMap y Web3Forms.
- **Está apagado**: el código de la cuenta va en `src/data/estadisticas.json` (`codigoGoatCounter`, el «xxx» de `xxx.goatcounter.com`) y sigue vacío porque la cuenta la crea Víctor (goatcounter.com/signup). Mientras esté vacío no se carga nada. Un código con mayúsculas, espacios u otros signos detiene `npm run build` con un mensaje.
- **Cómo funciona**: `Base.astro` añade el script oficial (`gc.zgo.at/count.js`) al `<head>` solo en la web compilada (`import.meta.env.PROD`), así que `npm run dev` no cuenta nada. Lo llevan todas las páginas con ese layout (también la 404); no lo llevan `/admin/` ni `/feed/`. Con código puesto, el pie muestra «Visitas contadas sin cookies con GoatCounter».
- **Visitas propias**: GoatCounter no cuenta `localhost`; para no contarse a sí mismo en la web publicada, Víctor abre una vez `https://desegundoyfresco.com/#toggle-goatcounter` en cada navegador.
- **Comprobado el 18 oct**: con código de prueba, 523 de 525 HTML llevan el script (faltan `/admin/` y `/feed/`); con el código vacío, ninguno; con uno inválido, la compilación se detiene. **No se ha podido comprobar el conteo real** (hace falta la cuenta y la web publicada). Tras la Fase 6, mirar en el panel que llegan visitas.
- **Comparar con WordPress.com**: las cifras de partida (unas 60–65 vistas al día) son de WordPress.com, que cuenta distinto (incluye bots y lectores de RSS); no esperar números idénticos.

## Publicación (Fase 6, 18 oct 2026)

- **Despliegue**: `.github/workflows/desplegar.yml` usa el flujo oficial de Astro (`actions/checkout@v7`, `withastro/action@v6` con Node 24 y `actions/deploy-pages@v5`; versiones vistas en GitHub el 18 oct). En cada push a `main` ejecuta `npm ci` y `npm run build` y publica `dist/`. **Sin probar en GitHub todavía**: solo se ha validado el YAML y que un clon limpio del repositorio (`npm ci` y `npm run build`, sin `import/`) compila.
- **Tamaño**: `dist/` pesa unos 562 MB reales (`du` en macOS marca más, ~680 MB, por bloques). El límite de GitHub Pages es 1 GB; casi todo son las 802 fotos de `public/wp-content/uploads/` (551 MB), así que el margen se gasta con fotos.
- **Alias** (`src/data/alias.json`, leído por `redirects` en `astro.config.mjs`): las 5 direcciones que WordPress redirigía por cambio de nombre (informe de la Fase 4) ahora son páginas con `<meta refresh>` y `canonical` hacia la dirección actual, `noindex` y fuera del mapa del sitio. Mismo mecanismo para `/category/otros/` → portada (decisión de Víctor, 18 oct): «Otros» era una categoría suelta de WordPress, ni zona, ni grado, ni roca, ni tipo, con 2 vías publicadas (Haus-Estrems Parte I y Regular Northwest Face), que no tiene página propia en la web nueva. Cuando se active la redirección de WordPress.com, el `<slug>` antiguo llega a esas páginas y de ahí a la entrada.
- **Comprobador** (`npm run comprobar-urls`, tras `npm run build`; lee el XML de `import/`): comprueba que existen en `dist/` las 128 entradas, las 5 direcciones antiguas, las páginas, las categorías, etiquetas y autores que usan, y las 656 fotos que muestran las entradas. Los GIF cuentan como hechos si existe su `.mp4`. Las 4 etiquetas descartadas (`victor`, `destacado`, `destacada`, `via-larga`) se cuentan aparte. Resultado del 18 oct: todo existe (sale con código 0). Las fotos de la biblioteca que ninguna entrada usa (897 adjuntos, 656 direcciones usadas) no se migraron.
- **Pasos de Víctor** (plan, Fase 6; todos hacia fuera, los decide él): verificar el dominio en GitHub (TXT en Porkbun), DNS en Porkbun (4 A, 4 AAAA y un CNAME `www`; confirmar antes las IP en la documentación de GitHub Pages), Settings → Pages → Source «GitHub Actions», Custom domain `desegundoyfresco.com` y «Enforce HTTPS». Antes de subir el flujo conviene tener ya el dominio configurado: sin él, la primera publicación quedaría en `vmdelacita.github.io/desegundoyfresco/`, donde las rutas que empiezan por `/` no cargan fotos ni estilos.

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
