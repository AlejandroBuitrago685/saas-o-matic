# 10 · Diseño visual

| Campo | Valor |
|---|---|
| Estado | **v2** (D-191, §7): rediseño a partir de tres maquetas, con el dashboard aprobado por el usuario en su punto de control (2026-11-14). La v1 se validó en el punto de control de P5 (2026-11-13), con dos ajustes: valores de la tarjeta del cliente a tamaño de cuerpo, y cabecera con navegación y botón «Nuevo cliente». |
| Decisiones | D-122 (dirección y tokens), D-123 (tipografía), D-124 (contraste), D-125 (componentes en CSS global y guardias), D-191 (v2: maquetas, iconos, columnas del detalle y cabecera en móvil) |
| Código | [`apps/web/src/styles/`](../../apps/web/src/styles/): `tokens.css`, `base.css`, `components.css`, `range.css` · iconos: [`shared/ui/icon.ts`](../../apps/web/src/app/shared/ui/icon.ts) e [`icon-paths.ts`](../../apps/web/src/app/shared/ui/icon-paths.ts) |
| Test | [`tools/design-tokens.test.ts`](../../tools/design-tokens.test.ts) (contraste) · `check-forbidden-patterns` (sin colores arbitrarios) · [`e2e/specs/projection-fit.spec.ts`](../../e2e/specs/projection-fit.spec.ts) (la cifra más larga cabe en una línea) |

## 1. Referencia y criterio

