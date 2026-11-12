# CLAUDE.md — SaaS-O-Matic

Herramienta interna para que el equipo comercial simule y presupueste suscripciones SaaS multi-divisa para clientes
corporativos. Es una prueba técnica: el proceso de ingeniería (planificación, criterio técnico y control de calidad)
se evalúa tanto como el código.

Documentos: `ai-workspace/` → `00-enunciado.md` · `01-analisis.md` · `02-especificacion/` (empezar por su README) ·
`03-arquitectura/` (README y `adr/`) · `decisiones.md` · `prompts/`.

## Nivel de exigencia

- Trabaja con el estándar de un **ingeniero senior**: código mantenible y modular, **sin deuda técnica**.
- Si una decisión del usuario te parece mala, **dilo antes de ejecutarla** y explica por qué.
- Explica los *trade-offs* de cada decisión no trivial y regístrala (`D-xx`).
- **Nada está terminado sin tests que pasen.** No digas que algo funciona sin haberlo ejecutado.

## Reglas de trabajo

1. **Por fases:** no se escribe código de producción de una parte hasta que su especificación esté aprobada.
2. **No inventar reglas de negocio:** pregunta. Si hace falta asumir algo, márcalo como `SUPUESTO` y regístralo.
3. **Todo se documenta en `/ai-workspace`** (también es un entregable). Los documentos de fase se numeran; los
   transversales (`decisiones.md`, `prompts/`) no.
4. **Idioma:** documentación en español; código, identificadores y commits en inglés (Conventional Commits).
5. **Cierre de cada paso:** resumen corto con lo hecho, lo decidido y las dudas.
6. **Prompts:** cada prompt del usuario se guarda literal en `ai-workspace/prompts/` (`NN-tema.md`).
7. **Decisiones:** en `decisiones.md`, con la alternativa descartada, el motivo y quién la toma. Las de Claude que
   necesitan validación se marcan `Claude · pendiente`.
8. **Verificar antes de afirmar:** los datos externos se contrastan con su fuente y se citan; los vectores se
   calculan con un script.

## Arquitectura

Monorepo: `packages/domain` (reglas puras) · `packages/contract` (esquemas Zod) · `apps/api` (Fastify) ·
`apps/web` (Angular) · `e2e`. Detalle en `03-arquitectura/02-monorepo.md`, `03-backend.md` y `06-frontend.md`.

**Reglas de dependencia** ⚙ (`eslint-plugin-boundaries` + `no-restricted-imports`, `09-calidad-y-automatizacion.md` §3):

- `domain` no depende de nada: ni npm, ni Node, ni DOM, ni `Date.now()` o `Math.random()`.
- `contract` → `domain`, `zod`.
- `web` → `contract` **solo con `import type`**; nunca `zod`.
- Paquetes: solo se importa su `index.ts`.
- API: `routes` → `use-case` → puertos ← `repository` → `db`.
  - **Ninguna regla de negocio en las rutas.**
  - Drizzle solo en `repository` y `db`; Fastify solo en `routes`, `http` y la raíz de composición.
  - Un módulo solo usa otro por su `index.ts` ⏳ (la regla se añade en P4, cuando exista un segundo módulo).
- Web: `features` → `core`, `shared`; una feature no importa otra (excepción declarada: `simulator` ← `customer-detail`).

## Código

- **Tamaño** ⚙: 250 líneas por fichero, 40 por función, complejidad 8, anidamiento 3, 3 parámetros (si hacen falta
  más, un objeto). **Una responsabilidad por fichero.** Cada excepción lleva `-- motivo`.
- **TypeScript** ⚙: `strict` y los flags de `09-calidad` §2; **sin `any`**, **sin `!`**, tipos explícitos en lo
  exportado; `import type` para los tipos; `switch` exhaustivos. TypeScript **6.0.3** fijado (D-67).
- **Nombres:**
  - Ficheros en `kebab-case` con sufijo de rol: `create-customer.use-case.ts`, `customers.repository.ts`,
    `customers.routes.ts`, `*.store.ts`, `*.page.ts`, `*.test.ts` ⚙. Componentes de Angular sin sufijo
    `.component` (guía de estilo 2025, D-76).
  - Tipos en `PascalCase`; funciones y variables en `camelCase`; constantes en `UPPER_SNAKE`; booleanos con
    `is`/`has`/`can`; sin prefijo `I` en las interfaces.
  - Base de datos en `snake_case` plural; índices `<tabla>_<cols>_idx`, únicos `_uq`.
- **Errores:**
  - `domain` devuelve `Result`; los casos de uso lanzan `AppError`.
  - Un **único** manejador da formato RFC 9457 (ADR-009).
  - Nunca `catch` vacío ni errores tragados.
- **Logs:**
  - pino; una línea por petición con el **patrón de ruta**.
  - **Nunca** cuerpos, consultas, emails, identificadores fiscales, nombres de empresa ni IPs.
  - Sin `console` ⚙.
