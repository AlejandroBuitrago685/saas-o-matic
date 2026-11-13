# 02 · Estructura del monorepo

## 1. Árbol de carpetas

```text
saas-o-matic/
├── package.json              # workspaces, scripts de orquestación, engines (D-37) y tooling común
├── package-lock.json         # versionado; en CI se instala con `npm ci`
├── .nvmrc                    # 26 (D-38)
├── tsconfig.base.json        # opciones estrictas comunes (09-calidad §2)
├── eslint.config.js          # configuración flat única, con reglas por zona (09-calidad §3)
├── lefthook.yml              # hooks de git: pre-commit (lint y formato), commit-msg (Conventional Commits)
├── docker-compose.yml        # alternativa de arranque (RNF-20, P6; 08-despliegue §2)
├── docker-compose.e2e.yml    # override de la pila de e2e: solo límites de peticiones (D-133)
├── .dockerignore             # contexto de build de las dos imágenes
├── .github/workflows/ci.yml  # pipeline (D-52, D-53)
├── .claude/
│   ├── settings.json         # hooks de Claude Code (se configuran en el scaffolding)
│   └── agents/revisor.md     # subagente revisor de solo lectura
├── scripts/                  # utilidades del repo en Node sin dependencias: trazabilidad, comprobaciones de CI, hooks
├── ai-workspace/             # proceso y documentación (entregable)
├── packages/
│   ├── domain/               # @saas-o-matic/domain: reglas de negocio puras (ADR-001)
│   │   ├── src/
│   │   │   ├── money/        # céntimos, redondeo comercial
│   │   │   ├── pricing/      # tarifa, tramos, calculatePricing
│   │   │   ├── tax/          # impuesto sobre la base (bps)
│   │   │   ├── currency/     # decimales ISO 4217 y conversión por partidas hoja (D-20)
│   │   │   ├── tax-id/       # normalización, un validador por país y registro (RNF-26)
│   │   │   ├── slider/       # aUsuarios / aPosición (D-48, D-49)
│   │   │   ├── catalog/      # tipos del catálogo y validateCatalog (AC-07)
│   │   │   ├── text/         # normalización de nombres y de texto de búsqueda (D-34, ADR-006)
│   │   │   ├── shared/       # Result<T, E> y utilidades de tipos
│   │   │   └── index.ts      # API pública: lo único importable desde fuera
│   │   └── test/vectors/     # vectores TV-… como datos tipados, con su ID
│   └── contract/             # @saas-o-matic/contract: esquemas Zod y tipos de la API (ADR-002)
│       └── src/              # catalog.ts, customers.ts, simulations.ts, stats.ts, health.ts, pagination.ts,
│                             # problem.ts (RFC 9457), error-codes.ts, index.ts
├── apps/
│   ├── api/                  # @saas-o-matic/api: Fastify (03-backend)
│   │   ├── drizzle/          # migraciones SQL generadas y revisadas (nunca se editan una vez aplicadas)
│   │   ├── drizzle.config.ts
│   │   ├── src/
│   │   │   ├── main.ts       # raíz de composición: config → db → buildApp → listen
│   │   │   ├── app.ts        # buildApp(deps): construye la app sin escuchar
│   │   │   ├── config/       # esquema de entorno, datos del catálogo, loadConfig
│   │   │   ├── db/           # conexión y pragmas, esquema Drizzle, migrate, seed
│   │   │   ├── http/         # plugins transversales: seguridad, CORS, límite de peticiones, errores, 404, request-id
│   │   │   ├── shared/       # AppError, Clock, IdGenerator, logger
│   │   │   └── modules/      # customers/ simulations/ catalog/ stats/ health/
│   │   └── test/             # helpers: buildTestApp, base de datos de test, builders de datos
│   └── web/                  # @saas-o-matic/web: Angular 22 (06-frontend); nginx/ y Dockerfile de la imagen
│       └── src/app/
│           ├── core/         # api, catalog, currency, errors, layout (cabecera, pie, aviso de demo)
│           ├── shared/       # componentes de UI sin estado de negocio, pipes y formato
│           └── features/     # dashboard/ customer-create/ customer-detail/ simulator/
└── e2e/                      # @saas-o-matic/e2e: Playwright (07-tests), proyectos `stack` y `dev`
    ├── fixtures/             # test con las guardas de CSP y de red, tipos de referencia, clientes, simulador
    └── specs/                # un fichero por área, cada test con su AC (`*.spec.ts`)
```

## 2. Paquetes y reglas de dependencia

