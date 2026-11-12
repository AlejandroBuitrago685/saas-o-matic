# 04 · Plan de implementación

| Campo | Valor |
|---|---|
| Estado | **Borrador v0.1, pendiente de validación** (D-75) |
| Fecha | 2026-11-12 |
| Plazo | Fecha límite de trabajo: **lunes 16/11 a las 23:00** (D-69, S-05). Objetivo: **entregar el domingo 15**. El lunes es solo margen. |
| Entradas | [`02-especificacion/`](02-especificacion/README.md) · [`03-arquitectura/`](03-arquitectura/README.md) · [`decisiones.md`](decisiones.md) |

## 1. Capacidad frente a esfuerzo

| Concepto | Horas |
|---|---|
| Esfuerzo estimado de las 13 partes (§3), incluido el protocolo (§4): unos 45 min por parte entre plan, revisor, diario y commit | **≈ 39,25 h** |
| Trabajo programado en el calendario (§2), según la disponibilidad supuesta (S-06, **por validar**): jue 13:00–23:00 · vie y sáb 09:00–23:00 · dom 09:00–20:00 | **≈ 40 h** (jue 9,25 · vie 12,5 · sáb 12 · dom 6,5) |
| Holgura antes del lunes | **≈ 3,5 h** (domingo por la tarde), más el lunes entero |

**Lectura honesta:** el plan completo **cabe, pero justo**.

- Exige jornadas de **unas 12 h el viernes y el sábado**, con descansos cortos.
- Deja solo unas 3,5 h de holgura el domingo: un bloqueo serio, como el CI en Windows, Docker en el CI o Signal Forms,
  se la come entera.
- Llegar el domingo con todo depende de las cuatro condiciones de §6. Si se tuercen, el lunes deja de ser margen y
  pasa a ser necesario. Los puntos de control de §5 dicen qué se aplaza y cuándo.

## 2. Calendario

| Día | Franja | Parte | Hito / punto de control |
|---|---|---|---|
| **Jue 12** | 13:00–17:30 | **P0** Scaffolding y herramientas | |
| | 17:30–20:00 | **P1** Dominio: precios, impuestos, redondeo, catálogo, texto, slider | |
| | 20:30–22:45 | **P2** Dominio: identificador fiscal | **C1 · jue 23:00** |
| **Vie 13** | 09:00–12:30 | **P3** Contrato y base de la API | |
| | 13:30–16:00 | **P4** API de la porción vertical | **C2 · vie 16:00** |
| | 16:00–20:30 | **P5** Web de la porción vertical | |
| | 21:00–23:00 | **P6** (1.ª mitad) Docker Compose y nginx | |
| **Sáb 14** | 09:00–10:00 | **P6** (2.ª mitad) e2e de la porción vertical y CSP | **C3 · sáb 10:00 → porción vertical completa** |
| | 10:00–11:00 | **P11** (1.ª mitad) Primer despliegue de la demo | |
| | 11:00–14:00 | **P7** Búsqueda y dashboard | |
| | 15:00–18:30 | **P8** Divisas | **C4 · sáb 18:30** |
| | 18:30–22:00 | **P9** Robustez: seguridad, estados, responsive, accesibilidad | **C5 · sáb 23:00** |
| **Dom 15** | 09:00–11:30 | **P10** Should/Could y CI completo | |
| | 11:30–13:00 | **P11** (2.ª mitad) Demo final y AC-61 | **C6 · dom 13:00** |
| | 14:00–16:30 | **P12** README, prueba desde un clon limpio y revisión final | **C7 · dom 17:00** |
| | 16:30–20:00 | Holgura | |
| | ≈ 20:00 | **Entrega** | |
| **Lun 16** | Todo el día | Solo margen | Límite: 23:00 |

La **prueba desde un clon limpio** (P12) sigue el README al pie de la letra: clon nuevo en una carpeta vacía, sin
caché de npm y sin nada instalado a mano. Si un paso no está en el README, la prueba falla.

## 3. Partes en orden

