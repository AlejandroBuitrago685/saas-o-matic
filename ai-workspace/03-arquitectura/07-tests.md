# 07 · Estrategia de tests

Los 83 criterios de aceptación (spec `07-criterios-aceptacion.md`) y los 129 vectores (`TV-…`) son la lista de lo que
hay que probar. Cada test cita los suyos. Los niveles siguen la columna «Nivel» de cada AC.

## 1. Niveles

| Nivel | Qué se prueba | Herramienta | Entorno | AC |
|---|---|---|---|---|
| **Dominio** (`packages/domain`) | Tramos, impuestos, redondeo, conversión, normalización, validadores fiscales, escala del slider, validación del catálogo y transiciones de la máquina de tipos (si se extraen al dominio). | Vitest; `fast-check` para propiedades | Node, sin I/O | AC-01…07, AC-10…16, AC-91 (parte U) |
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
  - AC-03 (crecimiento y coste marginal) con `fast-check`.
  - AC-91 (slider) **de forma exhaustiva**: 280 posiciones y 10 000 valores, sin muestreo.
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
  su caso: error de red, `500`, `429`, `result: "error"`, `base_code` erróneo, retraso de 3 s, respuesta sin GBP.
  Cualquier otra petición a un origen externo **hace fallar el test**, así que nunca se toca la red real.
- **Tiempo:** `page.clock` de Playwright para la caducidad de la caché (30 min, 2 h, 3 días) en AC-82, y
  `localStorage` preparado antes de cargar la página.
- **Datos:** la pila arranca con la base de datos del perfil `e2e`. Cada test crea sus propios clientes con
  identificadores sintéticos únicos, así que no depende del orden ni de otros tests.
  - Los estados que necesitan una base de datos vacía o un backend caído (AC-70, AC-85) se prueban interceptando `/api/**`.
- **Producción realista en CI:** se ejecutan contra la pila de Docker Compose (nginx + API), lo que comprueba también
  la CSP y las cabeceras reales (AC-52), el proxy `/api` y que el contenedor no corre como root (AC-60).
  - En local también se pueden ejecutar contra los servidores de desarrollo; los tests etiquetados `@prod-only` se omiten.
- **Accesibilidad:** `@axe-core/playwright` en cada vista (AC-86). Ventana de 360 × 800 para AC-84.
- **Detector de violaciones de CSP (AC-64, D-70):** un *fixture* automático de Playwright, activo en **todos** los
  tests que se ejecutan contra la pila de producción.
  - Registra los eventos `securitypolicyviolation` (con `page.addInitScript`) y los mensajes de consola de CSP.
  - Al terminar cada test, falla si ha registrado alguno.
  - Así, una violación de CSP hace fallar cualquier e2e, no solo uno dedicado.

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