```mermaid
flowchart BT
  domain["domain<br/>(sin dependencias)"]
  contract["contract<br/>(zod)"]
  api["apps/api"]
  web["apps/web"]
  e2e["e2e"]
  contract --> domain
  api --> domain
  api --> contract
  web --> domain
  web -. "import type" .-> contract
  e2e -. "import type" .-> contract
```

| Paquete | Puede depender de | Prohibido |
|---|---|---|
| `domain` | Nada: ni dependencias de npm ni APIs de Node o del navegador. | I/O, `Date.now()`, `Math.random()`, `console`, frameworks. |
| `contract` | `domain` (constantes y normalizadores) y `zod`. | `apps/*`, I/O. |
| `apps/api` | `domain`, `contract` y sus librerías de servidor. | `apps/web`. |
| `apps/web` | `domain`, `contract` **solo con `import type`** y Angular. | `zod` (no se empaqueta), `apps/api`. |
| `e2e` | `contract` solo con `import type`, Playwright. | Código de `apps/*`. |

Además:

- Cada paquete expone su API **solo por `index.ts`**, mediante el campo `exports` de su `package.json`. Importar un
  fichero interno de otro paquete no resuelve.
- Las reglas de las capas internas están en [`03-backend.md`](03-backend.md) §2 y [`06-frontend.md`](06-frontend.md) §2.
- Todas se comprueban de forma automática ([`09-calidad-y-automatizacion.md`](09-calidad-y-automatizacion.md) §3).

### 2.1 ¿Esquemas Zod en un paquete compartido? Sí, con consumo solo de tipos en la interfaz

| | A favor | En contra |
|---|---|---|
| Única fuente de verdad | El esquema define a la vez la validación de la API, los tipos de la interfaz y el documento OpenAPI, así que no pueden divergir. | La interfaz queda acoplada a cambios del contrato; en un monorepo con una única versión, eso es justo lo que se quiere. |
| Tipos en la interfaz | Los DTO salen de `z.output<…>`: si el backend cambia un campo, la interfaz deja de compilar. | Hay que distinguir el tipo de entrada del de salida (`z.input` frente a `z.output`) cuando hay transformaciones; se exportan con nombres explícitos (`CreateCustomerRequest`, `CustomerResponse`). |
| Códigos de error | El catálogo de `code` es un tipo compartido: el diccionario de mensajes en español es exhaustivo en tiempo de compilación. | — |
| Tamaño del bundle | Con `import type`, Zod no llega al navegador: coste cero. | Si alguien importa un valor por error, Zod entraría en el bundle; lo impide una regla de lint (09-calidad §3). |
| Validación en la interfaz | — | La interfaz no reutiliza los esquemas para validar formularios. Valida lo mínimo para la experiencia, con los límites de `GET /catalog`, y la autoridad sigue siendo la API. Es una duplicación pequeña y aceptada. |

Decisión y alternativas en [ADR-002](adr/ADR-002-contrato-compartido-zod.md).

## 3. Versiones

| Elemento | Versión | Motivo |
|---|---|---|
| Node | `engines`: `^22.22.3 \|\| ^24.15.0 \|\| >=26.0.0`; `.nvmrc`: 26 | D-37, D-38. |
| TypeScript | **6.0.x fijada (6.0.3)** en todo el monorepo | Angular 22 exige `>=6.0 <6.1`, y typescript-eslint `<6.1`. TypeScript 7.0 se publicó el 2026-11-12, pero el ecosistema aún no lo soporta (D-67). |
| Angular | 22.2.x | Última estable (`latest`). |

## 4. Inventario de dependencias

Cada dependencia tiene un motivo, una alternativa considerada y su estado de mantenimiento (fecha de la última
publicación en npm, consultada el 2026-11-12). Cualquier dependencia nueva sigue esta misma tabla (regla en `CLAUDE.md`).

### 4.1 Producción

