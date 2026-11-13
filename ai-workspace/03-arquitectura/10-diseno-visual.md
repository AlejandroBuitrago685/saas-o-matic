# 10 · Diseño visual

| Campo | Valor |
|---|---|
| Estado | **v1**: dirección validada por el usuario en el punto de control visual de P5 (2026-11-13), con dos ajustes (valores de la tarjeta del cliente a tamaño de cuerpo; cabecera con navegación y botón «Nuevo cliente»). |
| Decisiones | D-122 (dirección y tokens), D-123 (tipografía), D-124 (contraste), D-125 (componentes en CSS global y guardias) |
| Código | [`apps/web/src/styles/`](../../apps/web/src/styles/): `tokens.css`, `base.css`, `components.css`, `range.css` |
| Test | [`tools/design-tokens.test.ts`](../../tools/design-tokens.test.ts) (contraste) · `check-forbidden-patterns` (sin colores arbitrarios) |

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
  titulares contenidos (24 px como máximo, salvo el total de la proyección); más densidad (cuerpo 16/24 en vez de 16/28).
- **Marca:** logotipo de texto «SaaS-**O-Matic**» en Montserrat 800, con «O-Matic» en lavanda: el mismo gesto que la
  palabra de acento de sus titulares.
- **Firma visual:** el **panel de proyección** del simulador reutiliza el patrón de su calculadora (borde de 3 px,
  fondo tintado, total en 36/44 y 800). Es el único elemento «de marketing» de la app, y está donde el comercial mira.
- **Cabecera** como la suya: navegación a la izquierda («Clientes») y la acción principal a la derecha («Nuevo cliente»).
  El grupo de la derecha admite el selector de divisa y el indicador de tipos de P8 y se reparte en varias líneas en
  móvil; a 360 px la navegación baja a su propia fila, sin scroll horizontal.

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
| `text-title-lg` | 24/32 | `--title-a` | Título de página. |
| `text-display` | 36/44 | `--p-font-size-36` / `--p-font-lineheight-44` | Total de la proyección. |

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
| `.btn` + `.btn-primary` / `.btn-secondary` / `.btn-soft` | Sus tres botones; 48 px de alto, radio 8, texto 700. |
| `.link` | Enlace lavanda subrayado. |
| `.card`, `.card-highlight` | Tarjeta blanca con sombra centrada; tarjeta de la calculadora. |
| `.page-title`, `.section-title`, `.amount` | Titulares en 800; importes tabulares sin salto. |
| `.field`, `.label`, `.hint`, `.input`, `.field-error` | Campo con borde de control; error en `danger-fg` y borde de 2 px (`aria-invalid`). |
| `.data-list` | Etiqueta pequeña y apagada, valor a 16 px en `ink` (ajuste del usuario en el punto de control); apilado en móvil, dos columnas desde 640 px. |
| `.badge` | Píldora lavanda clara (plan, tipo de identificador). |
| `.nav-link` | Enlace de la cabecera; la sección actual se marca con `aria-current` y un subrayado, no solo con color. |
| `.alert-*` | Aviso con icono, texto y borde fuerte. |
| `.skeleton`, `.range` | Esqueleto de carga; slider nativo (pseudo-elementos `-webkit-`/`-moz-`, sin relleno de progreso para no necesitar estilos en línea). |

Base global (`base.css`): fondo `canvas`, Montserrat, foco discontinuo en `:focus-visible` y `prefers-reduced-motion`
(desactiva transiciones y el pulso del esqueleto).

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
