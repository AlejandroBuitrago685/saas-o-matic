# 07 · Estrategia de tests

Los 83 criterios de aceptación (spec `07-criterios-aceptacion.md`) y los 129 vectores (`TV-…`) son la lista de lo que
hay que probar. Cada test cita los suyos. Los niveles siguen la columna «Nivel» de cada AC.

## 1. Niveles

| Nivel | Qué se prueba | Herramienta | Entorno | AC |
|---|---|---|---|---|
| **Dominio** (`packages/domain`) | Tramos, impuestos, redondeo, conversión, normalización, validadores fiscales, escala del slider, validación del catálogo y transiciones de la máquina de tipos (si se extraen al dominio). | Vitest; propiedades con recorridos exhaustivos (D-90) | Node, sin I/O | AC-01…07, AC-10…16, AC-91 (parte U) |
| **Integración de la API** (`apps/api`) | Cada endpoint de punta a punta dentro del proceso: esquema, casos de uso, repositorios, SQL real, errores RFC 9457, cabeceras, límite de peticiones, logs y configuración. | Vitest + `app.inject()` | SQLite **en memoria** con las migraciones reales; un test con fichero para los pragmas | AC-20…34, AC-40…48, AC-50…55, AC-58, AC-59, AC-62 |
| **Componentes** (`apps/web`) | Stores (sobre todo `ExchangeRatesStore`), interceptores de errores, diccionario de mensajes, slider (`aria-valuetext`), panel de proyección y estados de las vistas. | Builder de tests unitarios de Angular con el runner Vitest (el predeterminado en 22) y jsdom | Sin red: `HttpTestingController` y un `fetch` simulado | Apoyan a AC-70…92 con pruebas rápidas |
| **e2e** (`e2e/`) | Flujos del usuario en el navegador. | Playwright (Chromium) + `@axe-core/playwright` | Pila de Docker Compose (como la demo) en CI; servidores de desarrollo en local | AC-52 (parte E), AC-61, AC-63, AC-70…92 |
| **CI / estáticos** | Lint, tipos, fronteras, ciclos, auditoría, patrones prohibidos, migraciones sincronizadas, inventario OpenAPI, trazabilidad. | ESLint, `tsc`, dependency-cruiser, `npm audit`, scripts en `scripts/` | GitHub Actions | AC-55…57, AC-60, AC-93, AC-95…98 |
| **Revisión** | Lo que no se automatiza. | Subagente revisor + revisión humana | — | AC-59 (parte R), AC-61, AC-93, AC-94, AC-99 |

### 1.1 Dominio: TDD y vectores como datos

- **TDD obligatorio:** primero el test con los vectores del caso, después la implementación.
- Los vectores viven en `packages/domain/test/vectors/*.ts` como datos tipados con su ID
  (`{ id: 'TV-PR-04', users: 15, expectedBaseCents: 14000, … }`) y alimentan tests parametrizados
  (`it.each(vectors)('$id …')`). Así cada vector de la spec es exactamente un caso de test.
- **Propiedades:**
  - AC-03 (crecimiento y coste marginal) **de forma exhaustiva**: todos los `n` de 2 a 10 000 (D-90, sin `fast-check`).
  - AC-91 (slider) **de forma exhaustiva**: 280 posiciones y 10 000 valores, sin muestreo.
  - AC-14 (homóglifos) con un test rápido representativo y, aparte, el barrido completo del plano básico en el proyecto `domain-slow` (unos 4 s): corre en el CI y en `npm run verify`, no en `npm test` ni en el hook `Stop` (D-101).
- **Cobertura mínima:** 100 % de líneas y ramas en `domain`, como umbral del CI.
- **Could:** tests de mutación (Stryker) sobre `domain` para medir la calidad de los propios tests.

### 1.2 Integración de la API

- `buildTestApp()` ([`03-backend.md`](03-backend.md) §3) por fichero de test, con base de datos nueva en memoria y
  las migraciones aplicadas. El reloj y los IDs son deterministas, así que no hay datos compartidos entre ficheros.
- Las respuestas se validan, además, contra los esquemas de `contract` (test de contrato): la API no puede devolver
  algo que el contrato no describa.
- Logs capturados en memoria para AC-54. Límite de peticiones configurado bajo para AC-51.
- AC-59 ejecuta la suite con la red saliente bloqueada.

### 1.3 e2e