| Paquete | Versión | Último publish | Para qué | Alternativa descartada |
|---|---|---|---|---|
| `fastify` | 5.12.8 | 2026-11-02 | Servidor HTTP (stack decidido). | — |
| `@fastify/helmet` | 13.2.0 | 2026-10-13 | Cabeceras de seguridad (RNF-SEC-06). | Hook propio: más código que mantener. |
| `@fastify/cors` | 11.4.1 | 2026-11-05 | CORS con lista cerrada (RNF-SEC-07). | Hook propio. |
| `@fastify/rate-limit` | 11.2.2 | 2026-11-02 | Límite de peticiones (RNF-SEC-08). | Delegarlo en el proxy: no cubre el arranque con npm. |
| `fastify-type-provider-zod` | 7.0.0 | 2026-06-24 | Usar los esquemas Zod como validación y serialización de Fastify. | Adaptador propio (unas 40 líneas). Se elige el paquete porque está mantenido y lo usa mucha gente. Arrastra `@fastify/swagger` como *peer*, que aprovechamos para generar el inventario OpenAPI (RNF-SEC-17). |
| `@fastify/swagger` | 9.9.3 | 2026-11-01 | Generar `apps/api/openapi.json` (`npm run openapi`), versionado y comprobado por un test (D-110). Solo recoge las rutas: no sirve nada por sí mismo. | — |
| `zod` | 4.6.x | 2026-10-12 | Esquemas del contrato y del entorno (stack decidido). | — |
| `drizzle-orm` | 0.45.4 | 2026-10-21 | ORM (stack decidido). | — |
| `better-sqlite3` | 13.1.1 | 2026-11-11 | Driver de SQLite ([`05-driver-sqlite.md`](05-driver-sqlite.md)). | `@libsql/client`, `sql.js`, `node:sqlite`. |
| ~~`uuid`~~ | — | — | **Descartada en P3 (D-115):** su `v7()` dedica 32 bits al contador y deja 42 bits aleatorios en los ids del mismo milisegundo, y RNF-SEC-04 pide 62. El generador propio (`apps/api/src/shared/id-generator.ts`, método 1 de RFC 9562 §6.2) son unas 40 líneas con `node:crypto` y tests de cada rama. | — |
| `@angular/*` | 22.2.x | 2026-11 | Interfaz (stack decidido). | — |
| `tailwindcss` + `@tailwindcss/postcss` | 4.3.5 | 2026-11-11 | Estilos (stack decidido). | — |
| `@fontsource-variable/montserrat` | 5.3.0 | 2026-07-19 | **(P5, D-123)** Montserrat, la tipografía de la referencia visual (OFL-1.1), autoalojada: CSS con `@font-face` y `.woff2` variables por subconjunto, sin JavaScript. Angular copia los ficheros al build con *hash* y los sirve desde el mismo origen (CSP sin CDN). Impacto: 375 KB en disco; el navegador solo descarga el subconjunto `latin` (38 KB). | Copiar los `.woff2` y la licencia a `public/` (binarios en git, actualización a mano, fuera de `npm audit`); Google Fonts o un CDN (la CSP lo impide). |

El logger es `pino`, que ya viene con Fastify: no es una dependencia nueva.

**Instalado en P0** (versiones exactas, `save-exact`): `fastify` 5.12.8, `fastify-type-provider-zod` 7.0.0,
`@fastify/swagger` 9.9.3, `zod` 4.6.7, `drizzle-orm` 0.45.4, `better-sqlite3` 13.1.1 y `@angular/*` 22.2.6.

Las arrastra Angular (`ng new`) y son de mantenimiento mínimo: `rxjs` 7.8.2, `tslib` 2.9.1, `postcss` 8.5.32 y
`jsdom` 30.1.3 (entorno de los tests de componentes; la rama 30 es la que propone el CLI, aunque ya exista la 31).

**Instalado en P5:** `@fontsource-variable/montserrat` 5.3.0 (`save-exact`).

**Instalado en P3:** `@fastify/helmet` 13.2.0, `@fastify/cors` 11.4.1 y `@fastify/rate-limit` 11.2.2, y
`@fastify/swagger-ui` 6.1.3 como dependencia de desarrollo (§4.2). Todas son JavaScript puro, sin compilación nativa.

### 4.2 Desarrollo y CI

