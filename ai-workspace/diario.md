# Diario de desarrollo

Una entrada corta por fase o parte (D-74): **lo hecho**, **lo que falló**, **las correcciones** (del usuario, del
revisor o propias) y **las decisiones**. Es la evidencia del desarrollo iterativo con IA que pide el enunciado (§3.3).
Los prompts literales están en [`prompts/`](prompts/) y las decisiones, en [`decisiones.md`](decisiones.md).

---

## Fase 1 · Análisis — 2026-11-12 · commit `626ac38`

**Hecho**
- Comprobados Node 22.23.4 y npm 10.9.9 contra los `engines` reales de Angular 22, Vitest 5 y `better-sqlite3`.
- `git init`, primer `CLAUDE.md` con las reglas de trabajo y transcripción del enunciado a `00-enunciado.md`.
- La transcripción se **verificó palabra por palabra** contra el XML del `.docx` con un script.
- `01-analisis.md`: 17 RF, 19 RNF, 23 ambigüedades con propuesta, 51 casos límite y 15 riesgos.
- Los valores de los tramos y los caracteres de control se calcularon con un script.

**Falló**
- La extracción del `.docx` rompió por la codificación de la consola de Windows (`cp1252`) con el carácter `●`.
  Se resolvió forzando UTF-8.
- El comparador de fidelidad marcó como diferencias los números de los encabezados. Eran un artefacto del propio
  comparador, no de la transcripción.

**Correcciones del usuario** (en su respuesta a las preguntas)
- Rechazó la validación genérica fuera de España: «no es estricta». Pidió el formato oficial de cada país.
- Rechazó quitar las métricas del dashboard: pasaron a Could.
- Sustituyó RNF-11 por un bloque basado en OWASP con modelo de amenazas.
- Corrigió mi recomendación de Node: la LTS activa era la 26, no la 24, según mis propios datos.

**Decisiones:** D-01 a D-03.

---

## Fase 2 · Especificación — 2026-11-12 · commits `e9fbe2e`, `da3e2ec`, `72cd2ab` y `6fc6745`

**Hecho**
- Especificación en 9 ficheros: alcance MoSCoW, reglas de negocio, validación fiscal, contrato de la API, frontend,
  seguridad (21 RNF-SEC y modelo STRIDE), 82 criterios Given/When/Then y matriz de trazabilidad.
- Registro de decisiones con 53 entradas, supuestos y preguntas para negocio.
- Fuentes oficiales consultadas y citadas:
  - BOE (Orden EHA/451/2008);
  - Ministerio del Interior;
  - AEAT;
  - FAQ de VIES;
  - HMRC;
  - IRS;
  - Your Europe;
  - GOV.UK;
  - términos de ExchangeRate-API.

**Falló**
- La página del Ministerio del Interior devolvía 403 al acceso automático. Se leyó con el navegador integrado.
- Hallazgo en la Orden EHA/451/2008: no define el algoritmo del CIF ni la regla letra/dígito.
  - El algoritmo se contrastó con el NIF real publicado por la AEAT (`Q2826000H`).
  - Se descartó la regla «dígitos 00 ⇒ letra» que propuse en el análisis.
- La base legal del DNI que tenía en mente (RD 1553/2005) estaba desfasada: es el RD 255/2025.
- **La implementación independiente de la spec encontró un error mío.** `W1234567L` daba `INVALID_FORMAT`, no
  `INVALID_CHECK` como había escrito.
- El script de cobertura encontró 6 requisitos y un vector sin criterio de aceptación. Se añadieron AC-93 y AC-94.
- Tras la validación, una búsqueda encontró líneas que seguían diciendo «pendiente de validar». Se corrigieron en un
  commit aparte.

**Correcciones del usuario**
- Slider: la conversión debe ser una función pura con tests (alcanzar 10, 11, 50 y 51; ida y vuelta) y llevar `aria-valuetext`.
- Añadir los CIF reales de Telefónica, Inditex, Mercadona y Banco Santander. Los cuatro pasaron y se confirmó su
  asociación en CNMV y LEI.
