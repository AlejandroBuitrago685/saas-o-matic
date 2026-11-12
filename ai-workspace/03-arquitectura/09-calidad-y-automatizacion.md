# 09 · Calidad y automatización

Principio: **una regla que se puede comprobar con una herramienta no se queda en texto**. `CLAUDE.md` resume las
reglas; este documento dice qué herramienta hace cumplir cada una y en qué momento. Todo se configura en el
scaffolding ([ADR-013](adr/ADR-013-cumplimiento-automatico.md)).

## 1. Regla → herramienta

| Regla (`CLAUDE.md`) | Herramienta | Cuándo |
|---|---|---|
| TypeScript estricto, sin `any`, sin `!` | `tsc` (§2) + typescript-eslint (§3) | Hook tras editar, pre-commit, CI |
| Tipos explícitos en las API públicas | `@typescript-eslint/explicit-module-boundary-types` | Ídem |
| Fronteras entre paquetes y capas | `eslint-plugin-boundaries` + `exports` de cada paquete | Ídem |
| Sin ciclos | `dependency-cruiser` (`no-circular`) | CI |
| Tamaño y complejidad | Reglas de ESLint (§3.2) | Hook, pre-commit, CI |
| Nombres de fichero | `scripts/check-filenames.mjs` (sin dependencias) | CI |
| Formato | Prettier | pre-commit, CI |
| Conventional Commits | commitlint (hook `commit-msg` de lefthook) | Commit |
| Sin `innerHTML` ni `bypassSecurityTrust*` (RNF-SEC-14) | `no-restricted-syntax` en TS + `scripts/check-forbidden-patterns.mjs` para plantillas | CI, hook |
| Sin estilos de componente (CSP) | `no-restricted-syntax` sobre `styles`/`styleUrl` en `@Component` | Ídem |
| Sin `console`, sin `process.env` fuera de `config/` | `no-console`, `no-restricted-properties` | Ídem |
| Web sin valores de `contract` ni `zod` | `no-restricted-imports` + `@typescript-eslint/consistent-type-imports` | Ídem |
| Migraciones aplicadas inmutables | Hook `PreToolUse` (§5) + comprobación de CI | Edición, CI |
| Sin secretos | `.gitignore`, comprobación de `.env` en CI, permisos de Claude Code que bloquean la lectura de `.env` | CI, sesión |
| Dependencias auditadas | `npm audit --audit-level=high` | CI |
| Cada test cita su AC o TV | `scripts/trace-tests.mjs` | CI |
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
| `max-lines-per-function` | **40** | Desactivada para `describe`; 60 por test |
| `complexity` (ciclomática) | **8** | — |
| `max-depth` | **3** | — |
| `max-params` | **3** (si hacen falta más, un objeto con nombre) | — |
| `max-nested-callbacks` | 3 | 4 |
| `@angular-eslint/template/cyclomatic-complexity` | 6 por plantilla | — |

Una excepción a un límite exige `// eslint-disable-next-line <regla> -- <motivo>`, y la regla
`eslint-comments/require-description` obliga a escribir el motivo. El revisor señala cualquier excepción.

### 3.3 Fronteras (`eslint-plugin-boundaries`)

Elementos definidos por patrón de ruta:

- **Paquetes:** `domain`, `contract`, `api`, `web`, `e2e`.
- **Capas de la API:** `api-routes`, `api-use-case`, `api-repository`, `api-db`, `api-http`, `api-config`,
  `api-shared`, `api-composition` (`app.ts`, `main.ts`).
- **Zonas de la web:** `web-core`, `web-shared`, `web-feature`.

| Desde | Puede importar |
|---|---|
| `domain` | `domain` |
| `contract` | `contract`, `domain`, `zod` |
| `api-routes` | `api-use-case` (tipos), `contract`, `api-shared` |
| `api-use-case` | `domain`, `api-shared`, puertos del propio módulo |
| `api-repository` | `api-db`, `api-shared`, `domain` (tipos), `drizzle-orm` |
| `api-composition` | Todo lo de la API |
| `web-feature` | `web-core`, `web-shared`, `domain`, `contract` (solo tipos); `simulator` ← `customer-detail` |
| `web-core` | `web-shared`, `domain`, `contract` (solo tipos) |
| `web-shared` | `domain` |

`drizzle-orm` y `better-sqlite3` solo se pueden importar desde `api-repository` y `api-db`; `fastify`, solo desde
`api-routes`, `api-http` y `api-composition`.

## 4. Hooks de git (lefthook)

- `pre-commit`: ESLint con `--fix` y Prettier sobre los ficheros preparados; `tsc -b` de los paquetes afectados.
- `commit-msg`: commitlint con la configuración convencional.
- `pre-push`: tests unitarios y de integración.
- `--no-verify` está prohibido por regla y por hook de Claude Code (§5).

## 5. Hooks de Claude Code (`.claude/settings.json`)

Los scripts viven en `scripts/claude-hooks/`, en Node y sin dependencias. Leen el JSON del evento por `stdin`.

| Evento | *Matcher* | Acción | Al fallar |
|---|---|---|---|
| `PostToolUse` | `Edit\|Write` | Si el fichero es `.ts`, `.html` o `.json` de `apps/` o `packages/`: Prettier y ESLint sobre ese fichero, y `tsc -b` del paquete al que pertenece. | Código de salida 2 con los errores resumidos por `stderr`, para que Claude los corrija en el acto. |
| `PreToolUse` | `Edit\|Write` | Bloquea la edición de una migración ya existente en `apps/api/drizzle/*.sql` (solo se pueden crear nuevas) y de ficheros `.env`. | Código 2 con el motivo. |
| `PreToolUse` | `Bash` | Bloquea `git commit --no-verify`, `git push --force`, `drizzle-kit push` y `npm install` sin `--save-exact` o fuera de la raíz. | Código 2 con el motivo. |
| `Stop` | — | Ejecuta `npm run verify:changed`: lint, tipos y tests unitarios y de integración de los paquetes cambiados desde `HEAD`. | Código 2: Claude no puede dar la tarea por terminada con tests en rojo. Si la entrada trae `stop_hook_active: true`, no vuelve a bloquear, para evitar bucles. |

Permisos: `deny` para leer o escribir `.env*` (salvo `.env.example`) y para `git push` sin confirmación.

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
