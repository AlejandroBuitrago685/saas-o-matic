# 09 · Calidad y automatización

Principio: **una regla que se puede comprobar con una herramienta no se queda en texto**. `CLAUDE.md` resume las
reglas; este documento dice qué herramienta hace cumplir cada una y en qué momento. Todo se configura en el
scaffolding ([ADR-013](adr/ADR-013-cumplimiento-automatico.md)).

## 1. Regla → herramienta

| Regla (`CLAUDE.md`) | Herramienta | Cuándo |
|---|---|---|
| TypeScript estricto, sin `any`, sin `!` | `tsc` (§2) + typescript-eslint (§3) | Lint: hook tras editar y pre-commit. `tsc`: hook `Stop`. Ambos: CI |
| Tipos explícitos en las API públicas | `@typescript-eslint/explicit-module-boundary-types` | Ídem |
| Fronteras entre paquetes y capas | `eslint-plugin-boundaries` + `no-restricted-imports` + `exports` de cada paquete (§3.3) | Ídem |
| Sin ciclos | `dependency-cruiser` (`no-circular`) | CI |
| Tamaño y complejidad | Reglas de ESLint (§3.2) | Hook, pre-commit, CI |
| Nombres de fichero | `scripts/check-filenames.mjs` (sin dependencias) | CI |
| Formato | Prettier | pre-commit, CI |
| Conventional Commits | commitlint (hook `commit-msg` de lefthook) | Commit |
| Sin `innerHTML` ni `bypassSecurityTrust*` (RNF-SEC-14) | `no-restricted-syntax` en TS + `scripts/check-forbidden-patterns.mjs` para plantillas | CI, hook |
| Sin estilos de componente (CSP) | `no-restricted-syntax` sobre `styles`/`styleUrl` en `@Component` | Ídem |
| Sin `console`, sin `process.env` fuera de `config/` | `no-console`, `no-restricted-properties` | Ídem |
| Backend sin clientes salientes (RNF-SEC-18, AC-59, D-154) | `no-restricted-imports` (`http`, `https`, `http2`, `tls`, `dgram`, `undici`… y lo que abre conexiones de `net`) y `no-restricted-globals` (`fetch`, `WebSocket`…) en `apps/api/src` | Ídem |
| Web sin valores de `contract` ni `zod` | `no-restricted-imports` + `@typescript-eslint/consistent-type-imports` | Ídem |
| Migraciones aplicadas inmutables | Hook `PreToolUse` (§5). | Edición |
| El esquema y las migraciones versionadas coinciden | `npm run db:check -w @saas-o-matic/api`: ejecuta `drizzle-kit generate` y falla si aparece o cambia un fichero, o si drizzle-kit no confirma «No schema changes» (sale con 0 incluso cuando un renombrado ambiguo le impide terminar). Probado a mano en P3 con los tres casos: sin cambios, renombrado e índice nuevo. | CI |
| `openapi.json` al día con los esquemas (D-110) | Test `apps/api/test/openapi-document.test.ts`; se regenera con `npm run openapi -w @saas-o-matic/api` | Tests (CI, `verify`) |
| Sin secretos | `.gitignore`, `check-forbidden-patterns` (`.env` versionados), permisos `deny` y hook `PreToolUse` | CI, sesión |
| Sin caracteres invisibles literales en código y configuración (formato, bidi, separadores, controles, espacios no ASCII) | `check-forbidden-patterns` (D-96) | Hook `Stop`, CI |
| Dependencias auditadas | `npm audit --audit-level=high`; las moderadas de desarrollo son riesgo aceptado (D-89) | CI |
| Nada se integra con el CI en rojo | Protección de `main` en GitHub: PR obligatoria y los 5 checks del CI (D-88; `e2e` desde P6) | Merge |
| Cada test cita su AC o TV (los de infraestructura, su D o ADR) | `scripts/trace-tests.mjs`: informa en el CI; con `--strict` bloquea desde P10 | CI |
| Cobertura del dominio al 100 % | Umbrales de Vitest | CI |
| «Hecho» = tests en verde | Hook `Stop` (§5) | Al terminar cada tarea |

## 2. TypeScript

`tsconfig.base.json`, que heredan todos los paquetes:

`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noImplicitReturns`,
`noFallthroughCasesInSwitch`, `noPropertyAccessFromIndexSignature`, `useUnknownInCatchVariables`,
`verbatimModuleSyntax`, `isolatedModules`, `forceConsistentCasingInFileNames`, `skipLibCheck: false` en `domain`.

- `domain` compila con `lib: ["ES2023"]` y `types: []`: sin DOM ni Node, así que cualquier I/O es un error de compilación.
- Proyectos referenciados (`tsc -b`) para compilar de forma incremental.
- TypeScript fijado en 6.0.x (D-67).