- El fallback de divisas no puede ocultar el error: estados siempre visibles y un e2e por estado.
- CI: la matriz de Node solo para lint, tests y build; los e2e, una vez.

**Errores propios detectados al concretar**
- Los porcentajes del slider de D-05 (50/30/20 %) eran imposibles con los pasos aprobados: son 35,7/32,1/32,1 %.
  Corregido en D-49.

**Decisiones:** D-04 a D-53.

---

## Fase 3 · Arquitectura — 2026-11-12 · commit `e729bf8`

**Hecho**
- 9 documentos de arquitectura, 14 ADR, `CLAUDE.md` con reglas de código y el subagente `revisor`.
- Investigación verificada, no supuesta:
  - **TypeScript 7.0** se publicó el mismo día, pero Angular 22 exige `<6.1` → TypeScript 6.0.3 fijado.
  - Drizzle 0.45.4 **no tiene driver para `node:sqlite`**.
  - `better-sqlite3` **se instala sin compilar**: se comprobó que el proceso carga `prebuilds/win32-x64.node`.
  - Drizzle **no admite tablas `STRICT`** → se compensa con `CHECK (typeof …)`.
  - `resource`, `httpResource` y Signal Forms son estables en Angular 22 (comprobado en sus tipos).
- Prueba de rendimiento con 100 000 clientes: 8,5 ms por página de búsqueda.
- Los 6 diagramas Mermaid se validaron con el parser oficial, en local.

**Falló**
- El script de la prueba de rendimiento se rompió porque el shell alteró las barras invertidas del `ESCAPE` de `LIKE`.
  Se cambió el carácter de escape a `!`, que además simplifica el diseño.
- En Windows, el fichero de la prueba de libsql seguía bloqueado (`EBUSY`) al borrarlo.
- El parser de Mermaid no cargaba con rutas absolutas de Windows en ESM. Se resolvió con `pathToFileURL`.
- Escribí que el binario cargado era `prebuilds/win32-x64.node` **antes de comprobarlo**. Lo verifiqué después con
  `process.report` y era cierto, pero la afirmación iba por delante de la prueba.
- Afirmé algo no verificado sobre el campo `tools` del subagente. Lo reformulé como «no verificado».

**Correcciones del usuario** (al validar)
- Comprobar `inlineCritical` y añadir un e2e que falle ante cualquier violación de CSP.
- La marca ⚙ solo en reglas cuya herramienta esté configurada.
- Quitar `Bash` al revisor si `tools` no permite limitarlo.

**Decisiones:** D-54 a D-68 y ADR-001 a ADR-014.

---

## Fase 4 · Plan de implementación — 2026-11-12 · commit `c04abd5`

**Hecho**
- **Verificación real de `inlineCritical`:** app nueva de Angular 22.2 compilada en producción.
  - Con el valor por defecto, el `index.html` lleva un `<style>` y un **`<script>` en línea** que activa la hoja de
    estilos (no un `onload`, como se esperaba). Con la CSP, la app se vería sin estilos.
  - Con `inlineCritical: false`: 0 `<style>` y 0 `<script>` en línea.
  - Se añade AC-64 (detector de violaciones de CSP en todos los e2e) (D-70).
- **Documentación oficial de los subagentes:** `tools` no documenta patrones con argumentos, y en `disallowedTools`
  un argumento quita la herramienta entera. El revisor queda sin `Bash` y recibe el diff de quien lo invoca (D-72).
- En `CLAUDE.md`, todas las marcas ⚙ pasan a ⏳ hasta que P0 configure cada herramienta (D-71).
- `04-plan-implementacion.md`:
  - 13 partes, con la porción vertical en P1–P6;
  - calendario de jueves a domingo;
  - 7 puntos de control y 9 aplazamientos ordenados;
  - protocolo por parte.
- Este diario.

**Falló**
- Mi primera tabla de capacidad no cuadraba con las franjas del calendario (39 h frente a 40 h programadas y 3,5 h
  de holgura). Lo vi al revisar el calendario y lo corregí antes del commit.

**Decisiones:** D-69 a D-75; supuestos S-05 (plazo) y S-06 (disponibilidad).