Cada parte cumple, además de lo suyo, la **definición de hecho general** de `CLAUDE.md`: tests de sus AC en verde,
lint y tipos, revisor sin P0 ni P1, diario, trazabilidad y commit.

### P0 · Scaffolding y herramientas · 4,5 h

- **Objetivo:** monorepo vacío pero completo en herramientas, para que la primera línea de negocio ya nazca bajo las
  reglas.
- **Incluye:**
  - workspaces, `engines` y `.nvmrc`; `tsconfig` estricto; ESLint (límites, fronteras, reglas de seguridad); Prettier;
  - lefthook y commitlint; Vitest en cada paquete;
  - app Angular 22 vacía (sin Zone.js, Tailwind 4, sin estilos de componente, `inlineCritical: false`);
  - API vacía con `buildApp` y `GET /health`; Drizzle configurado;
  - scripts `check-filenames`, `check-forbidden-patterns` y `trace-tests`;
  - hooks de Claude Code (`PostToolUse`, `PreToolUse`, `Stop`);
  - CI con los trabajos `quality` (matriz 22/24/26) y `audit`;
  - `.env.example` y esqueleto del README.
- **AC:** AC-55 (no hay `.env` versionados), AC-56, AC-57, AC-93 (parte de lint), AC-96 (parte de `quality`), AC-98.
- **TV:** —.
- **Módulos:** raíz, `packages/*` (vacíos), `apps/api` (esqueleto), `apps/web` (esqueleto), `.github/`, `.claude/`, `scripts/`.
- **Tests:** un test de humo por paquete; un test de que los hooks bloquean (p. ej. editar una migración); el CI en verde.
- **Riesgos:**
  - **Necesita un repositorio en GitHub** para que corra el CI. El usuario crea el repositorio público y autoriza el
    primer *push*.
  - Combinar angular-eslint con eslint-plugin-boundaries y lint con tipos.
  - Hooks en Windows: todos en Node, nunca en Bash.
- **Hecho cuando:**
  - el CI pasa en las tres versiones de Node;
  - los hooks responden: una edición con un error de lint devuelve código 2;
  - **las marcas de `CLAUDE.md` pasan de ⏳ a ⚙ solo en las reglas cuya herramienta quede configurada y probada** (D-71).

### P1 · Dominio: precios, impuestos, redondeo, catálogo, texto y slider · 2,25 h

- **Objetivo:** el núcleo de cálculo, puro y probado con TDD.
- **AC:** AC-01, AC-02, AC-03, AC-04, AC-05, AC-06, AC-07 (parte de dominio), AC-91 (parte U).
- **TV:** TV-PR-01…15, TV-TX-01…07, TV-RD-01…05, TV-SL-01…16.
- **Módulos:** `packages/domain` (`money`, `pricing`, `tax`, `catalog`, `text`, `slider`, `shared`).
- **Tests:**
  - parametrizados con los vectores;
  - `fast-check` para AC-03;
  - recorrido exhaustivo del slider;
  - umbral de cobertura del 100 %.
- **Riesgos:** bajos. Que el redondeo use coma flotante sin querer: lo impiden TV-RD-01 y la regla de aritmética entera.
- **Hecho cuando:** todos los vectores pasan, la cobertura del dominio es del 100 % y la API pública está en `index.ts`.

### P2 · Dominio: identificador fiscal · 2 h

- **Objetivo:** normalización y un validador por país detrás de una interfaz común (RNF-26).
- **AC:** AC-10, AC-11, AC-12, AC-13, AC-14, AC-15, AC-16 (parte de dominio).
- **TV:** TV-ES-01…34 (incluidos los CIF reales), TV-NO-01…11, TV-INT-01…31.
- **Módulos:** `packages/domain/tax-id`.
- **Tests:** los 82 vectores; un test de que el registro de validadores cubre exactamente los países del catálogo.
- **Riesgos:** bajos. Los vectores ya se verificaron contra una implementación independiente.
- **Hecho cuando:** los 82 vectores pasan y añadir un país solo exige un fichero nuevo y una entrada en el registro.