- **Aislamiento de la API externa (RT-05):** todas las pruebas interceptan `https://open.er-api.com/**` con
  `page.route`. Por defecto devuelve los tipos de referencia (spec `02` §4.1); cada test de estados (AC-80…82) fuerza
  su caso con `e2e/fixtures/exchange-rates-api.ts`: error de red, `500`, `429`, `result: "error"`, `base_code`
  erróneo, respuesta sin GBP, o una respuesta retenida hasta que el test la suelta (el proveedor lento, sin esperar
  segundos reales; D-149).
  Cualquier otra petición a un origen externo **hace fallar el test**, así que nunca se toca la red real.
- **Tiempo:** `page.clock` de Playwright para la caducidad de la caché (30 min, 2 h, 3 días) en AC-82. La caché la
  llena la propia aplicación en una primera visita; el test adelanta el reloj y recarga (D-149).
- **Datos:** la pila de e2e (`npm run e2e:stack`, D-133) arranca siempre con la base de datos vacía, y `e2e:dev`
  usa SQLite en memoria (D-137). Cada test crea sus propios clientes por la API, con NIF sintéticos únicos
  (`e2e/fixtures/customers.ts`), así que no depende del orden ni de otros tests. No hay perfil `e2e` del *seed*
  (D-139).
  - Los estados que necesitan una base de datos vacía, una cantidad exacta de clientes o un backend caído (AC-70,
    AC-85) se prueban interceptando `/api/**` con respuestas tipadas por el contrato (`e2e/fixtures/customer-pages.ts`).
  - AC-71 retrasa la respuesta de `ac` para comprobar que no sustituye a la de `acme`.
- **Producción realista en CI:** se ejecutan contra la pila de Docker Compose (nginx + API), lo que comprueba también
  la CSP y las cabeceras reales (AC-52), el proxy `/api` y que el contenedor no corre como root (AC-60).
  - Son dos configuraciones de Playwright con los ajustes comunes en `e2e/playwright.shared.ts`:
    - `stack` (`npm run e2e`, la del CI): `playwright.config.ts`;
    - `dev` (`npm run e2e:dev`): `playwright.dev.config.ts`. Arranca su propia API (:3100, `NODE_ENV=test`, SQLite en
      memoria) y su propio `ng serve` (:4300) con `webServer` (D-137). Así no toca la base de desarrollo y puede
      ejecutarse con `npm run dev` arrancado. Omite los tests etiquetados `@prod-only` (cabeceras, CSP,
      `index.html`, salud e IP real).
  - El trabajo `e2e` del CI comprueba además los contenedores con `scripts/check-containers.mjs`: sin root, solo
    lectura, sin *capabilities* y puertos solo en `127.0.0.1` (AC-60, D-130).
- **La demo pública (AC-61, P11):** `demo` (`npm run e2e:demo`, `playwright.demo.config.ts`) prueba `e2e/demo/` contra
  la pila de la demo, en `127.0.0.1:4010`. En el CI, el trabajo `demo` la levanta con las mismas imágenes que publica
  (D-170).
  - Cada test es un cliente propio: envía el `X-Forwarded-For` que pone el nginx del host, porque en la demo la
    pasarela es de confianza (D-130).
  - Comprueba:
    - el aviso, en todas las vistas, a 360 px y con axe;
    - los 25 clientes de ejemplo;
    - la sexta escritura en un minuto → `429`;
    - un cubo del límite por cliente;
    - el reinicio del contenedor de la API, que devuelve los datos de ejemplo. Lo hace con `docker restart`, así que
      un solo *worker* y en orden.
  - En local, primero se construyen las dos imágenes con la etiqueta `local` y se levanta la pila. Antes hay que bajar
    la del e2e, porque las dos usan la subred fija de D-130.

    ```bash
    docker build -f apps/api/Dockerfile -t ghcr.io/alejandrobuitrago685/saas-o-matic-api:local .
    docker build -f apps/web/Dockerfile --build-arg WEB_BUILD_CONFIGURATION=production,demo -t ghcr.io/alejandrobuitrago685/saas-o-matic-web-demo:local .
    SAAS_O_MATIC_TAG=local docker compose -f docker-compose.yml -f deploy/demo/docker-compose.demo.yml up -d --wait
    npm run e2e:demo
    ```
  - Si una ejecución falla a medias, la pila queda con datos y cubos gastados: hay que bajarla y volver a levantarla
    antes de repetir (`… down`, y después `… up -d --wait`).
  - Lo que solo puede verse en la URL pública (HTTPS, HSTS, Cloudflare, el *timer*) se comprueba a mano tras
    desplegar (08-despliegue §4.4).