SaaS-O-Matic es una herramienta interna del equipo comercial de Roams, así que debe parecer una **extensión natural
de [roams.es](https://roams.es/)**: misma familia visual, no una copia.

**Cómo se analizó (2026-11-13):** con el navegador, leyendo el CSS que sirve la web (`getComputedStyle` de botones,
tarjetas y titulares, y las *custom properties* de `:root`). La web tiene **su propio sistema de diseño en dos capas**:
primitivos (`--p-lavanda-*`, `--p-neutral-*`, `--p-feedback-*`) y semánticos (`--text-*`, `--bg-*`,
`--interactive-*`, `--border-*`, `--shadow-*`). De ahí salen **los valores**; los nombres y la estructura de nuestros
tokens son propios.

**Qué no se toma:** ni el logotipo, ni imágenes o ilustraciones, ni textos, ni ficheros (tampoco sus `.woff2`). El nombre
es SaaS-O-Matic y la única mención es «Prueba técnica para Roams», discreta, en el pie.

### 1.1 Lo que se observa en roams.es

| Aspecto | En roams.es |
|---|---|
| Tipografía | Montserrat 400–800, autoalojada. Titulares en 800 con **una palabra de acento en lavanda** («Un gestor *para tu hogar*»). |
| Color de acción | Lavanda `#3838EC` (`--interactive-primary-bg`, enlaces y foco). Los componentes antiguos usan `#4040E3`. |
| Neutros | Fríos, con un punto de azul: tinta `#0D0D1A`, cuerpo `#4A4D56`, apagado `#666972`, superficies `#EEF0F6` y `#F5F7FB`. |
| Estado | Cada color en tono suave (fondo) y fuerte (texto): éxito, aviso, peligro e información. |
| Escala | Cuerpo 16/28, pequeño 14/24, mínimo 12/20; titulares con un factor 1,14 y en 24/32, 36/44 y 40/48. |
| Espaciado | Rejilla de 4 px (`--dimension-4` … `--dimension-128`); tarjetas con 16 o 24 px de relleno; ancho máximo 1200 px. |
| Formas | Radios 8 (botones), 12 (opciones), 16 (tarjetas) y píldora; sombras suaves y **centradas**, sin desplazamiento. |
| Botones | Primario lavanda con texto blanco en 700; secundario blanco con borde fino oscuro; suave en lavanda claro con texto `#313087`. Alturas de control 40/48/56. |
| Tarjeta destacada | La calculadora de ahorro: fondo `#F7F7FE`, **borde de 3 px lavanda**, radio 16 y la cifra grande en 800 lavanda. |
| Foco | `outline: 2px dashed` lavanda con 2 px de separación. |
| Tono | Tuteo, cercano y directo; frases cortas; verbos de acción en los botones. |

### 1.2 Cómo se traslada (familia, no copia)

- **Se mantiene:** la tipografía, la lavanda como **único** color de acción, los neutros fríos, los radios, las sombras
  suaves, el foco discontinuo y el tuteo.
- **Cambia, porque es una herramienta y no una web de captación:** sin *hero*, sin fotos ni ilustraciones, sin emojis;
  titulares contenidos (el título de página llega a 32 px desde 640 px, D-191; el total de la proyección, a 48 px);
  más densidad (cuerpo 16/24 en vez de 16/28).
- **Marca:** logotipo de texto «SaaS-**O-Matic**» en Montserrat 800, con «O-Matic» en lavanda: el mismo gesto que la
  palabra de acento de sus titulares.
- **Firma visual:** el **panel de proyección** del simulador reutiliza el patrón de su calculadora (borde de 3 px,
  fondo tintado, total en 36/44 y 800). Es el único elemento «de marketing» de la app, y está donde el comercial mira.
- **Cabecera** como la suya: navegación a la izquierda («Clientes») y la acción principal a la derecha («Nuevo cliente»).
  El grupo de la derecha admite el selector de divisa y el indicador de tipos de P8. Desde la v2 (D-191), a 360 px va
  en tres filas: logotipo y navegación; tipos y divisa; y «Nuevo cliente» a lo ancho. Solo es fija desde 640 px: en
  móvil se desplaza con la página, para no tapar media pantalla.

## 2. Tokens

En Tailwind 4 los tokens viven en `@theme` (CSS, sin fichero de configuración JS). **La paleta, los tamaños, los radios
y las sombras por defecto de Tailwind se vacían** (`--color-*: initial`, etc.): `bg-slate-50` o `rounded-xl` dejan de
generar CSS, así que no se puede salir del sistema por descuido. Los colores arbitrarios (`bg-[#…]`) los rechaza
`check-forbidden-patterns` (D-125).

### 2.1 Color

| Token (`bg-*`, `text-*`, `border-*`) | Valor | Origen en roams.es | Uso |
|---|---|---|---|
| `canvas` | `#F5F7FB` | `--p-neutral-0050` | Fondo de la página. |
| `surface` | `#FFFFFF` | `--bg-canvas`, `--bg-surface-elevated` | Tarjetas, cabecera, pie y campos. |
| `surface-muted` | `#EEF0F6` | `--bg-surface` | Esqueletos, fondos deshabilitados, *hover* del botón secundario. |
| `ink` | `#0D0D1A` | `--text-emphasis` | Titulares y valores. |
| `ink-soft` | `#4A4D56` | `--text-body` | Texto corrido. |
| `ink-muted` | `#666972` | `--text-muted` | Etiquetas, ayudas y fechas. |
| `ink-disabled` | `#A1A4AE` | `--text-disabled` | Controles deshabilitados (ver §3). |
| `on-primary` | `#FFFFFF` | `--interactive-primary-text` | Texto sobre el botón primario. |
| `primary` | `#3838EC` | `--interactive-primary-bg` (`--p-lavanda-600`) | Acción principal, enlaces, foco, total de la proyección, pulgar del slider. |
| `primary-hover` | `#1515DD` | `--interactive-link-hover` (`--p-lavanda-700`) | *Hover* del primario y de los enlaces. |
| `primary-active` | `#0F0FA1` | `--interactive-link-pressed` (`--p-lavanda-800`) | Pulsado. |
| `primary-soft` | `#E4E4FC` | `--interactive-secondary-bg` (`--p-lavanda-100`) | Botón suave y etiquetas (plan, tipo de identificador). |
| `primary-soft-hover` | `#D3D3FB` | `--p-lavanda-200` | *Hover* del botón suave. |
| `primary-tint` | `#F7F7FE` | Fondo de la calculadora de ahorro | Panel de proyección. |
| `primary-ink` | `#313087` | `--interactive-secondary-text` (`--p-lavanda-bic`) | Texto sobre `primary-soft`. |
| `line` | `#E0E3EA` | `--border-default` | Bordes decorativos (tarjetas, separadores). |
| `line-control` | `#666972` | `--border-control` | Borde de los campos de formulario. |
| `track` | `#83868F` | `--p-neutral-0600` | Pista del slider (**ajuste**, ver §3). |
| `success-fg` / `success-bg` | `#047857` / `#E8F8EE` | `--feedback-success-text` / `-bg` | Avisos de éxito. |
| `warning-fg` / `warning-bg` | `#8A5A00` / `#FFF3E0` | `--feedback-warning-text` / `-bg` | Avisos (tipos desactualizados en P8). |
| `danger-fg` / `danger-bg` | `#B00038` / `#FDE7ED` | `--feedback-danger-text` / `-bg` | Errores y borde de campo inválido. |
| `info-fg` / `info-bg` | `#0054C2` / `#E3F4FF` | `--feedback-info-text` / `-bg` | Información. |

### 2.2 Tipografía

| Token | Valor | Origen | Uso |
|---|---|---|---|
| `font-sans` | `'Montserrat Variable', 'Montserrat', ui-sans-serif, system-ui, sans-serif` | `--p-font-family-montserrat` | Todo. |
| `font-normal`, `font-semibold`, `font-bold`, `font-extrabold` | 400, 600, 700, 800 | `@font-face` 400–800; `--p-font-weight-extrabold` | 400 texto, 600 etiquetas, 700 botones, 800 titulares y totales. |
| `text-small` | 14/24 | `--s-size` / `--s-line` | Etiquetas, ayudas, errores de campo, pie. |
| `text-body` | 16/24 | `--b-size` (línea 28 en roams.es) | Cuerpo y **valores** (tarjeta del cliente, historial). Interlineado 24 por densidad de herramienta. |
| `text-title-sm` | 18/26 | `--tD` (16 × 1,14) | Títulos de sección, logotipo. |
| `text-title-lg` | 24/32 | `--title-a` | Título de página en móvil; títulos de tarjeta desde 640 px; cifras de métricas e historial. |
| `text-title-xl` | 32/40 | Propio (D-191), entre los 24/32 y 36/44 de la referencia | Título de página desde 640 px; cifras de métricas con sitio (D-191). |
| `text-display` | 36/44 | `--p-font-size-36` / `--p-font-lineheight-44` | Total de la proyección, con cifras de 11 a 14 caracteres. |
| `text-display-xl` | 48/56 | Propio (D-191), sobre la rejilla de 4 px | Total de la proyección, con cifras de hasta 10 caracteres, como «169,40 €» (D-191). |

Solo hay tokens para lo que la interfaz usa: el 12/20 (`--m-size`), el 21/28 (`--tC`) y el peso 500 de roams.es no se
definen hasta que una vista los necesite, así que ningún texto de la app baja de 14 px.

Los importes usan `tabular-nums` (Montserrat tiene `tnum`) y no se parten entre la cifra y el signo (`.amount`).

### 2.3 Forma, profundidad y medidas

| Token | Valor | Origen | Uso |
|---|---|---|---|
| `rounded-sm` | 8 px | `--radius-sm` | Botones y campos. |
| `rounded-md` | 12 px | `--radius-md` | Avisos. |
| `rounded-lg` | 16 px | `--radius-lg` | Tarjetas y panel de proyección. |
| `rounded-full` | píldora | `--radius-full` | Etiquetas y slider (utilidad estática de Tailwind). |
| `shadow-card` | `0 0 8px -1px rgb(13 13 26 / .12)` | `--shadow-200` | Tarjetas. |
| `shadow-raised` | `0 0 18px -2px rgb(13 13 26 / .16)` | `--shadow-400` | Avisos flotantes. |
| `shadow-header` | `0 10px 20px rgb(0 0 0 / .05)` | Sombra de su barra superior | Cabecera fija. |
| `max-w-app` | 1200 px | `--w-large` | Ancho del contenido. |
| Espaciado | base de 4 px (la de Tailwind, sin cambios) | `--dimension-4` … | Rellenos de tarjeta 16/24 (`--padding-card`, `--padding-card-spacious`). |
| Alto de control | 48 px (`min-h-12`); 44 px en la cabecera | `--control-height-md` | Siempre ≥ 44 px táctiles (spec 05 §5). |

## 3. Contraste (WCAG 2.1 AA)

Calculado con la fórmula de WCAG (luminancia relativa) y **comprobado en cada ejecución** por
`tools/design-tokens.test.ts`, que lee `tokens.css`: si alguien cambia un color y un par baja del umbral, el test
falla (probado cambiando `ink-muted`). Umbrales: 4,5:1 para texto (1.4.3) y 3:1 para bordes, foco, iconos y partes
del slider (1.4.11).

| Par | Ratio | Umbral |
|---|---|---|
| `ink` sobre `surface` / `canvas` / `surface-muted` | 19,27 / 17,97 / 16,91 | 4,5 |
| `ink-soft` sobre `surface` / `canvas` / `surface-muted` | 8,44 / 7,87 / 7,41 | 4,5 |
| `ink-muted` sobre `surface` / `canvas` / `surface-muted` / `primary-tint` | 5,49 / 5,11 / 4,81 / 5,14 | 4,5 |
| `on-primary` sobre `primary` / `primary-hover` / `primary-active` | 7,13 / 9,62 / 13,10 | 4,5 |
| `primary` sobre `surface` / `canvas` / `primary-tint` (enlaces, total) | 7,13 / 6,65 / 6,69 | 4,5 |
| `primary-ink` sobre `primary-soft` / `primary-soft-hover` | 8,83 / 7,61 | 4,5 |
| Estado `*-fg` sobre su `*-bg` (éxito, aviso, peligro, info) | 4,99 / 5,40 / 6,14 / 6,12 | 4,5 |
| Estado `*-fg` sobre `surface` | 5,48 / 5,93 / 7,23 / 6,89 | 4,5 |
| Foco y pulgar del slider: `primary` sobre `surface` / `canvas` | 7,13 / 6,65 | 3 |
| Borde de campo `line-control` sobre `surface` | 5,49 | 3 |
| Borde de campo inválido `danger-fg` sobre `surface` | 7,23 | 3 |
| Pista del slider `track` sobre `surface` / `primary-tint` | 3,64 / 3,41 | 3 |
| D-191: texto seleccionado, `ink` sobre `primary-soft` | 15,42 | 4,5 |
| D-191: recuadro de la tarifa, `ink` / `ink-soft` sobre `primary-tint` | 18,07 / 7,92 | 4,5 |
| D-191: icono de métrica y de bloque, `primary` sobre `primary-soft` | 5,71 | 3 |

**Ajustes respecto a roams.es:**

| Color de la referencia | Problema | Ratio | Ajuste |
|---|---|---|---|
| Verde base `#0CB001` (`--feedback-success-border`) | Como borde o icono con significado no llega a 3:1. | 2,91 | Bordes e iconos de estado usan el tono **fuerte** (`#047857`, 5,48). El base no se usa. |
| Naranja base `#FF9F00` (`--feedback-warning-border`) | Igual. | 2,06 | Aviso con `#8A5A00` (5,93), siempre con icono y texto: nunca solo color (1.4.1). |
| Pista lavanda clara `#B9B9F8` | La pista del slider no se distinguiría del fondo. | 1,85 | Pista en `#83868F` (3,64) y pulgar lavanda con anillo blanco. |
| Lavanda antigua `#4040E3` | Pasa (6,86), pero hay dos lavandas. | — | Se unifica en `#3838EC`, el token canónico de su sistema. |
| Borde `#E0E3EA` | 1,28 sobre blanco. | — | Se mantiene **solo decorativo** (tarjetas); los campos usan `line-control`, como hace roams.es. |
| Texto deshabilitado `#A1A4AE` | 2,49. | — | Exento en WCAG (componente inactivo). Se mantiene. |

## 4. Componentes base

No hay estilos de componente (CSP `style-src 'self'`, ADR-011), así que los patrones reutilizables son **clases globales
en `@layer components`** construidas solo con `@apply` sobre los tokens (D-125):

| Clase | Patrón de roams.es |
|---|---|
| `.btn` + `.btn-primary` / `.btn-secondary` / `.btn-soft` | Sus tres botones; 48 px de alto, radio 8, texto 700. Desde D-191, el secundario lleva borde y texto lavanda, como la paginación de las maquetas (en la v1, tinta, como roams.es). |
| `.link` | Enlace lavanda subrayado. |
| `.card`, `.card-highlight` | Tarjeta blanca con sombra centrada; tarjeta de la calculadora. |
| `.page-title`, `.section-title`, `.amount` | Titulares en 800; importes tabulares sin salto. |
| `.field`, `.label`, `.hint`, `.input`, `.select`, `.field-error` | Campo con borde de control; etiqueta a 16 px en negrita (D-191); error en `danger-fg` y borde de 2 px (`aria-invalid`). Los `select` dibujan su propio *chevron* (`app-icon`) en vez de la flecha de cada sistema. |
| `.data-list` | Etiqueta pequeña y apagada sobre su valor, a 16 px en `ink` y seminegrita (ajuste del usuario en el punto de control de P5), con una línea entre filas (D-191). El historial la reparte en fila con utilidades. |
| `.badge`, `.badge-neutral`, `.badge-info` | Píldora: lavanda clara por defecto; el tipo de identificador en gris y cada plan con su tono (`app-plan-badge`: STARTER gris, BUSINESS lavanda, ENTERPRISE azul; D-191). |
| `.tile`, `.icon-tile` | Caja con borde y sin sombra dentro de una tarjeta (cliente del listado); cuadrado lavanda claro detrás de un icono (D-191). |
| `.page-heading`, `.page-subtitle`, `.data-label`, `.data-value`, `.empty-state` | Título con subtítulo; etiqueta sobre valor; estado vacío centrado con icono (D-191). |
| `.nav-link` | Enlace de la cabecera; la sección actual se marca con `aria-current` y un subrayado, no solo con color. |
| `.alert-*` | Aviso con icono, texto y borde fuerte. |
| `.skeleton`, `.range` | Esqueleto de carga; slider nativo (pseudo-elementos `-webkit-`/`-moz-`, sin relleno de progreso para no necesitar estilos en línea). |

Base global (`base.css`): fondo `canvas`, Montserrat, foco discontinuo en `:focus-visible` y `prefers-reduced-motion`
(desactiva transiciones y el pulso del esqueleto). Desde D-191, también la selección de texto, el cursor de los campos
y `accent-color` siguen la paleta.

## 5. Tipografía autoalojada (D-123)

Montserrat es **libre** (SIL Open Font License 1.1), así que no hace falta una equivalente. Se aloja en el proyecto con
`@fontsource-variable/montserrat` 5.3.0 (`02-monorepo.md` §4.1):

- Un único fichero variable cubre 100–900; el navegador solo descarga el subconjunto `latin` (38 KB), que incluye á,
  ñ, ¿ y €. Angular lo copia al build con *hash* y lo sirve desde el **mismo origen**: compatible con la CSP
  (`font-src` cae en `default-src 'self'`), sin Google Fonts ni CDN. Comprobado en el navegador: una sola petición a
  `/media/montserrat-latin-wght-normal-*.woff2`.
- El signo `≈` de P8 (U+2248) no está en el subconjunto latino: lo pinta la fuente del sistema. Es un único carácter y
  no afecta a la lectura.

## 6. Tono de los textos

Como roams.es: **tuteo**, frases cortas y verbos de acción en los botones («Crear cliente», «Guardar simulación»,
«Reintentar», «Cargar más»). Los errores dicen qué pasa y qué hacer («Revisa el identificador», «Inténtalo de nuevo») y,
si hay un fallo del servidor, dan la referencia para soporte. Sin emojis, sin exclamaciones ni tono de marketing: es una
herramienta de trabajo. Los textos de la especificación (`05-frontend.md` §6) se usan tal cual.

## 7. Versión 2: las maquetas (D-191)

El usuario generó tres maquetas con otra herramienta, que solo conocía la especificación: el dashboard, el alta (en
escritorio y a 360 px) y el detalle con el simulador y el historial. Son la **dirección**, no un plano: jerarquía,
tarjetas con icono, columnas y aire. Solo cambia la interfaz (plantillas, clases, tokens e iconos); la lógica, el
contrato y la API quedan igual.

### 7.1 Qué se toma de cada maqueta

| Vista | Qué se toma |
|---|---|
| Dashboard | Subtítulo; métricas con icono; buscador con lupa; un panel con las tarjetas y la paginación al pie; tarjetas con el plan arriba a la derecha, etiquetas visibles («Identificador fiscal» con su tipo, «País», «Fecha de alta») y «Ver detalle →». |
| Alta | Subtítulo; el formulario en dos bloques con icono, «Datos de la empresa» y «Suscripción»; identificador y email en paralelo desde 640 px; «Crear cliente» a lo ancho; etiquetas a 16 px en negrita. |
| Detalle | Tres columnas desde 1 280 px (cliente, controles y total, al 29, 38 y 33 %), dos desde 1 024 px; el campo de usuarios junto a su etiqueta y el slider debajo; el recuadro «Tarificación acumulativa»; el total grande, su desglose y «Guardar simulación» en el panel del total; el historial en tarjetas con el importe «/mes» destacado. |
| Móvil | Todo apilado; la cabecera en tres filas, con «Nuevo cliente» a lo ancho; sin desplazamiento horizontal. |

Todo lo que la app ya tenía y las maquetas no muestran se conserva con el estilo nuevo: los estados de carga, error,
vacío, sin resultados, tipos desactualizados y «Refrescando», las notas de conversión, la paginación, «Cargar más» y
los avisos del formulario.

### 7.2 Dónde la maqueta choca con la especificación

| Maqueta | Se queda | Por qué |
|---|---|---|
| El total muestra «Tramo 3 · 0 × 5,00 €» | Solo los tramos con usuarios; los tres se ven en «Tarificación acumulativa», que sale del catálogo. | Spec 05 §3.4, AC-01 y AC-91. Lo decidió el usuario. |
| Tres columnas | Dos desde 1 024 px y tres desde 1 280 px. | Spec 05 §3.3 pedía dos desde 1 024 px; se amplía, no se contradice. |
| «Tramo 1 · 10 × 10,00 €» | «Tramo 1 · usuarios 1–10 · 10 × 10,00 €», que solo se parte entre sus partes (`app-tier-label`). | Es la etiqueta de la spec. |
| Su propio texto del aviso de demo | El texto de spec 05 §2, con el icono de la maqueta. | Texto exigido. |
| «Importe medio simulado» con «Sin impuestos» debajo | «Importe medio simulado (sin impuestos)». | Etiqueta de spec 05 §3.1. |
| «Ver detalle →» como enlace | Pista visual oculta a los lectores de pantalla. | D-157: un solo enlace por tarjeta, el nombre. |
| Títulos de unos 40 px | 32 px desde 640 px (`text-title-xl`). | Revisa el límite de 24 px de D-122 sin competir con el total. |
| Panel del total con borde fino | El borde de 3 px de la firma de D-122. | Es la firma visual de la app. |
| *Placeholders* en todos los campos | Solo donde son un ejemplo: el email del alta (`nombre@empresa.com`) y el buscador del dashboard («Ej. Acme o B12345674», el CIF de ejemplo de spec 05 §3.2). | El nombre repetiría su etiqueta, y el identificador ya tiene su ejemplo debajo. |
| Slider con la parte recorrida en lavanda | Sin relleno de progreso. | Necesitaría estilos en línea (CSP, ADR-011). |

### 7.3 Decisiones de detalle

- **Iconos:** Lucide 1.65.0 (ISC; algunos derivados de Feather, MIT), copiados como trazados en
  [`icon-paths.ts`](../../apps/web/src/app/shared/ui/icon-paths.ts) y dibujados en SVG en línea por `app-icon`, con
  `aria-hidden`. La licencia se sirve con la app en `apps/web/public/lucide-license.txt`. Sin dependencia, sin
  peticiones y sin nada que la CSP tenga que permitir.
- **Cifras que siempre caben:** el total y la cifra de cada métrica eligen su tamaño por la longitud de la cifra y el
  ancho de su tarjeta, con *container queries* ([`figure-size.ts`](../../apps/web/src/app/shared/format/figure-size.ts)):
  48 px para «169,40 €» y 24 px para «≈ 1.243.127,08 MXN» en la columna de 1 280 px. El historial hace lo mismo con el
  ancho de su tarjeta. Las métricas ponen la cifra bajo el icono desde 1 024 px, porque a su lado una media convertida
  no cabía. Lo comprueba `projection-fit.spec.ts` con 10 000 usuarios en pesos, a 360, 1 024 y 1 280 px: el total, la
  tarjeta del historial y la media del dashboard.
- **Cabecera en móvil:** no es fija; se descartó fijar solo la primera fila, porque obligaba a sacarla del `<header>`
  o a usar `display: contents`.
- **Tramos sin «·» huérfanos:** `app-tier-label` y el recuadro de la tarifa pasan la cantidad y el precio a su propia
  línea cuando su tarjeta es estrecha, y el separador queda solo para los lectores de pantalla. El texto no cambia.
- **Revisión visual:** la hizo el revisor de acabado de la skill `impeccable`, sin el contexto de la sesión, contra las
  tres maquetas. Sus siete arreglos están aplicados: los tramos, los campos secundarios apilados en la columna
  estrecha, la celda de llamadas a la API a lo ancho a 360 px, los *chevron*, el marco del error del detalle y el
  esqueleto del historial, el botón secundario lavanda y el campo de usuarios alineado como los demás.
- **Orden del foco del simulador:** el campo numérico de usuarios va antes que el slider, como se ven; ningún criterio
  fija ese orden (AC-86 solo el del alta).
- **Deuda aceptada:** el simulador lee la tarifa del plan con `tariffForPlan` para el recuadro, igual que el store para
  calcular el precio. Son dos lecturas de la misma tarifa del catálogo; el store no se toca en este cambio.
- **Tarjetas dentro del panel:** los clientes del listado son cajas con borde y sin sombra (`.tile`), para que el
  panel sea la única capa con sombra.