### P3 · Contrato y base de la API · 3,5 h

- **Objetivo:** todo lo transversal del backend, listo para que P4 solo añada casos de uso.
- **Incluye:**
  - `packages/contract` (esquemas, códigos de error, Problem Details);
  - esquema Drizzle, migraciones con `CHECK` generados a partir del dominio, y migración personalizada con los triggers de solo inserción;
  - conexión con pragmas; `loadConfig` y validación del catálogo;
  - plugins: request-id, cabeceras, CORS, límite de peticiones, parser JSON y `bodyLimit`, manejador de errores, 404 y `Cache-Control`;
  - módulo `catalog`; `health` real; generación de OpenAPI.
- **AC:** AC-07, AC-21 (estructura), AC-22, AC-23, AC-24, AC-34, AC-48, AC-50, AC-52 (cabeceras de la API), AC-53, AC-55 (configuración), AC-58, AC-62.
- **TV:** TV-NO-12.
- **Módulos:** `packages/contract`; `apps/api` (`config`, `db`, `http`, `shared`, `modules/catalog`, `modules/health`).
- **Tests:**
  - integración con `app.inject()`;
  - un test con fichero real para los pragmas;
  - un test de que los triggers rechazan `UPDATE` y `DELETE`;
  - un test de traducción de errores por cada código.
- **Riesgos:**
  - traducir los errores de Zod 4 a nuestros códigos;
  - interpolar constantes en los `CHECK` de Drizzle;
  - la migración personalizada con triggers.
- **Hecho cuando:** `GET /catalog` y `GET /health` responden según el contrato, todo error sale como RFC 9457 y el
  inventario OpenAPI coincide con las rutas registradas.

### P4 · API de la porción vertical · 2,5 h

- **Objetivo:** alta y lectura de clientes, y creación y listado de simulaciones de punta a punta en el backend.
- **AC:** AC-20, AC-21, AC-25, AC-26, AC-27, AC-40, AC-41, AC-42, AC-43, AC-44, AC-45, AC-46, AC-54.
- **TV:** TV-PR-04, TV-PR-10…15 y los vectores de `POST /customers` de AC-25 (TV-ES-04, TV-ES-28, TV-INT-27).
- **Módulos:** `apps/api/modules/customers` (alta y detalle), `apps/api/modules/simulations`.
- **Tests:**
  - integración por AC;
  - test de contrato: las respuestas se validan contra los esquemas;
  - logs sin datos personales (AC-54);
  - alta concurrente duplicada → `409`.
- **Riesgos:** la transacción de simulación y tramos; traducir la violación de `UNIQUE` a `409`.
- **Hecho cuando:** los AC listados pasan y el `pricing` de la API coincide con `domain` en todos los TV-PR.

### P5 · Web de la porción vertical · 4,5 h

- **Objetivo:** alta → detalle → simulador (EUR, slider y campo numérico) → guardar → historial, en el navegador.
- **Incluye:**
  - *shell* (cabecera sin divisas todavía; pie con la atribución preparada);
  - `CatalogStore`, interceptores y `ApiError`, diccionario de mensajes;
  - formulario de alta con Signal Forms;
  - página de detalle, simulador con `SimulatorStore`, slider con `aria-valuetext`, panel de proyección;
  - historial con «Cargar más»; vista de no encontrado.
- **AC:** apoya AC-72, AC-73, AC-75, AC-76, AC-77, AC-78, AC-89, AC-90 y AC-91 (parte E). Los e2e se escriben en P6.
- **TV:** TV-PR-04 y TV-FX-06 (proyección en EUR).
- **Módulos:** `apps/web` (`core/api`, `core/catalog`, `core/errors`, `core/layout`, `shared/ui`, `shared/format`,
  `features/customer-create`, `features/customer-detail`, `features/simulator`).