## 3. ESLint (configuración flat única)

### 3.1 Bases

- `typescript-eslint` con `strictTypeChecked` y `stylisticTypeChecked` (con información de tipos).
- `angular-eslint` (TS y plantillas) en `apps/web`.
- `eslint-config-prettier` al final.
- Reglas destacadas:
  - `no-explicit-any`, `no-non-null-assertion`, `no-floating-promises`, `switch-exhaustiveness-check`,
    `consistent-type-imports`, `explicit-module-boundary-types`, `no-unnecessary-condition`, `prefer-readonly`.
  - `eqeqeq`, `no-console`, `no-restricted-syntax` (§1).

### 3.2 Límites de tamaño y complejidad

| Regla | Código | Tests |
|---|---|---|
| `max-lines` (sin líneas en blanco ni comentarios) | **250** por fichero | 400 |
| `max-lines-per-function` | **40** | Desactivada (un `describe` agrupa muchos tests) |
| `complexity` (ciclomática) | **8** | — |
| `max-depth` | **3** | — |
| `max-params` | **3** (si hacen falta más, un objeto con nombre) | — |
| `max-nested-callbacks` | 3 | 4 |
| `@angular-eslint/template/cyclomatic-complexity` | 6 por plantilla | — |

Una excepción a un límite exige `// eslint-disable-next-line <regla> -- <motivo>`, y la regla
`eslint-comments/require-description` obliga a escribir el motivo. El revisor señala cualquier excepción.

### 3.3 Fronteras (implementación de P0, D-83)

Dos mecanismos, porque cada uno resuelve bien una cosa:

1. **`eslint-plugin-boundaries` v7** (`tools/eslint/boundaries.js`) para las dependencias **entre carpetas del
   repositorio**.
   - Elementos por carpeta desde la raíz (`partialMatch: false`); el primer patrón que coincide gana.
   - Elementos: `domain`, `contract`; en la API, `api-module` (cada carpeta de `modules/`), `api-db`, `api-http`,
     `api-config`, `api-shared` y `api-composition` (el resto de `apps/api/src`); en la web, `web-feature-<nombre>`
     (una por feature), `web-core`, `web-shared` y `web-root`.
   - Política por defecto: **disallow**. Por diseño de la v7, las dependencias externas y de Node no se evalúan
     (`not-local`).
   - La resolución usa `eslint-import-resolver-typescript`, que sigue los `./x.js` hasta `x.ts` y los paquetes del
     workspace hasta su `dist`.
2. **`no-restricted-imports`** por zona (`tools/eslint/restrictions.js`) para las **librerías externas** y para las
   **capas dentro de un módulo**, que se distinguen por el sufijo del fichero:
   - `domain`: solo imports relativos, sin globales del entorno, sin `Date.now()`, `Math.random()` ni `new Date()`.
   - `contract`: solo `zod` y el dominio.
   - Web: `zod` prohibido; `@saas-o-matic/contract` solo con `import type`.
   - `*.routes.ts`, `http/`, `app.ts` y `main.ts`: sin Drizzle ni SQLite. Las rutas tampoco pueden importar un `*.repository`.
   - `db/` y `*.repository.ts`: sin Fastify.
   - `*.use-case.ts`: sin Drizzle, sin Fastify y sin importar un repositorio (usa el puerto).
   - Resto de `apps/api/src`: sin Drizzle ni Fastify.
   - `process.env` prohibido fuera de `apps/api/src/config/`.

| Desde | Puede importar (ficheros del repositorio) |
|---|---|
| `domain` | `domain` |
| `contract` | `contract`, `domain` |
| `api-module` | `api-module`, `api-db`, `api-shared`, `contract`, `domain` |
| `api-db` | `api-db`, `api-shared`, `domain` |
| `api-http` | `api-http`, `api-shared`, `contract`, `domain` |
| `api-config` | `api-config`, `api-shared`, `domain` |
| `api-shared` | `api-shared`, `contract`, `domain` (D-112: `AppError` usa los códigos del contrato) |
| `api-composition` | Todo lo de la API, `contract`, `domain` |
| `web-feature-X` | `web-feature-X`, `web-core`, `web-shared`, `domain`, `contract`; además, `customer-detail` → `simulator` |
| `web-core` | `web-core`, `web-shared`, `domain`, `contract` |
| `web-shared` | `web-shared`, `domain` |
| `web-root` | Todas las features, `web-core`, `web-shared`, `domain`, `contract` |