- **Accesibilidad (AC-86, D-156):** `expectNoSeriousA11yViolations` (`e2e/fixtures/a11y.ts`) pasa axe con las reglas
  de WCAG 2.1 A y AA y falla con impacto `serious` o `critical`; el resto se adjunta al informe. Se audita cada vista
  y estado a 1280 y a 360 px. El teclado tiene su propio spec: el slider con Re Pág, Av Pág, Inicio y Fin, y el alta
  recorrida con el tabulador, con nombre y foco visible en cada parada (el elemento tiene que verse distinto con foco
  y sin él).
- **360 px (AC-84):** `e2e/fixtures/layout.ts` comprueba que no hay desplazamiento horizontal y que ningún texto está
  recortado. `test-guards.spec.ts` demuestra que las dos comprobaciones fallan cuando deben.
- **API caída (AC-85, D-155):** en los dos destinos, `takeApiDown` corta `/api/` en el navegador. Contra la pila, el
  servicio `web-api-down` de `docker-compose.e2e.yml` (`127.0.0.1:8081`) es la misma imagen web sin API: en su red
  *bridge* propia es él mismo el host `api`, así que nginx da un `502` al momento. `check-containers` lo revisa
  también.
- **Sin red saliente (AC-59, D-154):** `apps/api/test/setup/no-outbound-network.ts`, en `setupFiles`, bloquea en
  todos los tests de la API `fetch`, `net.Socket.connect`, `dns.lookup` y `dgram.send` salvo *loopback* y las
  conexiones por `path` (sockets Unix y tuberías con nombre de Windows). Los procesos hijos (`tsx` en los tests del
  seed) no heredan el guardián; tampoco hacen red, y la regla de lint de D-154 prohíbe los clientes salientes en
  `apps/api/src`.
- **Detector de violaciones de CSP (AC-64, D-70):** un *fixture* automático de Playwright, activo en **todos** los
  tests que se ejecutan contra la pila de producción.
  - Registra los eventos `securitypolicyviolation` (con `page.addInitScript`) y los mensajes de consola de CSP.
  - Al terminar cada test, falla si ha registrado alguno.
  - Así, una violación de CSP hace fallar cualquier e2e, no solo uno dedicado.
  - Está en `e2e/fixtures/test.ts`, junto con la guarda de red de RT-05; `e2e/specs/test-guards.spec.ts` demuestra
    que las dos detectan lo que deben (un `<script>` inyectado y una navegación a otro origen).
- **Latencia de AC-90:** se mide dentro de la página, desde el `keydown` en el slider hasta el *frame* siguiente al
  cambio del total, así que no cuenta el tiempo del *runner*. Límite: 100 ms. Medido: 23–30 ms en local. El valor del
  CI queda como anotación «AC-90 latency» en el informe HTML, que el trabajo `e2e` sube como artefacto en cada
  ejecución. Margen: unos 70 ms.
- **Sin reintentos:** un test que solo pasa a la segunda es un fallo que hay que investigar; su traza se conserva.

## 2. Trazabilidad test → AC / TV

- **Convención de nombres:** el título de cada test empieza por sus IDs:
  `it('AC-12 TV-ES-31: Telefónica A28015865 es un CIF válido', …)`, `test('AC-80: error de red con EUR seleccionado', …)`.
- **Script `scripts/trace-tests.mjs`** (se escribe en el scaffolding):
  1. Extrae los AC y TV de la spec, con el mismo analizador que generó `08-trazabilidad.md`.
  2. Busca sus IDs en los ficheros de test.
  3. Falla en CI si un AC de nivel `U`, `I`, `E` o `CI` no tiene ningún test, o si un TV no aparece en ningún test.
  4. Escribe la columna «Test» de la matriz de trazabilidad.
- **Bugs:** cada bug corregido lleva un test de regresión que lo reproduce antes del arreglo. Cita el AC afectado y,
  si no hay ninguno, se crea un caso límite `CL-xx` nuevo.

## 3. Cuándo se ejecuta cada cosa

| Momento | Qué | Duración objetivo |
|---|---|---|
| Tras cada edición de Claude (hook `PostToolUse`) | ESLint **solo del fichero editado**; sin `tsc` (D-80) | < 5 s (2,6–3,5 s medidos) |
| Al terminar Claude una tarea (hook `Stop`) | `verify:changed`: formato y lint de los ficheros cambiados, comprobaciones del repo, tipos y tests de las áreas afectadas; nunca el build (D-80, D-86) | < 30 s |
| `pre-commit` (lefthook) | Prettier y después ESLint sobre los ficheros preparados, sin `tsc` (D-86); `commitlint` en `commit-msg` | < 15 s |
| `pre-push` (lefthook) | `npm test` | < 1 min |
| CI en cada *push* o PR | Todo (08-despliegue §3) | < 10 min |