- **Tests:** de componentes y stores (slider, proyección, traducción de errores, estados de carga y error).
- **Riesgos:**
  - **Signal Forms** tiene poco recorrido; si se bloquea, Reactive Forms en ese formulario (ADR-011).
  - Sincronizar el slider nativo con el campo numérico.
- **Hecho cuando:** el flujo completo funciona en local contra la API real y los tests de componentes pasan.

### P6 · Docker Compose, nginx y e2e de la porción vertical · 3 h

- **Objetivo:** la porción vertical probada en el navegador contra la pila de producción, con CSP real.
- **Incluye:**
  - `Dockerfile` de la API y de la web (multi-stage, sin root);
  - `nginx` con proxy `/api`, cabeceras y CSP;
  - `docker-compose.yml`;
  - Playwright con la API de tipos siempre interceptada y el detector de violaciones de CSP como *fixture*;
  - trabajo `e2e` en el CI.
- **AC:** AC-52 (parte E), AC-60, **AC-64**, AC-72, AC-75, AC-76, AC-77, AC-78, AC-89, AC-90, AC-91 (parte E), AC-97, AC-96 (parte e2e).
- **TV:** TV-PR-04, TV-PR-06 (51 usuarios en AC-78).
- **Módulos:** `apps/api/Dockerfile`, `apps/web/Dockerfile`, `apps/web/nginx.conf`, `docker-compose.yml`, `e2e/`,
  `.github/workflows/ci.yml`.
- **Tests:** los e2e listados.
- **Riesgos:**
  - imagen de la API con workspaces y `better-sqlite3` sobre musl;
  - nginx sin root (puerto 8080, `tmpfs`);
  - Compose dentro de GitHub Actions.
  - Fallback si se atasca: e2e contra los servidores de desarrollo (contingencia n.º 7).
- **Hecho cuando:** `docker compose up` y `npm run e2e` pasan en local y en el CI, y no hay ninguna violación de CSP.
  **Hito: porción vertical completa.**

### P7 · Búsqueda y dashboard · 3 h

- **Objetivo:** listado paginado y búsqueda sin acentos ni mayúsculas, en la API y en la web.
- **AC:** AC-28, AC-29, AC-30, AC-31, AC-32, AC-33, AC-70, AC-71.
- **TV:** —.
- **Módulos:** `apps/api/modules/customers` (búsqueda), `apps/web/features/dashboard`.
- **Tests:** integración (escape de comodines, orden, paginación, sin email); componentes (*debounce*, respuestas
  fuera de orden); e2e de los estados.
- **Riesgos:** `LIKE … ESCAPE` con la plantilla `sql` de Drizzle; condiciones de carrera en la búsqueda en vivo.
- **Hecho cuando:** los AC pasan y la búsqueda de una página tarda menos de 20 ms con los datos de ejemplo.

### P8 · Divisas · 3,5 h

- **Objetivo:** selector, tipos con caché, indicador de estado siempre visible y conversión por partidas hoja.
- **AC:** AC-79, AC-80, AC-81, AC-82, AC-83, AC-87, AC-88.
- **TV:** TV-FX-01…06.
- **Módulos:** `packages/domain/currency`, `apps/web/core/currency`, `core/layout` (indicador y atribución), `shared/format`.
- **Tests:**
  - TDD de la conversión;
  - tests puros de las transiciones de la máquina de estados (reloj inyectado);
  - e2e de cada estado con la API simulada y `page.clock` (D-51).
- **Riesgos:** combinatoria de estados de la caché; el `429` y sus 20 minutos.
- **Hecho cuando:** los tres estados (carga, error y desactualizados) tienen cada uno su e2e en verde y el indicador se
  ve también con EUR seleccionado.

### P9 · Robustez: seguridad, estados, responsive y accesibilidad · 3,5 h

- **Objetivo:** cerrar los AC transversales que no han caído en las partes anteriores.
- **AC:** AC-51, AC-57, AC-59, AC-63, AC-73, AC-74, AC-84, AC-85, AC-86.
- **TV:** TV-ES-04 (AC-73).
- **Módulos:** transversal.
- **Tests:** integración (límite de peticiones, red saliente bloqueada); e2e (XSS, 360 px, backend caído, axe, teclado).
- **Riesgos:** infracciones de accesibilidad que lleven tiempo arreglar.
- **Hecho cuando:** los AC pasan y axe no encuentra infracciones graves.