**Pendiente del usuario**
- Validar D-75 y S-06.
- Confirmar la fecha con la empresa.
- Crear el repositorio de GitHub para P0.
- Elegir el hosting de la demo el viernes.

---

## P0 · Scaffolding y herramientas — 2026-11-12 · rama `feat/p0-scaffolding`

**Hecho**
- Monorepo con npm workspaces, TypeScript 6.0.3 estricto y dos `tsconfig` por paquete.
- `domain` con `Result` (primer ciclo TDD: rojo → verde) y `contract` con el esquema de `/health`.
- API con `buildApp()` sin escuchar, `GET /health` y configuración validada con Zod; el proceso real sale con código 1
  y nombra la variable si la configuración es inválida (AC-55).
- Angular 22 generado con el CLI oficial (`--style=tailwind --zoneless --ai-config=none`) y adaptado: sin estilos de
  componente, `inlineCritical: false`, proxy `/api`, tests `*.test.ts`.
- ESLint con límites, fronteras y seguridad; Prettier; lefthook y commitlint; dependency-cruiser.
- Scripts `check-filenames`, `check-forbidden-patterns`, `trace-tests`, `verify-changed` y `dev`.
- Hooks y permisos de Claude Code; CI con `quality` (matriz 22/24/26) y `audit`.
- **Cada regla marcada con ⚙ en `CLAUDE.md` tiene un test que demuestra que salta.**
- `npm run verify` en verde en 57 s: 164 tests de Node y 2 de la web, cobertura del dominio al 100 %, build de
  producción y trazabilidad (AC 6/81 · TV 0/129, esperable en P0).
- Hooks: `PreToolUse` ≈ 0,1 s; `PostToolUse` 2,6–3,5 s; `Stop` 7,2 s en un turno típico (un fichero de la API) y
  23 s en el peor caso (toda P0 sin commit: todas las áreas y los tests de `tools` en una segunda etapa). Supera los
  10 s pedidos solo cuando cambian `tools/`, `scripts/` o la configuración raíz.
- `npm ci` real en el monorepo: 86 s, sin compilar nada nativo; una sola copia de `@angular/core`.
- Antes del primer push, el email de autor y *committer* de los 7 commits anteriores pasó al *noreply* de GitHub
  (`git filter-branch --env-filter`, conserva nombres y fechas). Los *hashes* cambiaron: los de este diario y de
  `prompts/` están actualizados.

**Falló**
- `tsc` emitió `dist` aunque había un error de tipos (`exactOptionalPropertyTypes` con el `logger` de Fastify), y mi
  comprobación lo dio por bueno porque `| head` ocultaba el código de salida. Corregido el tipo, añadido
  `noEmitOnError` y comprobaciones con el código de salida real.
- `verbatimModuleSyntax` detectó un `import { Routes }` sin `type` en el código generado por Angular.
- El `postinstall` de lefthook creó un `lefthook.yml` por defecto que sobrescribí sin querer, y dejó instalado un hook
  `prepare-commit-msg` sobrante (eliminado).
- dependency-cruiser rechazó `extensionAlias` (opción inexistente). No hacía falta: resuelve `./x.js` → `x.ts` solo.
- `verify:changed` encontró errores de tipos reales en `trace-tests.mjs`: la herramienta funcionó contra mi propio código.
- Primer `verify:changed` en serie: 25–30 s en el peor caso. En paralelo: 12 s.
- El test de `trace-tests` citaba IDs reales en su ejemplo y los contaba como cubiertos (falso positivo). Cambiados
  por IDs inexistentes. Los AC de nivel `CI` se buscan también en `.github/workflows`.
- La regla `deny` de `.env` no se aplicó en la misma sesión (los permisos no se recargaron). Queda la barrera del hook
  `PreToolUse`, probada; el `deny` se comprobará en una sesión nueva.
- El subagente `revisor` no estaba disponible en la sesión (Claude Code carga `.claude/agents/` al empezar). Se lanzó
  un agente general con sus mismas instrucciones, en solo lectura.