**Módulos de la API (P4, D-119).** Un módulo solo usa otro por su `index.ts`, y la raíz de composición (`app.ts`,
`main.ts`) solo usa un módulo por su `index.ts`. Lo comprueba `no-restricted-imports` por patrones sobre la ruta
(`../<otro>/<fichero que no sea index>` dentro de un módulo y `./modules/<módulo>/<fichero que no sea index>` en la
raíz), con tests positivos y negativos en `tools/eslint-zones.test.ts`. En la práctica los módulos no se importan entre
sí: `simulations` declara el puerto `CustomerLookup` y `app.ts` le conecta el repositorio de `customers`.

**El *seed* (P7, D-140)** también conecta casos de uso, como la raíz de composición. `seed.ts` está en la raíz, y
`apps/api/src/seed/**` tiene sus mismas reglas: sin Drizzle ni Fastify, y los módulos solo por su `index.ts`
(`../modules/<módulo>/<fichero que no sea index>` se rechaza). Tiene tests positivos y negativos en
`tools/eslint-zones.test.ts`.

### 3.4 Cómo se ha probado (P0)

Una regla solo lleva ⚙ en `CLAUDE.md` si tiene un test que demuestra que salta.

- `tools/eslint-rules.test.ts` y `tools/eslint-zones.test.ts` escriben un fichero temporal (`__lint_fixture__*`, ignorado
  por git) **en su ubicación real**, lo lintan con la configuración del repositorio y comprueban la regla esperada.
  - Casos que deben fallar: `any`, `!`, `max-lines`, `max-lines-per-function`, `complexity`, `max-depth`, `max-params`,
    excepción sin motivo, `console`, import externo, `Date.now()` o `fetch` en el dominio, dominio → app, `zod` o
    valores de `contract` en la web, `bypassSecurityTrust*`, estilos de componente, feature → feature, Drizzle en un
    caso de uso, Fastify en un repositorio, `process.env` fuera de `config/`.
  - Casos de control que deben pasar: un fichero limpio y un `import type` desde `contract`.
- `tools/repo-config.test.ts`:
  - `engines`, `.nvmrc` y TypeScript fijado;
  - un import profundo a un paquete no compila (`TS2307`, por el campo `exports`);
  - dependency-cruiser falla ante un ciclo.
- `tools/scripts.test.ts` y `tools/claude-hooks.test.ts`: scripts de comprobación y hooks (§5).

## 4. Hooks de git (lefthook)

- `pre-commit`: Prettier (`--write`, vuelve a preparar lo arreglado) y ESLint sobre los ficheros preparados.
  Los tipos los vigilan el hook `Stop` y el CI.
- `commit-msg`: commitlint con la configuración convencional (probado: acepta `feat: …` y rechaza `Added stuff`).
- `pre-push`: `npm test`.
- Se instalan solos con el `postinstall` de lefthook. En el CI se desactivan con `LEFTHOOK=0`.
- `--no-verify` está prohibido por regla y por hook de Claude Code (§5).

## 5. Entorno de Claude Code (`.claude/settings.json`)

Fichero versionado, validado contra el esquema oficial (`schemastore.org/claude-code-settings.json`) el 2026-11-12.

### 5.1 Permisos (D-81, revisados en D-85)

Los pidió el usuario para no tener que confirmar cada acción segura y frecuente.

| Tipo | Reglas | Motivo |
|---|---|---|
| `allow` (32) | `npm ci`, `npm install` **sin argumentos** (reinstala lo del *lockfile*), `npm run …`, `npm test`; `npx` de las herramientas del repositorio (`ng`, `vitest`, `eslint`, `prettier`, `tsc`, `drizzle-kit`, `playwright`); `node scripts/…`; git local (`status`, `diff`, `log`, `add`, `commit`, `switch`, `checkout -b`, `branch`, `rebase`); `gh pr create/view/checks` | Comandos seguros y frecuentes; no salen del repositorio salvo las PR, que el usuario autorizó como flujo (D-82). |
| `ask` (7) | `git push` y `git push …`; `npm install <paquete>`, `npm i …`, `npm add …`; `gh pr merge` | Publicar, añadir una dependencia o hacer *merge* son decisiones del usuario (D-85). |
| `deny` (12) | `Read(**/.env)`, `.env.local`, `.env.*.local`, `.env.development`, `.env.production`, `.env.test` y los mismos con `Edit` | RNF-SEC-12. No se usa `.env.*` para no bloquear `.env.example`, porque en Claude Code `deny` gana a `allow`. |

**Cómo se probó y qué no se pudo probar:**

- Fichero válido según el esquema.
- Con solo los permisos (antes de añadir los hooks), una lectura de un `.env` ficticio **no** se bloqueó en la misma
  sesión: o los permisos no se recargan a mitad de sesión, o el patrón no coincidía.
- Después, al añadir los hooks, Claude Code sí los recargó en caliente: el `PreToolUse` bloqueó una sonda al momento.
- Desde entonces, cualquier lectura de `.env` la bloquea **primero el hook**, así que no se puede comprobar el `deny`
  por separado.