### P10 · Should/Could y CI completo · 2,5 h

- **Objetivo:** los extras y el pipeline final.
- **Incluye:**
  - `GET /stats` y las métricas del dashboard (Could);
  - desglose desplegable en el historial (Should);
  - búsqueda y página en la URL (Should);
  - recordar la divisa (Could);
  - pruebas de humo en Windows y macOS;
  - control de trazabilidad (`trace-tests`) como bloqueante.
- **AC:** AC-47, AC-92, AC-95 (parte CI), AC-96 (completo).
- **TV:** TV-ST-01…03.
- **Módulos:** `apps/api/modules/stats`, `apps/web/features/dashboard`, `features/customer-detail`, `core/currency`, `.github/`.
- **Tests:** integración y e2e de los AC; el CI completo en verde.
- **Riesgos:** particularidades de los *runners* de Windows y macOS (rutas, fin de línea, procesos en segundo plano).
- **Hecho cuando:** el CI completo pasa y la trazabilidad no tiene AC sin test.

### P11 · Demo pública · 2 h (1 h el sábado y 1 h el domingo)

- **Objetivo:** demo en una URL pública con las medidas de D-47.
- **AC:** AC-61.
- **Módulos:** configuración del proveedor elegido; `DEMO_MODE` en el punto de entrada de la API.
- **Tests:** AC-61 manual y automatizado:
  - aviso visible;
  - HTTPS con HSTS;
  - límite de 5 escrituras;
  - regeneración de datos al arrancar.
- **Riesgos:**
  - **depende de una decisión y una cuenta del usuario**: elegir entre las opciones de `03-arquitectura/08-despliegue.md`
    §4, a más tardar el viernes;
  - `TRUST_PROXY` según el proveedor.
- **Hecho cuando:** la URL responde, AC-61 pasa y el README la enlaza.

### P12 · Cierre: README, clon limpio y revisión final · 2,5 h

- **Objetivo:** que el evaluador lo levante sin fricción y que el `ai-workspace` cuente el proceso completo.
- **Incluye:**
  - README final (requisitos, comandos, Docker, demo, estructura y enlaces al `ai-workspace`);
  - **prueba desde un clon limpio** siguiendo el README;
  - revisor sobre todo el repositorio;
  - matriz de trazabilidad con la columna de tests;
  - diario completo;
  - etiqueta de la entrega.
- **AC:** AC-93, AC-94, AC-95 (manual), AC-99.
- **Hecho cuando:**
  - el clon limpio funciona sin desviarse del README;
  - el revisor no deja P0 ni P1 en todo el repositorio;
  - todo está en `main` con el CI en verde.

## 4. Protocolo de cada parte (D-73)

1. **Plan:** el usuario activa el modo plan y Claude presenta el plan de la parte:
   - objetivo;
   - AC y TV;
   - ficheros a crear o tocar;
   - orden TDD (qué tests primero);
   - riesgos y preguntas abiertas.

   No se toca código hasta que el usuario lo aprueba.
2. **Implementación:** con TDD donde aplique (siempre en `domain`; en la API, primero el test de integración de cada AC).
3. **Verde:**
   - lint, tipos y tests de lo afectado (el hook `Stop` lo exige cuando esté activo);
   - los e2e de la parte, si los tiene;
   - el CI en verde tras el *push*.
4. **Revisor:** subagente `revisor`, con la lista de ficheros, el diff, los AC y TV y el resultado de los tests.
   - Se corrigen **todos** los P0 y P1, y se vuelve a pasar el revisor si hubo cambios relevantes.
   - Los P2 y P3 se corrigen o se registran en el diario.