- **Me paré a mitad de P0** con 86 ficheros preparados y sin commit: terminé el turno esperando al revisor, que
  corría en segundo plano. No hubo error ni bloqueo de un hook; fue un fallo de criterio. Desde entonces, mientras
  espero a un agente sigo con trabajo que no dependa de él y no cierro el turno.
- No guardé a tiempo dos prompts del usuario enviados a mitad de turno (lo detectó el revisor). Guardados.
- Mi propio hook `PreToolUse` bloqueó tres comandos míos con *heredoc* que solo **mencionaban** `.env` o
  `drizzle-kit drop` en el texto. Las reglas de git y drizzle ya no leen el cuerpo de los *heredocs*; la de `.env`
  sí, a propósito (D-87).

**Correcciones del usuario**
- Rama y PR por parte en lugar de commits directos a `main` (D-82).
- Hooks rápidos: `PostToolUse` solo lint del fichero y `Stop` sin build (D-80).
- Lista de permisos `allow`/`ask`/`deny` para no confirmar cada acción (D-81), revisada tras el revisor (D-85).
- Email *noreply* para los commits públicos (detectado por Claude antes del primer push).

**Revisor**
- Primera pasada: **NO APTO**, con 1 P0, 5 P1 y una lista de P2/P3.
  - P0: un test borraba la carpeta entera `apps/web/src/app/features` al limpiar sus ficheros temporales.
  - P1: `lint` fallaba en un clon limpio sin `dist`; rutas relativas en los hooks; `PreToolUse` sin `Grep`, sin
    mayúsculas ni comodines; la API podía importar `db/` desde rutas y casos de uso; `npm install <paquete>` en
    `allow` (decisión del usuario, D-85).
  - Todos corregidos, cada uno con su test. También los P2/P3 baratos (D-86, D-87).
- Segunda pasada: **APTO**, sin P0 ni P1 abiertos. Señaló 8 P2 y 6 P3, casi todos en el hook `PreToolUse`: evaluaba las
  reglas sobre el comando compuesto entero y con el texto entre comillas (falsos positivos como
  `git switch -c x && git add .`, y un hueco: `gh pr create --body-file ".env"` pasaba). Corregidos los 8 P2 y
  5 de los 6 P3, con tests (D-86, D-87). El P3 restante (`npx playwright` en `allow`) es decisión del usuario y
  queda como riesgo aceptado hasta P6. Su «no comprobado» (que los hooks se disparen en Windows con
  `$CLAUDE_PROJECT_DIR`) se comprobó en vivo: el hook bloqueó una sonda y varios comandos míos.

**Pendientes, con la parte en la que se resuelven**

| Pendiente | Parte |
|---|---|
| Fastify registra por defecto la IP y la URL completa (con su *query*) de cada petición: serializadores de pino con el patrón de ruta y sin IP (RNF-SEC, `CLAUDE.md` «Logs»). | P3 |
| Comodines de `boundaries` para ficheros sin clasificar y regla «un módulo solo usa otro por su `index.ts`» (⏳ en `CLAUDE.md`). | P4 |
| `strictTemplates` de la web solo se comprueba en el build, no en `npm run typecheck` ni en `verify:changed`: añadir la comprobación de plantillas. | P5 |
| Docker: `npm ci --omit=dev` ejecutaría `prepare` sin TypeScript; usar `--ignore-scripts` en la imagen. | P6 |
| `npx playwright` está en `allow` y, sin Playwright instalado, `npx` lo descargaría sin preguntar: se fija en `devDependencies`. | P6 |
| Aviso `DEP0190` de Node 24+ por `shell: true` con argumentos en `scripts/lib/repo.mjs` (solo Windows). | P10 |
| Comprobar en una sesión nueva que el `deny` de `.env` de `.claude/settings.json` se aplica. | P1 |
| Protección de la rama `main` en GitHub (CI obligatorio para integrar, AC-96): ajuste del repositorio, con permiso del usuario. | Al publicar P0 |

**Decisiones:** D-76 a D-87.

**Tiempo:** estimado 4,5 h · real ≈ 1 h 45 min de trabajo (14:12–15:00, 15:25–15:30 y 19:00–19:45), en 5,5 h de
reloj por dos pausas: mi parada a mitad de turno y el límite de uso de la sesión.