- Las dos barreras quedan activas. El `deny` se volverá a comprobar en una sesión nueva.
- Ojo: `deny` sobre `Read`/`Edit` no cubre `cat .env` por la shell; eso lo bloquea el hook.
- Un test (`tools/repo-config.test.ts`) fija qué va en `ask` y que `allow` no instala paquetes nuevos.
- Riesgo aceptado: `npx playwright` está en `allow` y, mientras Playwright no esté instalado (P6), `npx` lo
  descargaría del registro sin preguntar (sin TTY asume `--yes`). Nadie lo ejecuta antes de P6, que lo fija en
  `devDependencies`.

### 5.2 Hooks (D-80, D-86, D-87)

Scripts en `scripts/claude-hooks/`, en Node y sin dependencias. Leen el evento JSON por `stdin`. Cada uno separa una
función de decisión pura, probada con eventos simulados, de un envoltorio mínimo, probado lanzando el proceso real.

| Evento | *Matcher* | Acción | Al fallar | Tiempo medido (2026-11-12) |
|---|---|---|---|---|
| `PreToolUse` | `Read\|Grep\|Edit\|Write\|MultiEdit\|NotebookEdit\|Bash\|PowerShell` | Bloquea: editar una migración o sus metadatos ya versionados en `apps/api/drizzle/`; leer, buscar o editar `.env` en cualquier caja (salvo `.env.example`), también por `path` o `glob`; `git commit --no-verify` (también `-n`, `-nm`, `--no-veri`) y desactivar los hooks (`LEFTHOOK=0`, `core.hooksPath`); *push* forzado (`-f`, `--force*`, `+rama`); descartar trabajo (`git switch -f` / `--discard-changes`, `checkout -- / .`, `restore`, `reset --hard`, `clean -f`); `git branch -D`; `drizzle-kit push` / `drop`; escribir o borrar en `apps/api/drizzle/`; comandos que mencionan `.env`. Cada regla lee un tramo del comando (`&&`, `;`, `\|`…), sin texto entre comillas. Detalle y falso positivo conocido en D-87. | Código 2 con el motivo. | ≈ 0,1 s |
| `PostToolUse` | `Edit\|Write\|MultiEdit` | **Solo ESLint del fichero editado** (como pidió el usuario): ni tipos, ni tests, ni Prettier. | Código 2 con los primeros 30 errores. | 2,6–3,5 s por fichero (lint con tipos) |
| `Stop` | — | `verify:changed`: compila los paquetes y lanza **en paralelo** formato y lint de los ficheros cambiados, `check-filenames`, `check-forbidden-patterns`, tipos de las áreas afectadas y tests (Vitest, más `ng test` si cambió la web); después, los tests de `tools`. Un cambio en la configuración raíz afecta a todo, y uno en la de lint o formato comprueba todo el repositorio (D-86). **Nunca hace build.** | Código 2 con el final de la salida; Claude no puede terminar en rojo. Con `stop_hook_active` no vuelve a bloquear. | Peor caso (todo P0 sin commitear, todas las áreas): **12 s**. En serie eran 25–30 s. |

- El peor caso supera ligeramente los 10 s pedidos, porque el lint con tipos de unos 60 ficheros a la vez tarda 11,5 s.
- En un turno normal (pocos ficheros de un área) el `Stop` queda en pocos segundos: medido tras el commit de P0, ver
  el diario.
- Si la web cambia, `ng test` añade unos 8 s en paralelo.
- Se descartó la regla «`npm install` sin `--save-exact`» del diseño: `.npmrc` ya fija `save-exact=true` (D-78).

## 6. Subagente revisor

`.claude/agents/revisor.md` (ya creado en esta fase). Revisa un cambio contra `CLAUDE.md`, la especificación y
`06-seguridad.md`, y devuelve los hallazgos ordenados por prioridad, de P0 (bloqueante) a P3 (mejora).

- Herramientas: **solo `Read`, `Grep` y `Glob`**, sin `Bash` (D-72). La documentación oficial de Claude Code
  (`code.claude.com/docs/en/sub-agents`, consultada el 2026-11-12) dice que `tools` acepta nombres de herramientas,
  pero no documenta patrones con argumentos (`Bash(git diff:*)`). En `disallowedTools`, una entrada con argumento
  «still removes the whole tool». No se puede limitar `Bash` a comandos de solo lectura desde el fichero del agente.
- Quien lo invoca le pasa la lista de ficheros cambiados, el diff (pegado o como ruta a un fichero), los AC y TV que
  cubre el cambio y el resultado de lint, tipos y tests.
- Se usa al cerrar cada parte (definición de hecho en `CLAUDE.md`). Los P0 y P1 se corrigen antes del commit; los P2
  y P3 se corrigen o se registran.