| Paquete | Versión | Último publish | Para qué |
|---|---|---|---|
| `typescript` | 6.0.3 | — | Compilador (fijado, D-67). |
| `drizzle-kit` | 0.31.11 | 2026-10-21 | Generar y comprobar migraciones. |
| `vitest`, `@vitest/coverage-v8` | 5.1.0 | 2026-11-02 | Tests unitarios y de integración, y cobertura. Angular 22 usa Vitest por defecto. |
| ~~`fast-check`~~ | — | — | **Descartada (D-90):** el dominio es finito y se recorre entero, sin muestreo aleatorio. |
| `@playwright/test` | 1.65.0 | 2026-11-12 | e2e. |
| `@axe-core/playwright` | 4.14.0 | 2026-11-06 | Auditoría automática de accesibilidad (AC-86). |
| `eslint`, `typescript-eslint`, `angular-eslint` | 10.14 / 8.72 / 22.6 | 2026-10/11 | Lint estricto. |
| `eslint-plugin-boundaries` | 7.4.2 | 2026-11-05 | Fronteras entre paquetes y capas. |
| `eslint-config-prettier` | 10.1.8 | 2025-07-20 | Desactivar las reglas de estilo que chocan con Prettier. No se publica desde hace más de un año, pero solo es una lista de reglas desactivadas y es la opción de referencia. |
| `@eslint-community/eslint-plugin-eslint-comments` | 4.8.1 | 2026-09-12 | Exigir un motivo en cada excepción de lint. |
| `eslint-import-resolver-typescript` | 4.4.5 | 2026-06-01 | **(P0)** Que boundaries resuelva los imports TS (`./x.js` → `x.ts`) y los paquetes del workspace. Sus *peers* `eslint-plugin-import` e `import-x` son opcionales y no se instalan (D-84). |
| `@eslint/js` | 10.0.1 | 2026-07-10 | **(P0)** Reglas base recomendadas de ESLint 10, que ya no vienen incluidas (D-84). |
| `globals` | 17.14.0 | 2026-11-01 | **(P0)** Globales de Node para los ficheros JS de configuración y scripts. |
| `@types/node` | 22.20.5 | 2026-10-01 | **(P0)** Tipos de la versión **mínima** soportada (Node 22): el compilador avisa si se usa una API de Node 24 o 26. |
| `@types/better-sqlite3` | 9.6.0 | 2026-08-01 | **(P0)** Tipos del driver. |
| `@commitlint/config-conventional` | 21.2.4 | 2026-10-18 | Reglas de Conventional Commits. |
| `dependency-cruiser` | 18.7.2 | 2026-11-02 | Detectar ciclos y generar el grafo de dependencias. |
| `prettier` | 3.10.x | 2026-11-12 | Formato. |
| `lefthook` | 2.2.2 | 2026-10-13 | Hooks de git sin dependencias de Node. Alternativa: husky + lint-staged (dos paquetes). |
| `@commitlint/cli` | 21.2.4 | 2026-10-18 | Comprobar Conventional Commits en el hook `commit-msg`. |
| `pino-pretty` | 13.2.0 | 2026-10-04 | Logs legibles solo en desarrollo. |
| `tsx` | 4.23.x | 2026-09-20 | Ejecutar TypeScript en desarrollo (API en modo `watch`, scripts de base de datos). |
| `@fastify/swagger-ui` | 6.1.3 | 2026-11-03 | **(P3, D-110)** Swagger UI en `/docs`, **solo con `NODE_ENV=development`**: se carga con `import()` dinámico y, como es de desarrollo, la imagen de producción ni la contiene (un test comprueba que con `production` no se importa). Arrastra `@fastify/static`, `yaml`, `rfdc` y `openapi-types`; unos 3,4 MB en disco con `@fastify/static`, casi todo los ficheros de la UI, y nada en el *bundle*. Alternativas descartadas: no servir UI (los evaluadores tendrían que leer el JSON) o un visor externo (sacaría la API a un tercero). |

La herramienta para lanzar API y web a la vez en desarrollo es un script propio, sin dependencia
(`scripts/dev.mjs`), en lugar de `concurrently`.

**Instalado en P6:** `@playwright/test` 1.65.0 (`save-exact`), en el workspace `e2e`. Sin código nativo: los
navegadores se descargan aparte con `npx playwright install chromium` (en el CI, `--with-deps`).

**Instalado en P9:** `@axe-core/playwright` 4.14.0 (`save-exact`), en el workspace `e2e`. Sigue siendo la última
versión publicada (comprobado con `npm view` el 13/11). Solo añade `axe-core` 4.14.0, sin código nativo.

### 4.3 Imágenes de contenedor (P6)

Fijadas por *digest* en los `Dockerfile` (un `ARG` por imagen); para actualizar una se cambian la etiqueta y el
*digest* a la vez. Consultadas en Docker Hub el 2026-11-13.

| Imagen | Etiqueta | Publicada | Para qué | Alternativa descartada |
|---|---|---|---|---|
| `node` | `26.13.1-alpine3.24` (`sha256:6bd9ab43…10bffb5`) | 2026-11-11 | Build de los paquetes, de la API y de la web, y ejecución de la API. Node de `.nvmrc`; Alpine porque better-sqlite3 trae el binario musl. | `node:26-bookworm-slim`: más pesada y sin ventaja, porque nada se compila. |
| `nginxinc/nginx-unprivileged` | `1.30.6-alpine3.24` (`sha256:f5116ed4…130cdf03`) | 2026-10-19 | Servir la SPA y hacer de proxy de `/api`. Rama estable de nginx, sin root de serie (uid 101, puerto 8080). | `nginx:alpine` (arranca como root y escucha en el 80); imagen propia con `headers-more` (D-131). |

Impacto: la imagen de la API pesa unos 350 MB sin comprimir (74 MB de `node_modules`, de los que 27 MB son los binarios
precompilados de better-sqlite3 para todas las plataformas); la de la web, 91 MB.