5. **Documentación:**
   - entrada en [`diario.md`](diario.md);
   - columna de tests de la matriz de trazabilidad (`trace-tests`);
   - decisiones nuevas en `decisiones.md`;
   - prompt literal en `prompts/`.
6. **Commit:** en Conventional Commits, con los AC cubiertos en el cuerpo del mensaje.

Plantilla de entrada del diario: **Hecho** · **Falló** · **Correcciones** (del usuario, del revisor o propias) ·
**Decisiones** · **Tiempo** (estimado frente a real).

## 5. Contingencia

No se recorta nada salvo que un punto de control falle. Si falla, se aplaza **en este orden**, empezando por el primero:

| N.º | Se aplaza | Prioridad | Impacto |
|---|---|---|---|
| 1 | Recordar la divisa tras recargar | Could | Ninguno en los AC. |
| 2 | Tests de mutación (Stryker) | Could | Ninguno (no estaban en la definición de hecho). |
| 3 | Métricas del dashboard: RF-19, AC-47, AC-92 | Could | Se pierde un extra visible. |
| 4 | Desglose desplegable del historial y búsqueda en la URL | Should | UX secundaria. |
| 5 | Prueba de humo en macOS (Windows se mantiene, porque es el de más riesgo, RT-06) | Should (D-53) | Menos cobertura de plataforma. |
| 6 | La auditoría con axe deja de bloquear y pasa a informativa (`aria-valuetext` sigue siendo Must) | Should (RNF-13) | Menos garantía de accesibilidad. |
| 7 | e2e del CI contra Docker Compose → contra los servidores de desarrollo. AC-52, AC-60 y AC-64 se ejecutan en local contra Compose antes de entregar | D-68 | El CI deja de vigilar la CSP real. |
| 8 | Demo pública | Should (RNF-22) | Se entrega con Compose y una nota en el README. |
| 9 | Docker Compose, solo si ya cayó la demo | Should (RNF-20) | El camino npm sigue siendo el principal. |

**Nunca se aplaza:**

- ningún requisito Must (RF, RNF y RNF-SEC);
- los e2e de los AC Must;
- el trabajo `quality` del CI con la matriz;
- el README y la prueba desde un clon limpio.

**Puntos de control:**

| Punto | Momento | Debe estar | Si no está |
|---|---|---|---|
| C1 | Jue 23:00 | P0 y P1 cerrados | Se aplazan **1** y **2**; P2 pasa al viernes a las 08:30. |
| C2 | Vie 16:00 | P3 y P4 cerrados (API de la porción vertical) | Se aplaza **3**. |
| C3 | Sáb 10:00 | P6 cerrado (porción vertical con e2e y Docker) | Se aplica **7**; el primer despliegue de la demo pasa al domingo a las 11:30. |
| C4 | Sáb 18:30 | P7 y P8 cerrados | Se aplaza **4**. |
| C5 | Sáb 23:00 | P9 cerrado | Se aplazan **5** y **6**. |
| C6 | Dom 13:00 | P10 y P11 cerrados | Se aplaza **8** (y **9** si Docker también falla). |
| C7 | Dom 17:00 | P12 en verde (clon limpio) | Se usa el lunes. Nada Must se recorta. Límite: lunes 23:00. |

## 6. Condiciones para llegar el domingo

1. **Planes aprobados rápido:** el protocolo es el cuello de botella. Para ahorrar unos 45 minutos, **P1 y P2 pueden
   presentarse en un único plan** (mismo paquete, puro TDD).
2. **El repositorio de GitHub creado en P0** (jueves), para que el CI corra desde el principio.
3. **El hosting de la demo elegido el viernes** y la cuenta creada antes del sábado a las 10:00.
4. **Ningún bloqueo de más de 1 h:** si algo se atasca más de una hora, se aplica el plan B de esa parte (indicado en
   sus riesgos) y se sigue.

## 7. Cobertura

Los 83 criterios (AC-01…AC-99, incluido AC-64) tienen parte asignada. El script de trazabilidad lo comprobará en
P10 y P12 contra los tests reales.