- **Frontend:** signals; `computed` para lo derivado; `effect` solo para efectos externos; **sin `styles` ni
  `styleUrl`** ⚙ (CSP).
- **Configuración:** solo en `apps/api/src/config/`, validada al arrancar; no se lee `process.env` fuera de ahí ⚙.

## Dependencias nuevas

Antes de añadir una, justifícala en `03-arquitectura/02-monorepo.md` §4:

- para qué sirve;
- qué alternativas hay (incluido no añadirla);
- versión y fecha del último publish;
- impacto en el bundle o la instalación.

Versión exacta. Sin dependencias que compilen código nativo (RT-06).

## Seguridad (resumen de `02-especificacion/06-seguridad.md`)

- Esquema estricto en toda entrada: campos desconocidos → `400`; body de 16 KiB como máximo; solo `application/json`.
- Solo SQL parametrizado; escapa `!`, `%` y `_` en `LIKE`.
- El servidor calcula todos los importes; nunca se aceptan desde el cliente.
- IDs UUID v7; listados paginados (máximo 100); límite de peticiones.
- Cabeceras y CSP; CORS con lista cerrada; `no-store` en todo salvo `GET /catalog`.
- Errores sin detalles internos; logs sin datos personales.
- Configuración validada al arrancar; ningún secreto en el repo; no se leen ni se editan `.env` ⚙.
- La respuesta de la API de tipos se valida antes de usarla; el backend no hace peticiones salientes.
- Prohibidos `innerHTML`, `outerHTML` y `bypassSecurityTrust*` ⚙.
- Auditoría de dependencias en CI ⏳; contenedores sin root.

## Tests

- **TDD en `domain`:** primero el test con los vectores de la spec; cobertura del 100 % ⚙.
- Cada test cita en su título su `AC-xx` y/o `TV-…`; los de infraestructura, su `D-xx` o ADR ⏳
  (`scripts/trace-tests.mjs` solo informa hasta P10, donde pasa a bloquear).
- Cada bug lleva un test de regresión que falla antes del arreglo.
- Integración de la API con `app.inject()` y SQLite en memoria. e2e con la API externa siempre simulada.
  Estrategia completa en `03-arquitectura/07-tests.md`.

## Definición de hecho

Una parte está **hecha** cuando cumple **todo** esto:

1. Sus AC tienen tests y pasan: unitarios, de integración y e2e según el nivel del AC.
2. Lint, tipos, fronteras y formato pasan sin excepciones nuevas sin motivo (el hook `Stop` lo verifica ⚙).
3. Cumple las reglas de seguridad aplicables y no deja datos personales en los logs.
4. En la interfaz: estados de carga, vacío y error, y funciona a 360 px y con teclado.
5. Documentación al día: contrato o OpenAPI, decisiones nuevas en `decisiones.md` y trazabilidad.
6. El **subagente `revisor`** no deja hallazgos P0 ni P1 abiertos. No tiene `Bash`: pásale la lista de ficheros, el
   `git diff`, los AC y TV que cubre el cambio y el resultado de lint y tests.
7. Commit en Conventional Commits.

⚙ = una herramienta configurada **y probada** lo comprueba (ESLint, `tsc`, scripts y hooks de Claude Code, cada uno con
tests en `tools/`). ⏳ = configurado pero todavía no demostrado: la auditoría, hasta que corra el primer CI en GitHub;
la trazabilidad, que solo informa hasta P10 (D-86). Detalle en `03-arquitectura/09-calidad-y-automatizacion.md`.

## Trazabilidad

| Prefijo | Qué es | Dónde |
|---|---|---|
| `RF`, `RNF`, `RNF-SEC` | Requisitos | `01-analisis.md`, `02-especificacion/01-alcance.md`, `06-seguridad.md` |
| `CL` | Casos límite | `01-analisis.md` §5, `02-especificacion/07-criterios-aceptacion.md` §0 |
| `TV-…` | Vectores de prueba | `02-especificacion/02-reglas-negocio.md`, `03-validacion-fiscal.md`, `05-frontend.md` |
| `AC` | Criterios de aceptación | `02-especificacion/07-criterios-aceptacion.md` (matriz en `08-trazabilidad.md`) |
| `D`, `S`, `PN`, `ADR` | Decisiones, supuestos, preguntas para negocio, ADR | `decisiones.md`, `03-arquitectura/adr/` |

## Stack

npm workspaces · Node `^22.22.3 || ^24.15.0 || >=26.0.0` (`.nvmrc` 26) · TypeScript 6.0.3 · Fastify 5 + Zod 4 ·
SQLite con Drizzle y `better-sqlite3` · Angular 22 (standalone, signals, control flow, sin Zone.js) + Tailwind 4 ·
Vitest + Playwright.
