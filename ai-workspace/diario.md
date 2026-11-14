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
| Vulnerabilidades moderadas de desarrollo (`minimatch`, `esbuild` de `drizzle-kit`), riesgo aceptado (D-89): ver si hay versiones corregidas sin bajar de versión mayor. | P10 |

**Decisiones:** D-76 a D-89.

**Publicación**
- `main` subida como rama principal y PR #1 abierta desde `feat/p0-scaffolding`. CI en verde a la primera:
  `quality` en Node 22, 24 y 26, y `audit`.
- `audit` pasa, pero informa de vulnerabilidades moderadas, todas de desarrollo; en producción, 0. Riesgo aceptado
  con motivo (D-89), porque el «arreglo» de npm baja de versión mayor ESLint y drizzle-kit.
- `main` protegida, a petición del usuario: PR obligatoria y los 4 checks en verde para integrar, sin aprobaciones
  (D-88). La marca de la auditoría pasa a ⚙ en `CLAUDE.md`.

**Tiempo:** estimado 4,5 h · real ≈ 1 h 45 min de trabajo (hora de Canarias, UTC+0: 13:12–14:00, 14:25–14:30 y
18:00–18:45), en 5,5 h de
reloj por dos pausas: mi parada a mitad de turno y el límite de uso de la sesión.

---

## P1 · Dominio: precios, impuestos, redondeo, catálogo, texto y slider — 2026-11-12 · rama `feat/p1-domain-pricing`

**Hecho** (TDD por módulo: vectores → test en rojo → código → verde)
- `money`: redondeo comercial con cociente y resto enteros (D-91), exacto hasta 2⁵³.
- `tax`: impuesto único sobre la base, en puntos básicos (AC-04, AC-05; TV-RD-01 da 3 443).
- `pricing`:
  - `validateTariff` devuelve todos los problemas, cada uno con su ruta, y una `ValidTariff`;
  - `calculatePricing` solo acepta `ValidTariff` (D-95);
  - cubre AC-01, AC-02, AC-03 recorriendo los 9 999 valores de `n` (D-90) y AC-06, más `AMOUNT_OUT_OF_RANGE` más
    allá de 2⁵³.
- `slider`: TV-SL-01…16 y las cuatro propiedades sobre las 280 posiciones y los 10 000 valores (AC-91, parte U).
- `text`: `normalizeCompanyName` con las reglas que fijó el usuario (D-94) y `normalizeForSearch` (ADR-006).
- `catalog`:
  - las listas cerradas `COUNTRIES`, `PLANS` y `TAX_ID_TYPES`;
  - `validateCatalog`: todos los problemas con su ruta (AC-07, parte de dominio);
  - `tariffForPlan` y `taxRateFor` (AC-06).
- API pública en `index.ts`, con un test que fija qué se exporta.
- Vectores como datos tipados en `packages/domain/test/vectors/`.
- `npm run verify` en verde en 59 s:
  - 303 tests de Node y cobertura del dominio al 100 % (139/139 sentencias, 94/94 ramas);
  - trazabilidad: AC 14/81 (+8) · TV 41/129 (+41).

**Falló**
- **La herramienta con la que escribo ficheros descodificó los `\u…` de dos tests** en caracteres invisibles
  literales: U+200B, U+202E, U+FEFF, U+2028, U+2029, espacio duro y marcas combinantes.
  - Los tests pasaban, pero lo que probaban no se veía en el código.
  - Lo detecté al comprobar los bytes de un fichero que Prettier había tocado.
  - Corregido construyendo esos caracteres con `String.fromCodePoint`, y con una barrera nueva en
    `check-forbidden-patterns` (D-96), con tests.
  - Ni el lint, ni los tipos, ni los tests lo habrían detectado.
- **Trazabilidad inflada:** un comentario del fichero de vectores citaba TV-PR-14 y 15, y el script los daba por
  cubiertos (43 en vez de 41). Reescrito sin los IDs.
- **Cobertura del 98,5 %:** se debía a una guarda imposible en `validateTariff`.
  - La quité cambiando la estructura, en vez de escribir un test artificial.
  - En el slider evité igual una aserción `as`, que el lint rechazaba con razón.
- **`vitest --project` no mide la cobertura** (resuelve las rutas desde el paquete). Se mide sin filtro, como en el CI.
- **Horas del diario de P0 en otra zona horaria:** las calculé en horario peninsular, pero el usuario trabaja en
  Canarias (UTC+0), como marcan el equipo y los commits. Corregidas a su hora.

**Correcciones del usuario**
- Concreción de D-34 (D-94): Cc y Cf rechazados; longitud en puntos de código.
- S-05 resuelto: entrega el lunes 16, el martes 17 como margen y P2 el viernes; recalcular el calendario (D-97).
- P2: medir el barrido de AC-14 y, si pasa de unos 2 s, un test rápido representativo y el barrido completo solo en
  el CI.

**Revisor**
- **APTO**, sin P0 ni P1. Recalculó a mano los 41 vectores y confirmó que los recorridos de AC-03 y AC-91 son
  exhaustivos de verdad.
- Tres P2, corregidos con test:
  - el total no se comprobaba contra 2⁵³ (caso con 1 bps);
  - D-96 no veía los controles ni los puntos de código ignorables por defecto;
  - D-69 remitía a un ID equivocado.
- P3 corregidos:
  - oráculo de fuerza bruta para el desempate del slider en los tres segmentos;
  - copia explícita de los campos del tramo;
  - `duplicatesOf`;
  - sustitutos sueltos rechazados en el nombre (nota en D-94);
  - fila de D-96 en 09-calidad §1.
- Registrado: PN-05 (un precio de 0 frente a «la base siempre crece»).

**Pendientes, con la parte en la que se resuelven**

| Pendiente | Parte |
|---|---|
| `trace-tests` da por cubiertos AC-07 (U/I) y AC-91 (U/E) con solo su parte U: exigir citas por nivel antes de pasar a `--strict`. | P10 |
| PN-05: ¿puede un tramo costar 0? Hoy se admite (02-reglas §2.1). | Negocio (no bloquea) |
| S-07: disponibilidad del calendario v2, por validar. | Usuario |

**Decisiones:** D-90 a D-96 (D-90…D-93 aprobadas; D-94 del usuario); D-97 (calendario v2).

**Tiempo:** estimado 2,25 h · real ≈ 1 h (19:12–20:15, hora de Canarias), revisión y cierre incluidos.

---

## P2 · Dominio: identificador fiscal — 2026-11-12 · rama `feat/p2-tax-id`

**Hecho** (TDD: vectores → test en rojo → código → verde)
- `validateTaxId(input, country)`: los 7 pasos de normalización de 03-validacion-fiscal §2.
  - La comprobación ASCII va antes de pasar a mayúsculas (TV-NO-09, `ſ`).
  - Primero se valida el valor tal cual y después sin el prefijo (TV-INT-15).
- Interfaz común `TaxIdValidator` (RNF-26) y **un fichero por país**.
  - España se reparte en tres: clasificación por estructura, DNI/NIE y CIF, con las claves de D-13.
  - EE. UU. tiene, además, los 83 prefijos EIN del IRS como dato tipado (D-103).
- Registro `Record<Country, TaxIdValidator>`: un país sin validador no compila (AC-16, D-100).
- Los 76 vectores (82 entradas) como datos tipados. Los caracteres no ASCII se construyen con `String.fromCodePoint`.
- AC-14 en dos niveles (D-101), tras medirlo:
  - el barrido completo tarda 4,5–4,9 s y va en el proyecto `domain-slow` (CI y `verify`);
  - el test rápido representativo va en la suite normal.
  - `vitest --project domain`, que es lo que ejecuta el hook `Stop`, tarda 0,57 s.
- `npm run verify` en verde (53 s):
  - 497 tests de Node y cobertura del dominio al 100 % (205/205 sentencias, 130/130 ramas);
  - trazabilidad: AC 21/81 (+7) · TV 117/129 (+76).

**Falló**
- **Me desvié del plan aprobado:** agrupé PT, DE, IT, FR y GB en un solo fichero, cuando el plan decía uno por país (lo
  que hace que añadir un país sea un fichero nuevo). Lo vi enseguida y los separé.
- **Una «В» cirílica literal** en el comentario que explica por qué no deben escribirse literales: la tecleé yo. Ahora
  la nombro. D-96 no la habría detectado, porque es visible.
- **Complejidad 13** en la clasificación de España, por los `?? ''` de los grupos de captura, que además eran ramas
  imposibles. Reescrita como tabla de estructuras; los trozos se toman por posición, porque las cuatro estructuras
  tienen 9 caracteres.
- **`\s` de JavaScript elimina U+FEFF:** la spec dice «espacio en blanco Unicode» y U+FEFF es de formato. Cambiado a
  `\p{White_Space}` (D-102). Lo vi al preparar el test rápido: insertar un BOM habría dado un identificador válido.
  El test lo fija ahora.
- **Trazabilidad inflada otra vez por un comentario** (TV 118 en vez de 117). Corregido.

**Correcciones del usuario**
- AC-16 con el tipo del registro, sin la comprobación en `validateCatalog` (D-100).
- La condición de tiempo del barrido de AC-14 (D-101).

**Revisor**
- **APTO**, sin P0 ni P1. Recalculó a mano el CIF de Q2826000H y de los cuatro CIF reales, y los restos de DNI y NIE.
  Comprobó que la lista EIN coincide con la spec (83 + 17) y que nada no ASCII puede colarse tras el paso 2.
- Cuatro P2, corregidos con test:
  - `GET /catalog` necesitará el prefijo y los tipos de cada país: la interfaz declara ahora sus `types` y el dominio
    publica `taxIdRulesFor` y los límites de longitud 1–32 (D-104);
  - la lista de 83 prefijos EIN no tenía test propio;
  - el test de D-101 no comprobaba que el CI ejecute el barrido;
  - la lista de proyectos de `npm test` podía desincronizarse de la configuración raíz.
- P3 corregidos:
  - el sufijo `.slow.test.ts` decide qué es lento;
  - el barrido elimina los pares repetidos (de 4,7 a 3,7 s);
  - el test rápido añade `ß`, ligaduras y muestras con prefijo, para detectar una inversión del orden ASCII →
    mayúsculas. Lo comprobé con una **mutación manual**: con el orden invertido fallan 6 muestras;
  - la documentación queda alineada con D-100.

**Pendientes, con la parte en la que se resuelven**

| Pendiente | Parte |
|---|---|
| `trace-tests` cuenta los IDs que aparecen en comentarios: contar solo los de títulos de test y campos `id`. Ya ha inflado la cifra dos veces. | P10 |
| El último vector de normalización (33 caracteres → `400`) y los dos últimos de usuarios (§6.2) van al esquema del contrato. | P3 |

**Decisiones:** D-100 (usuario), D-101 (condición del usuario), D-102, D-103 y D-104.

**Tiempo:** estimado 2 h · real ≈ 45 min (20:16–21:00, hora de Canarias), revisión incluida. Adelantada al jueves:
el viernes gana 2 h de holgura (calendario actualizado).

## P3 · Contrato y base de la API — 2026-11-12/13 · rama `feat/p3-api-base`

**Hecho** (TDD en contrato y configuración; el resto, tests de integración con `app.inject()`)
- **Dominio:** los límites que faltaban del catálogo, como constantes (D-108).
- **Contrato:**
  - códigos de problema y Problem Details (RFC 9457);
  - esquemas estrictos de todas las peticiones y respuestas, y el inventario de rutas;
  - `fieldErrorsOf` traduce los errores de Zod a los códigos del contrato, con `REQUIRED` e `INVALID_TYPE`
    distinguidos mirando la petición (D-109). TV-NO-12, TV-PR-14 y TV-PR-15.
- **Configuración:** todas las variables de 03-backend §5, validadas al arrancar, y el catálogo con
  `validateCatalog` (AC-07, AC-55).
- **Base de datos:**
  - esquema Drizzle con los `CHECK` y las listas cerradas generados desde las constantes del dominio;
  - triggers de solo inserción en una migración propia, pragmas de ADR-007;
  - `db:check` en el CI y en `verify`.
- **HTTP**, en el orden de 03-backend §3:
  - el ID de petición lo genera el servidor (D-107);
  - una línea de log por petición con el patrón de ruta, sin consulta, IP ni cuerpo;
  - límite con dos contadores (D-114) y la IP real tras los proxies (D-105, D-113);
  - cabeceras con helmet, CORS cerrado y parser JSON propio (D-106);
  - manejador único de errores, con un test por cada código del contrato; `404`, `Cache-Control` y
    `frameworkErrors`.
- **Módulos:** `GET /catalog` (AC-34; el test compara con el ejemplo leído del propio contrato) y `GET /health`
  (AC-48, `503` sin detalles).
- **OpenAPI** versionado con un test que falla si no está al día; Swagger UI solo en desarrollo, como
  devDependency cargada con `import()`, y un test de que con `production` no se importa (D-110).
- `npm run verify` en verde:
  - 680 tests de Node y cobertura del dominio al 100 %;
  - trazabilidad: AC 30/81 (+9) · TV 120/129 (+3).
- Prueba con el proceso real (`tsx` y `node dist/main.js`), en `production` y `development`.

**Falló o lo descubrí por el camino**
- **D-105 no se podía ejecutar tal como se aprobó.** Fastify 5.12.8 trata un `trustProxy` numérico como «no confiar
  en nadie»: con `TRUST_PROXY=2`, todos los usuarios habrían compartido el cubo del límite.
  - Lo vi porque el tipo de la opción ya no admite números, y lo confirmé en el código de Fastify.
  - D-113 lo corrige: confianza por direcciones. Pendiente de tu validación.
- **La configuración por ruta de `@fastify/rate-limit` sustituye al límite global**, no se suma (D-114).
- **Fastify responde por su cuenta a una URL mal codificada**, sin hooks ni manejador y con la ruta dentro del cuerpo.
  Ahora lo atiende `frameworkErrors`.
- **CORS con una lista de orígenes** respondía al *preflight* de un origen no permitido con
  `Access-Control-Allow-Methods`. Ahora el origen se resuelve con una función.
- **`drizzle-kit generate` sale con 0 aunque no pueda terminar** (un renombrado necesita una respuesta interactiva).
  Mi primer `db:check` fallaba abierto; lo descubrí con una prueba negativa manual. Ahora falla cerrado.
- **El paquete de Zod une la ruta con `/` sin escapar y la raíz es `/`**, lo que daba punteros `//extra`. Lo cazó el
  test de integración, no el unitario.
- `disableRequestLogging` está obsoleto en Fastify 5.12: se usa `LogController`.
- **Un test mío no probaba lo que decía:** «sin `Content-Type`» pasaba `undefined` a un parámetro con valor por
  defecto, así que enviaba `application/json`. Corregido con `null`.
- La afinidad de tipos de SQLite convierte el texto numérico: los tests de `CHECK` usan valores no convertibles.
- Zod 4 ejecuta los `refine` aunque `z.url()` haya fallado: hace falta una guarda.
- **Marqué D-102 como validada por error** (solo habías aprobado D-103 y D-104). Revertido.
- Los tests del contrato citaban AC de nivel de integración: retitulados con D, RNF o RF.
- **Python en Windows escribe `CRLF`:** los documentos de `ai-workspace/`, que Prettier no formatea, quedaron con
  `CRLF`. Corregido; las ediciones con Python usan ahora `newline='
'`.

**Correcciones del usuario**
- D-105: el snippet de Cloudflare no es global; el sitio de P11 lo incluye explícitamente, y se comprueba tras
  desplegar con dos redes.
- D-106: el test de `__proto__` comprueba también que `Object.prototype` sigue limpio.
- D-110: `openapi.json` versionado y comprobado, `/docs` solo en desarrollo, enlazado desde el README.
- `@fastify/swagger-ui` en `devDependencies`, con `import()` dinámico y un test.

**Revisor**
- **Primera pasada: NO APTO**, con 2 P1, 7 P2 y 8 P3. Confirmó en el código de Fastify y de los plugins D-113, D-114,
  CORS con función y `frameworkErrors`.
- **P1 corregidos, cada uno con un test que comprobé que falla sin el arreglo** (mutación manual):
  - **el `429` del límite de escrituras salía sin cabeceras de seguridad ni CORS**, porque su hook iba antes que los
    de helmet y CORS: la web no habría podido leer `Retry-After`. Ahora las cabeceras y CORS van primero;
  - **el `v7()` de `uuid` no da los 62 bits aleatorios de RNF-SEC-04** dentro del mismo milisegundo (42). Generador
    propio con el método 1 de RFC 9562 §6.2 y fuera la dependencia (D-115).
- P2 corregidos, con test:
  - los *preflight* no contaban para el límite global;
  - una ruta inexistente parseaba el cuerpo antes del `404` (daba `415`, `413` o `400`): ahora responde en un
    `onRequest`, en el orden de 04-contrato §2.3;
  - un `POST` sin `Content-Type` ni cuerpo daba un error de esquema con *pointer* vacío: ahora `415`;
  - `redact` no cubría los campos del primer nivel;
  - migrar al abrir la base de datos era una decisión sin registrar (D-116).
- P3 corregidos: HSTS también en los `404` anteriores al enrutado; `strictPreflight` desactivado (daba un `400` en
  texto plano); fuera `uniquelocal` y `linklocal` de `TRUST_PROXY`; `isDemoMode`; código muerto y duplicado; un test
  para `Content-Length` incoherente; documentación de CORS y de fronteras.
- **Segunda pasada: APTO CON CAMBIOS**, sin P0 ni P1. Cinco P3 de documentación y comentarios, corregidos; uno de
  ellos corrige el motivo que yo había escrito para no contar los `404` anteriores al enrutado.
- No corregidos, con motivo: P2-4 y P2-7 dependen de las rutas de P4 (tabla de pendientes); contar para el límite los
  `404` anteriores al enrutado (Fastify los crea con su `Request` base, cuya IP es la del socket: detrás de nginx irían todos al cubo del proxy, que comparten todos los usuarios); agrupar IPv6
  por /56 (valorado en D-114); citar AC-21 y AC-22 en los tests del mecanismo, que se citarán con `POST /customers`.

**Pendientes, con la parte en la que se resuelven**

| Pendiente | Parte |
|---|---|
| `reference` son «los 8 primeros caracteres de `instance`» (05-frontend §6, 06-frontend): serían `urn:uuid`, y los primeros de un UUID v7 son el reloj. Propuesta: los 8 últimos del UUID. | P5 |
| Cierre ordenado con SIGTERM: en Windows no se puede comprobar; se prueba en el contenedor. | P6 |
| Subred fija de la red de Compose y el valor de `TRUST_PROXY` (D-113). | P6 |
| AC-54 completo (alta, búsqueda con `q` y simulación) y los errores `4xx` documentados en `openapi.json`. | P4 |
| Errores de la ruta, la consulta y el cuerpo juntos (04-contrato §2.3, punto 4): Fastify se para en la primera parte que falla. Validar las tres en un `preValidation` propio o registrar la limitación (revisor, P2-4). | P4 |
| AC-58 con igualdad exacta, cuando estén todas las rutas. | P7 |

**Decisiones:** D-105 a D-108 y D-110 (usuario), D-109 (usuario, tras la prueba), D-111 a D-116 (validadas el
2026-11-13; D-113 con la condición de una lista estrecha: `loopback` y la subred de Docker de la demo).

**Tiempo:** estimado 3,5 h · real ≈ 4,5 h hasta la primera revisión (21:20–01:50, hora de Canarias) y ≈ 1 h más
para las correcciones de las dos revisiones (terminadas el viernes a las 09:15), con dos pausas por el límite de uso.
La holgura del viernes absorbe la hora de más.

## P4 · API de la porción vertical — 2026-11-13 · rama `feat/p4-api-vertical`

**Hecho** (tests de integración con `app.inject()` por AC, escritos antes que el código de cada módulo)
- **`customers`:** `POST /customers` (`201` + `Location`) y `GET /customers/:id`. La unicidad la decide el índice
  único: se traduce su violación a `409` con el id existente (D-120). AC-20, 21, 22, 25, 26, 27.
- **`simulations`:** `POST /simulations`, `GET /simulations/:id` y `GET /customers/:id/simulations`. La simulación y
  sus tramos se guardan en una transacción; el historial lee los tramos con una sola consulta. El precio sale de
  `calculatePricing` con la tarifa del plan y el impuesto del país del cliente. AC-40 a 46; TV-PR-01…15 de punta a punta.
  `simulations` no importa a `customers`: declara el puerto `CustomerLookup` y `app.ts` le conecta el repositorio (D-119).
- **Regla de módulos (⏳ → ⚙):** un módulo solo usa otro por su `index.ts`, y la raíz de composición también, con tests
  positivos y negativos. `catalog` y `health` ganan su `index.ts`.
- **OpenAPI:** las siete rutas documentan sus estados de error como `application/problem+json` y un test comprueba los
  estados de cada operación (D-121).
- **AC-54** para el alta, un error de negocio, un duplicado, la simulación y las lecturas (D-118).
- **Tests de contrato:** cada éxito se parsea con el esquema de respuesta y cada error con `problemSchema`
  (`expectBody`, `expectProblem`); los ejemplos de AC-20 y AC-40 se leen del propio `04-contrato-api.md`.
- `npm run verify` en verde: 244 tests de la API, trazabilidad AC 44/81 (+14) · TV 120/129.
- Prueba con el proceso real (`node dist/main.js`, SQLite en fichero): alta, simulación, duplicado `409`, historial
  tras reiniciar y logs sin datos personales.

**Falló o lo descubrí por el camino**
- **Los módulos no pueden importar `http/`** (boundaries): `problemResponses` vive en `shared/`.
- **`@fastify/swagger` documenta todo como `application/json`:** hizo falta un `transformObject`; mi primera versión
  movía también el `503` de `/health`, que no es un Problem. Ahora decide por el esquema.
- **El mapper no puede importar el esquema de Drizzle** (capas): define la forma de la fila por su cuenta.
- **Quitar `desc(id)` del `ORDER BY` no rompe el test de desempate**: el índice `simulations_customer_created_idx` ya
  devuelve ese orden. Sin mutación posible; lo dejo anotado.
- Mi primer `taskkill` para parar la API de la prueba era demasiado amplio y se denegó; paré solo el proceso por su PID.

**Correcciones**
- **Del usuario:** D-117 y D-118 (opciones recomendadas del plan).
- **Del revisor** (`sonnet`, una pasada): **APTO CON CAMBIOS, sin P0 ni P1.**
  - P2 corregidos, con test: la regla de módulos no detectaba `../../modules/<otro>/<fichero>` (falso negativo; el test
    falló antes del arreglo); el segundo test de logs dependía del primero (ahora un escenario en `beforeAll`);
    D-117 a D-119 sin registrar.
  - P3 corregidos: una simulación sin tramos al leerla es un error y no un precio vacío (test); el comando de simulación
    usa `z.output` como el de clientes; tests de `415`/`413`/`400` en las rutas reales (AC-23, AC-24) y de la consulta
    en las rutas `GET`; título de AC-46; comentario del bloque `shared`/`config`.
  - Sin corregir, con motivo: el desempate por `id` en el repositorio (el índice lo hace inevitable); la dependencia del
    `createdAt` del ejemplo del contrato con `FIXED_NOW` (documentada en `contract-examples.ts`).

**Pendientes, con la parte en la que se resuelven**

| Pendiente | Parte |
|---|---|
| AC-54 con `q=Acme` (búsqueda) | P7 |
| AC-58 con igualdad exacta de rutas (hoy el test compara las registradas) | P7 |
| `reference` de errores: los 8 últimos caracteres del UUID, no los 8 primeros de `instance` | P5 |
| Cierre ordenado con SIGTERM; subred fija de Compose y `TRUST_PROXY` (D-113); `--ignore-scripts` y Playwright en `devDependencies` | P6 |

**Decisiones:** D-117 y D-118 (usuario). D-119 a D-121 y las nueve de P0 y P2 que seguían pendientes (D-76 a D-79,
D-83, D-84, D-86, D-87 y D-102) las validó el usuario el 2026-11-13, tras el cierre; PR #7 mergeada (`c5ae62d`).

**Tiempo:** estimado 2,5 h (mi estimación con los pendientes de P3: 3,5 h) · real ≈ 1,5 h (09:27–10:55, hora de
Canarias, con las correcciones de la revisión). La holgura del viernes queda casi entera.

## Nota de traspaso — 2026-11-13, tras P4

**Para empezar una sesión nueva:** leer `CLAUDE.md`, esta nota, la sección de la parte siguiente de
[`04-plan-implementacion.md`](04-plan-implementacion.md) y su §4. El usuario activa el modo plan y Claude presenta el plan.

**Estado**
- Hechas y mergeadas en `main`: P0 a P4 (PR #7, merge `c5ae62d`). Sin decisiones pendientes de validar.
- La API tiene el flujo completo de la porción vertical: alta y detalle de clientes, y creación, lectura e historial de
  simulaciones, con `openapi.json` al día. No existe aún `GET /customers` (P7) ni `GET /stats` (P10).
- Para escribir módulos nuevos: `buildApiTestApp` (límites altos), `expectBody`/`expectProblem` y `api-helpers`
  en `apps/api/test/`; un módulo solo se usa por su `index.ts`.

**Siguiente parte: P5 · Web de la porción vertical** (4,5 h): el contrato y la API ya están; ver el plan.

**Pendiente para P5 y P6:** las tablas de pendientes de las entradas P3 y P4. En especial: la referencia de error (8
últimos del UUID) y `strictTemplates` en `typecheck` (P5); SIGTERM, subred fija de Compose, `--ignore-scripts` y
Playwright en `devDependencies` (P6).

**Decisiones por validar:** ninguna.

## P5 · Web de la porción vertical — 2026-11-13 · rama `feat/p5-web-vertical`

**Hecho**
- **Dirección visual (antes de la primera pantalla):** análisis de roams.es leyendo su CSS servido (tiene su propio
  sistema de tokens de dos capas). Tokens propios en `@theme` con la paleta por defecto de Tailwind vaciada,
  Montserrat autoalojada, componentes base en `@layer components`, test de contraste AA de los tokens y guardia de
  colores arbitrarios. Documento: [`03-arquitectura/10-diseno-visual.md`](03-arquitectura/10-diseno-visual.md).
- **Punto de control visual** con una maqueta temporal (sin versionar, ya borrada) a 360 y 1280 px. El usuario la
  validó con dos ajustes: valores de la tarjeta del cliente a 16 px en `ink` (`.data-list`) y cabecera con
  «Clientes» a la izquierda y «Nuevo cliente» a la derecha, con hueco para P8 y recogida en móvil.
- **`core`:** interceptores (`/api` y errores → `ApiError`), parser de Problem Details sin Zod, diccionario de mensajes
  exhaustivo por tipos, `CatalogStore` (valida el catálogo con el dominio), cabecera, pie con la atribución (AC-83),
  avisos de éxito y vista de no encontrado.
- **Alta (V2)** con Signal Forms: validación del esquema en el navegador, errores del servidor bajo su campo, foco al
  primer error, `409` con «Ver cliente», `429` y fallo con referencia (AC-72, AC-73, AC-74).
- **Detalle (V3) y simulador (V4):** proyección `computed` con `calculatePricing` del dominio, slider nativo con
  `aria-valuetext` y Re Pág/Av Pág de 10 posiciones, campos que nunca se corrigen solos, guardado único con doble clic,
  historial con «Cargar más» y estados de carga, vacío y error (AC-75 a AC-78, AC-89, AC-91 E).
- **Pendientes heredados:** `strictTemplates` en `typecheck` (D-128) y referencia de error (D-127).
- `npm run verify` en verde: 855 tests de Node y 98 de la web; build inicial 300,6 kB (80 kB transferidos);
  trazabilidad **AC 53/81 (+9) · TV 121/129 (+1)**.
- Flujo real en el navegador contra la API: `12345678A` → error bajo el campo con foco; alta → detalle y «Cliente
  creado»; 15 usuarios → 169,40 €; 51 usuarios y doble clic → una sola simulación de 425,00 + 89,25 = 514,25 €, también
  tras recargar; `/customers/abc` → «Cliente no encontrado»; 360 px sin scroll horizontal; una única petición de fuente
  (`latin`, mismo origen); 0 `<style>`/`<script>` en línea en el `index.html` de producción.

**Falló o lo descubrí por el camino**
- **`npm run dev` con `PORT` heredado:** la previsualización exporta `PORT=4200` y la API lo leía, así que ocupaba el
  puerto de la web y el proxy apuntaba a la nada. Arreglo y test (D-129).
- `withFetch()` está obsoleto en Angular 22 (fetch ya es el backend por defecto): no se usa.
- El color `body` chocaba con el tamaño `text-body` en Tailwind: los colores de texto son `ink*`.
- `shared` no puede importar `contract` (frontera): el fixture del catálogo vive en `core/testing/`, fuera del build.
- En los tests, `whenStable()` espera a las peticiones aún sin responder (catálogo, historial) y las acciones de
  `submit()` terminan en promesas que el *fixture* no sigue: los tests renderizan de forma síncrona y esperan una vuelta
  de la cola.
- Dos totales de un test escritos a mano estaban mal (121,00 y 130,68 €): ahora se calculan con el dominio.
- A 360 px los importes se partían entre la cifra y el `€`: `.amount` no salta de línea.

**Correcciones**
- **Del usuario:** los dos ajustes del punto de control.
- **Del revisor** (`sonnet`, una pasada): **NO APTO solo por documentación** (P1: dependencia y documento de diseño sin
  registrar, que se cierran en este mismo cierre). Sin P0 ni P1 en el código.
  - P2 corregidos: duplicado en el historial al reintentar tras guardar (deduplicación por `id` y `reloadHistory` que
    empieza de cero; el test falló antes del arreglo); `created` se emite fuera del `try`; tests sin AC/TV/D en el
    título.
  - P3 corregidos: sin `as ApiError`; sin anuncio `aria-live` al montar el panel (test); una sola región `status` al
    cargar el detalle; `TODO(P7)` en la redirección de `/`; límites de la guardia de colores documentados en D-125.
  - P2 sin test de regresión, con motivo: el `emit` fuera del `try` no se puede provocar desde un test porque Angular
    ya captura los errores de los *listeners* de un `output()` y los envía al `ErrorHandler`; el cambio es defensivo.
  - Para P6, sin cambios ahora: la CSP de nginx debe permitir las fuentes (`font-src` cae en `default-src 'self'`) y
    el foco al cambiar de vista no lo pide la spec.

**Pendientes, con la parte en la que se resuelven**

| Pendiente | Parte |
|---|---|
| e2e de AC-72 a AC-78, AC-83, AC-89, AC-90 y AC-91 contra Compose, y CSP real (fuentes incluidas) | P6 |
| Ruta `/` → dashboard (`TODO(P7)`, D-126) | P7 |
| Selector de divisa e indicador de tipos en `header-tools`; conversión en `money` | P8 |

**Decisiones:** D-122 (validada en el punto de control) y D-123 a D-129, validadas por el usuario el 2026-11-13 tras el cierre.

**Tiempo:** estimado 5,5 h (4,5 h + 1 h de dirección visual) · real ≈ 1 h de implementación (11:00–12:00, hora de
Canarias) más el plan y el punto de control. La holgura del viernes sigue casi entera.

## Nota de traspaso — 2026-11-13, tras P5

**Para empezar una sesión nueva:** leer `CLAUDE.md`, esta nota, la sección de la parte siguiente de
[`04-plan-implementacion.md`](04-plan-implementacion.md) y su §4. El usuario activa el modo plan y Claude presenta el plan.

**Estado**
- Hechas: P0 a P5. P5 está en la rama `feat/p5-web-vertical`, pendiente de PR.
- La web hace la porción vertical completa contra la API real. Dirección visual en
  [`03-arquitectura/10-diseno-visual.md`](03-arquitectura/10-diseno-visual.md): usar solo los tokens y las clases de
  `apps/web/src/styles/`; los colores arbitrarios y la paleta por defecto no existen.
- Para escribir vistas: `CatalogStore.ready()`, `ApiError` y `problemMessage`/`fieldMessage`, `ToastStore`,
  `app-loading-block`/`app-error-state`/`app-field-error`, y el fixture `core/testing/catalog.fixture.ts`. En los tests,
  responder a todas las peticiones antes de `whenStable()`.
- `npm run dev` arranca con `.claude/launch.json` («dev») en el panel del navegador.

**Siguiente parte: P6 · Docker Compose, nginx y e2e de la porción vertical** (3 h).

**Decisiones por validar:** ninguna.


## P6 · Docker Compose, nginx y e2e de la porción vertical — 2026-11-13 · rama `feat/p6-compose-e2e`

**Hecho**
- **Imágenes** (08-despliegue §2):
  - API en tres etapas sobre `node:26.13.1-alpine3.24`, con `npm ci --ignore-scripts` y solo las dependencias de
    producción (74 MB, sin Angular ni herramientas de desarrollo);
  - web: `ng build` → `nginxinc/nginx-unprivileged:1.30.6-alpine3.24`, las dos imágenes fijadas por *digest*;
  - sin root, solo lectura salvo `/data`, sin *capabilities*, con `no-new-privileges` e `init`.
- **nginx:**
  - CSP de RNF-SEC-06 con `style-src` y `font-src 'self'` explícitos;
  - `/api` con `^~`, añade su salto a `X-Forwarded-For` y borra `X-Forwarded-Host`, `X-Forwarded-Proto` y `Forwarded`;
  - límite de cuerpo de 64 KiB (D-132) y sin log de acceso (D-134);
  - caché larga solo para los ficheros con *hash*.
- **Red e IP real (D-130):**
  - IPs fijas; `TRUST_PROXY=loopback,172.30.0.10` en local (en la demo, también la pasarela);
  - puerto solo en `127.0.0.1`, y la API sin puertos publicados;
  - `scripts/check-containers.mjs` lo comprueba sobre la pila en marcha, junto con AC-60.
- **SIGTERM en el contenedor** (pendiente de P4): `docker compose stop api` → la API se cierra en 0,8 s con código 0.
- **e2e:**
  - workspace `@saas-o-matic/e2e` con Playwright 1.65.0 y proyectos `stack` y `dev` (D-68);
  - guardas automáticas de CSP y de red en todos los tests, con autotest;
  - 23 tests: AC-52, AC-60 (CI), AC-64, AC-72 a AC-78, AC-83, AC-89, AC-90, AC-91 y AC-97, más D-130 (suplantación de IP);
  - AC-73, AC-74 y AC-83 se adelantaron a P6 porque la interfaz ya existía.
- **Pila de e2e** (`npm run e2e:stack`, D-133): proyecto aparte, base de datos vacía en cada arranque y límites altos.
- **CI:**
  - trabajo `e2e`: pila, `check-containers`, Chromium, Playwright, informe como artefacto y `down -v`;
  - `e2e` añadido a los *checks* obligatorios de `main` tras su primer verde, con la autorización del usuario (ahora
    son 5, D-88).
- **Resultados:**
  - `npm run verify` en verde: 880 tests de Node y 98 de la web;
  - e2e: 23/23 contra la pila y 14/14 contra `npm run dev`;
  - el CI de la PR #10, en verde a la primera;
  - AC-90: 23–30 ms en local;
  - trazabilidad **AC 58/81 (+5) · TV 121/129**.

**Falló o lo descubrí por el camino**
- **El *hook* `PreToolUse` bloquea cualquier comando que mencione `.env`**, también el *heredoc* que escribía
  `.dockerignore`: ese fichero se escribe con la herramienta Write. Es el comportamiento correcto de la regla.
- El *healthcheck* de Compose en una lista YAML sin comillas se rompía por el `: ` del ternario.
- **En la pila, la propia CSP bloquea un `fetch` a otro origen antes que la guarda de red:** el autotest de la guarda
  usa una navegación de nivel superior, que la CSP no cubre. La respuesta simulada de la API de tipos necesita
  `access-control-allow-origin` para que el navegador la acepte.
- Los textos de la interfaz llevan espacios alrededor (plantillas): el patrón de importes los admite.
- `npm install -w` de un workspace recién añadido no lo encuentra en la misma orden: hay que repetirla.
- Una variable de entorno en un script de npm no funciona en Windows: los destinos `stack` y `dev` son proyectos de
  Playwright.
- **Comprobado que el e2e de D-130 no pasa en falso:** con `TRUST_PROXY=loopback,172.30.0.0/24` falla (cubo nuevo con
  4999), y con la configuración real pasa.

**Correcciones**
- **Del usuario (plan):** `TRUST_PROXY` de la demo con direcciones exactas en lugar de la subred; e2e de suplantación;
  imagen oficial con AC-52 precisado (D-131); autorización para añadir `e2e` a los *checks* obligatorios.
- **Del revisor** (`sonnet`, una pasada): **APTO CON CAMBIOS**, sin P0 ni P1.
  - P2: el residuo de `error_log` (D-134) queda documentado en `06-seguridad` T-12. Hay que matizarlo: la dirección
    que registra el nginx del contenedor es la de la pasarela, no la del cliente.
  - P3 corregidos, cada uno con su test:
    - `location ^~ /api/`: el test de regresión falló antes del arreglo (nginx devolvía su 404 HTML);
    - `check-containers` también rechaza `privileged`, `cap_add` y los modos `host` de red y de PID (los 4 casos
      fallaron antes);
    - el e2e de D-130 prueba hasta tres pares de IPs falsas, por si se reinicia la ventana del límite;
    - los globales de `window` se tipan una vez (`e2e/fixtures/page-globals.ts`), sin *casts*.
- **Propias:**
  - un comentario citaba RNF-SEC-17 en lugar de RNF-SEC-11;
  - quité AC-54 del nombre de un paso del CI, porque `trace-tests` lo habría contado como cubierto;
  - D-88, CLAUDE.md y 09-calidad hablaban de 4 *checks*.

**Pendientes, con la parte en la que se resuelven**

| Pendiente | Parte |
|---|---|
| *Seed* (`db:seed`, `npm run setup`, perfiles `demo` y `e2e`) y dashboard en el recorrido de AC-64 (D-135) | P7 |
| `502`/`504` de nginx con respuesta propia cuando la API está caída (AC-85, residuo de T-12) | P9 |
| *Override* de la demo: imágenes de GHCR, puerto 4010 con `!override`, `TRUST_PROXY` de D-130, `DEMO_MODE`, límites de memoria | P11 |
| Valor de AC-90 en el CI: está en el artefacto `playwright-report` del trabajo `e2e` | P10 (revisión del CI) |

**Decisiones:** D-130 a D-135, validadas por el usuario en el plan (D-132 a D-134 y D-135 en el mensaje 4).

**Tiempo:** estimado 3 h · real ≈ 45 min de implementación (12:05–12:50, hora de Canarias), más el plan. P6 estaba prevista
para el sábado: el calendario va adelantado.

## Nota de traspaso — 2026-11-13, tras P6

**Para empezar una sesión nueva:** leer `CLAUDE.md`, esta nota, la sección de la parte siguiente de
[`04-plan-implementacion.md`](04-plan-implementacion.md) y su §4. El usuario activa el modo plan y Claude presenta el plan.

**Estado**
- Hechas: P0 a P6. P6 está en la rama `feat/p6-compose-e2e`, PR #10 con el CI en verde, pendiente de *merge*.
  **Porción vertical completa (C2).**
- `main` exige 5 *checks*: `quality` ×3, `audit` y `e2e`.
- Para escribir e2e:
  - importar `test` y `expect` de `e2e/fixtures/test.ts`, que trae las guardas de CSP y de red;
  - crear los datos con `createCustomer` y `openSimulator`, y comparar importes con `euros()`;
  - etiquetar `@prod-only` lo que solo sirve la pila;
  - flujo: `npm run e2e:stack` → `npm run e2e` → `npm run e2e:stack:down`. No se puede levantar a la vez que
    `docker compose up`.
- Docker: `docker compose up --build -d` → <http://localhost:8080>. Las imágenes base se actualizan cambiando a la vez
  la etiqueta y el *digest* (02-monorepo §4.3).

**Siguiente parte: P7 · Búsqueda y dashboard** (3 h), que ahora incluye también el *seed* (D-135).

**Decisiones por validar:** ninguna.

## P7 · Búsqueda, dashboard y seed — 2026-11-13 · rama `feat/p7-search-dashboard`

**Hecho**
- **API, `GET /customers`** (AC-28 a AC-33):
  - `taxIdSearchTerm` en `domain` (TDD), que comparte la limpieza de separadores con `validateTaxId`
    (`strip-separators.ts`, sin duplicarla);
  - `containsPattern` en `db/like-pattern.ts` escapa `!`, `%` y `_`; patrón y `ESCAPE` van como parámetros;
  - caso de uso con D-136 y repositorio que no lee `contact_email`, ordenado por `company_name_search, id`;
  - `openapi.json` regenerado;
  - **AC-54 cerrado**: el escenario de logs incluye `GET /customers?q=Acme`, y la ruta aparece como patrón.
- **Seed** (D-140, D-138, D-139):
  - `npm run setup`, `npm run db:seed` y `npm run db:reset`; perfil único `demo`, con 25 clientes de los 7 países y
    los 5 tipos, y 26 simulaciones;
  - pasa por los esquemas del contrato y los casos de uso reales, es determinista, idempotente y va en una
    transacción (`Database.transaction`);
  - `db:reset` se niega en producción y con `:memory:`; con la API abierta, en Windows, sale una línea clara;
  - `apps/api/src/seed/**` tiene las reglas de la raíz de composición, con test en `tools/`.
- **`e2e:dev` con base propia** (D-137): `playwright.dev.config.ts` arranca la API en :3100 con SQLite en memoria y
  `ng serve` en :4300. Comprobado con `npm run dev` arrancado: 23/23, la base de desarrollo igual antes y después
  (9 clientes y 3 simulaciones) y sin procesos huérfanos.
- **Web, dashboard (V1)** (AC-70, AC-71):
  - `/` es el dashboard: fuera el `TODO(P7)`, D-126 cumplida, y «Clientes» lleva al listado;
  - `CustomerSearchStore` con *debounce* de 300 ms o Intro, página en un `linkedSignal`, `rxResource` (D-141) y la
    última respuesta atenuada mientras carga la siguiente;
  - buscador, tarjetas-enlace, paginación «1–20 de 25» y los cinco estados de spec 05 §3.1.
- **e2e:** `dashboard.spec.ts` con 9 tests:
  - AC-70: vacío, 25 clientes, `500` y esqueleto, interceptando el listado con respuestas tipadas por el contrato;
  - AC-71: una sola búsqueda y una respuesta lenta que no sustituye a la nueva;
  - contra la API real: búsqueda por identificador con guion → detalle, «Limpiar búsqueda» y «Clientes» desde el
    detalle;
  - AC-64 recorre también el dashboard.
- **Resultados:**
  - `npm run verify` en verde: 948 tests de Node (+68) y 118 de la web (+20);
  - e2e: 32/32 contra la pila y 23/23 en `e2e:dev`;
  - trazabilidad **AC 66/81 (+8) · TV 121/129**;
  - búsqueda de una página con los datos de ejemplo: unos 3 ms de extremo a extremo (criterio de P7: menos de 20 ms);
  - comprobado en el navegador con el seed `demo`, a 800 y 360 px, con teclado y sin errores en la consola.

**Falló o lo descubrí por el camino**
- **Un recurso de Angular olvida su valor al cambiar los parámetros**: lo confirmé en el código de Angular 22.2. Un
  `linkedSignal` encima solo recuerda lo que alguien ha leído. Un test del store lo demostró (`isRefreshing` en
  `false`), así que pasé a `rxResource` y la respuesta se guarda al llegar (D-141).
- La `.data-list` (etiqueta y valor en columnas desde 640 px) partía identificadores y planes en tarjetas de un tercio
  de ancho («STARTE R»). Las tarjetas usan ahora una línea que se ajusta, con las etiquetas solo para lectores de
  pantalla; solo «Alta» es visible.
- Chromium pinta su propia «×» en los `type="search"`, que duplicaba «Borrar» y no se alcanza con el teclado. Se
  oculta en `base.css`.
- `expectOne` de `HttpTestingController` saca la petición de la cola: en dos tests la buscaba dos veces.
- En un *heredoc* de Python, el texto con barras invertidas perdió un nivel de escape: rompió un regex de ESLint y un
  test. Lo arreglé con el editor y lo dejé en la memoria del proyecto.
- En la pila de e2e, el cliente recién creado puede no caer en la primera página, porque otros tests crean clientes
  a la vez. El recorrido de AC-64 comprueba que hay alguna tarjeta, no una en concreto.
- Por la especificación (04-contrato §3.3), buscar con el prefijo del país (`ES B1234`) no encuentra el CIF guardado
  sin prefijo. No es un fallo, pero sí una limitación que conviene conocer.

**Correcciones**
- **Del usuario (plan):** sin perfil `e2e` (D-139), D-136, y que Claude reinicie la base de desarrollo al cerrar.
- **Del revisor** (`sonnet`, una pasada): **APTO CON CAMBIOS**, sin P0 ni P1. Corregidos, cada uno con un test que
  falló antes del arreglo:
  - P2: «Borrar» y «Limpiar búsqueda» desaparecían con el foco puesto: ahora el foco vuelve al buscador;
  - P2: «Anterior» y «Siguiente» se desactivaban con `disabled` y perdían el foco. Ahora usan `aria-disabled`, con su
    estilo en `.btn-secondary`;
  - P3: `next()` y `previous()` se ignoran mientras carga una página (dos clics rápidos ya no saltan una);
  - P3: `db:reset` con la API abierta da una sola línea, sin traza, y se prueba en un proceso real;
  - P3: `seed.test.ts` pasa de 5 a 3 arranques de `tsx` (2 fuera de Windows);
  - P3: el e2e de CL-42 ya no hace `expect` dentro de un `catch`, sino que espera al `requestfailed` de la petición.
- **Propias:** el test de AC-31 con `%` en el título rompía el formato de Vitest.

**Pendientes, con la parte en la que se resuelven**

| Pendiente | Parte |
|---|---|
| `q` y página en la URL, métricas del dashboard (RF-19, AC-92) | P10 |
| `502`/`504` de nginx con respuesta propia cuando la API está caída (AC-85, residuo de T-12) | P9 |
| *Override* de la demo, con `DEMO_MODE` que use `seedDatabase` y `removeDatabaseFiles` al arrancar | P11 |
| Valor de AC-90 en el CI: está en el artefacto `playwright-report` del trabajo `e2e` | P10 (revisión del CI) |

**Decisiones:**
- D-136 y D-139: validadas en el plan;
- D-137, D-138, D-140 y D-141: Claude · pendiente;
- D-126: cumplida.

**Tiempo:** estimado 3 h (unas 4 h con el seed, `e2e:dev` y `db:reset`) · real ≈ 45 min de implementación
(16:04–16:49, hora de Canarias), más el plan y el cierre.

## Nota de traspaso — 2026-11-13, tras P7

**Para empezar una sesión nueva:** leer `CLAUDE.md`, esta nota, la sección de la parte siguiente de
[`04-plan-implementacion.md`](04-plan-implementacion.md) y su §4. El usuario activa el modo plan y Claude presenta el plan.

**Estado**
- Hechas: P0 a P7. P7 está en la rama `feat/p7-search-dashboard`, con su PR.
- `main` exige 5 *checks*: `quality` ×3, `audit` y `e2e`.
- Datos locales:
  - `npm run setup` crea la base de desarrollo con el seed `demo` (25 clientes);
  - `npm run db:reset`, con `npm run dev` parado, vuelve a ese estado.
- e2e:
  - `npm run e2e:dev` ya no necesita `npm run dev`: arranca sus propios servidores (:3100 y :4300) con SQLite en
    memoria;
  - con Docker: `npm run e2e:stack` → `npm run e2e` → `npm run e2e:stack:down`;
  - para escribir e2e, importar `test` y `expect` de `e2e/fixtures/test.ts`;
  - los estados globales del listado se simulan con `e2e/fixtures/customer-pages.ts`.

**Siguiente parte: P8 · Divisas** (3,5 h).

**Decisiones por validar:** D-137, D-138, D-140 y D-141.

## P8 · Divisas — 2026-11-13 · rama `feat/p8-currency`

**Hecho**
- **Dominio, `currency/`** (TDD, cobertura del 100 %):
  - `CURRENCIES`, `FOREIGN_CURRENCIES` y los decimales ISO 4217;
  - `toExchangeRate`, que lee el tipo como decimal exacto (D-144);
  - `convertAmount` y `convertPricing` con la regla de partidas hoja (D-20), calculadas con `BigInt` y
    `roundHalfUpDivideBig`;
  - TV-FX-01…06 y un caso que con `Math.round` saldría mal (100 × 1,005).
- **Web, `core/currency`:**
  - parser propio de spec 05 §4.3, sin Zod;
  - cliente `fetch` (D-148);
  - caché revalidada al leerla, con el bloqueo del `429` persistente (D-146);
  - máquina de estados pura `nextRatesState` con reloj inyectado;
  - `ExchangeRatesStore` (arranca con `provideAppInitializer` sin esperar a la respuesta, una petición a la vez y
    refresco al volver a la pestaña, D-147);
  - `CurrencyStore`, con la divisa elegida y la efectiva (D-143).
- **Interfaz:**
  - `app-currency-bar` en la cabecera (D-151): indicador con `role="status"`, icono además del color y «Reintentar»
    fuera de la región viva, que deja el foco en el selector; el selector nativo deshabilita las divisas sin tipo;
  - pipe `money` con la divisa y `≈`, y la fecha de los tipos en UTC (D-145);
  - simulador: desglose convertido, precio unitario en EUR y nota «Importes orientativos…»;
  - historial: tarjetas convertidas (en EUR, los importes guardados tal cual) y la nota «Convertido al tipo de
    cambio actual…».
- **e2e (16 nuevos):**
  - `exchange-rates.spec.ts`: AC-80 con los cinco fallos y la recuperación, sin GBP, AC-81, la cabecera fija y
    AC-83;
  - `exchange-rates-cache.spec.ts`: AC-82 y «Actualizando…» con `page.clock` (D-149);
  - `currency-conversion.spec.ts`: AC-79 en las seis divisas, AC-87 y AC-88 (D-142).

  La API de tipos se simula con `e2e/fixtures/exchange-rates-api.ts`: comportamientos intercambiables, respuestas
  retenidas y un contador.
- **Resultados:**
  - `npm run verify` en verde: 990 tests de Node (+42) y 230 de la web (+112);
  - e2e: 39/39 en `e2e:dev` y 48/48 contra la pila Docker, sin violaciones de CSP ni peticiones a la API real;
  - trazabilidad **AC 72/81 (+6; AC-83 ya tenía tests) · TV 126/129 (+5)**;
  - comprobado en el navegador con los tipos reales, a 800 y 360 px, sin desplazamiento horizontal.

**Falló o lo descubrí por el camino**
- **La cabecera no era *sticky* desde P5** (D-150): el `<header>` era *sticky* dentro de su anfitrión, que medía lo
  mismo, así que el indicador se iba al desplazarse. Lo vi en el navegador. El *sticky* pasa al anfitrión, con un
  e2e que falla sin el arreglo («viewport ratio 0»).
- **La spec se contradecía** entre §4.4 y AC-88. El usuario lo resolvió en el plan (D-142).
- El elemento `app-currency-bar` es *inline*, así que `w-full` no hacía nada: lleva `block`.
- **En EUR, el historial recalculaba la base** sumando los tramos en vez de mostrar el importe guardado. Lo detectó
  un test de AC-78 con datos de prueba incoherentes. En EUR se muestra la instantánea del servidor (D-19).
- **`-g` tras `npm run e2e:dev --` lo interpreta npm**, no Playwright: para filtrar hay que llamar a `playwright`
  directamente desde `e2e/`.
- **Un *heredoc* volvió a comerse un nivel de escape** en una expresión regular (ya estaba en la memoria del
  proyecto). Lo corregí con el editor.
- **El dashboard no tiene importes hasta las métricas de P10.** P8 deja `convertAmount` y el pipe listos.

**Correcciones**
- **Del usuario (plan):** AC-88 en «Refrescando» (D-142) y la vuelta a la divisa elegida (D-143).
- **Del revisor** (`sonnet`, una pasada): **APTO CON CAMBIOS**, sin P0 ni P1. Corregidos, cada uno con un test que
  falló antes del arreglo:
  - P2: un tipo válido pero absurdo (`1e300`) dejaba el simulador sin proyección. Ahora `CurrencyStore.convert` cae
    a EUR en un solo sitio;
  - P2: en una pestaña abierta varios días, los tipos «desactualizados» de más de 48 h seguían en uso. Al volver a la
    pestaña se reevalúa también `stale`, y durante el bloqueo de un `429` se aplica el fallo sin pedir nada (D-147
    ampliada);
  - P3: un *timeout* al leer el cuerpo salía como `INVALID_RESPONSE`; ahora sale como `TIMEOUT`;
  - P3: una caché con `updatedAt` en el futuro se rechaza;
  - P3: la caché ya no hace *cast* sin validar (`isRecord`).

  Sin cambio:
  - P3 `[hidden]` en la nota del historial: con `@if`, la plantilla pasa del límite de complejidad (7 > 6, lo dio el
    lint);
  - P3 `catch` sin aviso al escribir la caché: queda como excepción deliberada en D-146.

**Pendientes, con la parte en la que se resuelven**

| Pendiente | Parte |
|---|---|
| Recordar la divisa tras recargar (Could): el e2e de CL-60 elige USD después de recargar | P10 |
| Importes de las métricas del dashboard en la divisa elegida (`convertAmount`) | P10 |
| Los de P7 (`q` en la URL, `502`/`504` de nginx, `DEMO_MODE`, AC-90 en el CI) siguen igual | P9–P11 |

**Decisiones:**
- D-137, D-138, D-140 y D-141: validadas en el plan;
- D-142 y D-143: del usuario;
- D-144, D-146, D-148, D-149, D-150 y D-151: Claude;
- D-145 y D-147: Claude · validadas tras el cierre.

**Tiempo:** estimado 3,5 h · real ≈ 40 min de implementación (17:15–17:55, hora de Canarias), más el plan, la
revisión y el cierre.

## Nota de traspaso — 2026-11-13, tras P8

**Para empezar una sesión nueva:** leer `CLAUDE.md`, esta nota, la sección de la parte siguiente de
[`04-plan-implementacion.md`](04-plan-implementacion.md) y su §4. El usuario activa el modo plan y Claude presenta el plan.

**Estado**
- Hechas: P0 a P8. P8 está en la rama `feat/p8-currency`, con su PR.
- `main` exige 5 *checks*: `quality` ×3, `audit` y `e2e`.
- Divisas:
  - el estado de los tipos vive en `ExchangeRatesStore` y la divisa en `CurrencyStore`, que expone `convert()` para
    cualquier vista nueva;
  - para escribir e2e de tipos, usar `simulateRatesApi`, `currencyHeader` y `firstVisit` de
    `e2e/fixtures/exchange-rates-api.ts`, y `amount()` de `e2e/fixtures/amounts.ts`.
- Datos locales y e2e: como tras P7 (`npm run setup`, `npm run db:reset`, `npm run e2e:dev`, la pila con
  `npm run e2e:stack`).

**Siguiente parte: P9 · Robustez** (3,5 h).

**Decisiones por validar:** ninguna (D-145 y D-147 validadas al cerrar P8; el usuario hace el *merge*).

## P9 · Robustez: seguridad, estados, responsive y accesibilidad — 2026-11-13 · rama `feat/p9-robustness`

**Hecho**
- **Ya cubiertos de antes** (sin tocar): AC-51, AC-57, AC-73, AC-74 y TV-ES-04; las vistas ya tenían sus estados de
  carga, vacío y error con «Reintentar».
- **AC-59, sin peticiones salientes** (D-154):
  - guardián en `setupFiles`: los tests de la API pasan con la red bloqueada salvo *loopback* y conexiones por
    `path`; tiene su propio test (9 casos, entre ellos una tubería de Windows);
  - regla de ESLint en todas las zonas de `apps/api/src` contra `http`, `https`, `http2`, `tls`, `dgram`, `dns`,
    `child_process`, `worker_threads`, `undici` y otras librerías, todo `net` salvo `isIP`, los globales `fetch`,
    `WebSocket`… y sus vías indirectas (`import()` de esos módulos, `require`, `process.getBuiltinModule`,
    `globalThis.fetch`), con 38 tests en `tools/`.
- **AC-85, backend caído** (D-152, D-153, D-155):
  - nginx contesta con un Problem `SERVICE_UNAVAILABLE` (`502`/`504`) y **solo** las cabeceras de la API
    (`api-error-headers.conf`), y en `/api/` el log baja a `crit`;
  - `GatewayProblem` en `contract`; la web muestra el mensaje nuevo en el alta y al guardar una simulación
    (`hasActionableMessage`, compartido con el `429`);
  - servicio `web-api-down` (`:8081`) en la pila de e2e; `check-containers` revisa ya cualquier contenedor del
    proyecto;
  - e2e en los dos destinos (dashboard, alta y detalle: error, «Reintentar» y recuperación; el alta conserva los datos)
    y cuatro `@prod-only` contra el nginx sin API (cuerpo, una sola CSP, `no-store`, las tres vistas y el mensaje en
    el formulario).
- **AC-63, XSS:** `<img src=x onerror=alert(1)>` sale literal en el listado y el detalle, sin `img` ni `dialog`.
- **AC-84, 360 px:** nombre de 200 caracteres sin espacios y email de 254 en el dashboard, el alta y el detalle con
  historial. Los helpers de `fixtures/layout.ts` tienen su test de que fallan cuando deben.
- **AC-86, accesibilidad** (D-156): `@axe-core/playwright` 4.14.0 en cada vista y estado a 1280 y 360 px; teclado del
  slider (Re Pág, Av Pág, Inicio, Fin) y del alta con el tabulador (nombre y foco visible en cada parada).
- **Resultados:**
  - `npm run verify` en verde: 1039 tests de Node (+49) y 239 de la web (+9);
  - e2e: 58/58 en `e2e:dev` y 71/71 contra la pila Docker; `check-containers` en verde con los 3 contenedores;
    `nginx -t` correcto y **ninguna línea** en el log de `web-api-down` tras los `502`;
  - trazabilidad **AC 77/81 (+5) · TV 126/129**; los 4 AC que faltan son de P10 y P11;
  - comprobado en el navegador a 360 px: el alta sin API con su error, la tarjeta con el foco alrededor y el nombre
    malicioso como texto; sin errores en la consola.

**Falló o lo descubrí por el camino**
- **axe encontró una infracción grave real** en las tarjetas del dashboard (`label-content-name-mismatch`, WCAG
  2.5.3): el enlace se llamaba como la empresa pero su texto era la tarjeta entera. Pasa a enlace estirado (D-157). El
  e2e falló antes del arreglo.
- **El formulario y el guardado no usaban el mensaje del problema** salvo en `409`/`429`, así que el de D-152 no se
  habría visto nunca. Los dos lo usan ahora, con tests que fallaron antes.
- **Un test de teclado leía `aria-valuetext` justo después de pulsar** y falló con carga (21 en vez de 11). Ahora espera
  el valor con `expect.poll`, y lo pasé 15 veces en paralelo.
- Un *heredoc* largo de bash se cortó a mitad de fichero. Lo reescribí con el editor.
- La app ya cabía en 360 px con los textos más largos: el trabajo de P5 a P8 aguantó.

**Correcciones**
- **Del usuario (plan):** las `location` del `502`/`504` sin `security-headers.conf` (una sola CSP, comprobada en un
  e2e), `web-api-down` en una red *bridge* sin `depends_on`, y el guardián deja pasar las conexiones por `path`.
- **Del revisor** (`sonnet`, una pasada): **APTO CON CAMBIOS**, sin P0 ni P1. Corregidos, con tests que fallaron
  antes del arreglo salvo donde se indica:
  - P2: `import net from 'node:net'` pasaba la regla (`importNames` no ve el import por defecto). Ahora todo `net`
    está prohibido salvo `isIP` (`allowImportNames`);
  - P2: faltaban vías de salida: `dns`, `child_process`, `worker_threads`, `cluster` y más librerías, más `import()`
    de esos módulos, `require`, `process.getBuiltinModule` y `globalThis.fetch` (`no-restricted-syntax`). El
    `import()` de Swagger UI (D-110) sigue permitido, con su test;
  - P2: `dgram.connect` sin guardar. Ya lo paraba el guardián de `dns.lookup`, que `connect` usa por dentro, así que
    su test pasó antes del arreglo; se envuelve igualmente para no depender de ese detalle;
  - P3: solo `localhost` literal (un subdominio de `localhost` puede resolverse fuera), el guardián no se instala dos
    veces y la cabecera declara lo que no cubre (`dns.resolve*`, procesos hijos e hilos);
  - P3: el foco visible se comprueba comparando el elemento con y sin foco (una sombra fija ya no cuenta), y el
    recorrido con el tabulador termina al volver al primer elemento, no al repetirse un nombre;
  - P3: el detalle y el alta también se prueban a través del nginx sin API;
  - P3: `check-containers` ordena igual en cualquier máquina y nombra `(unlabelled)` un contenedor sin etiqueta;
  - P3: comentario largo reajustado, y nota en `components.css` sobre los controles dentro de una tarjeta.

  Sin cambio:
  - P3: `web-api-down` construye la imagen otra vez (en caché, segundos); compartir `image:` añadiría un nombre de
    imagen a mantener;
  - P3: el texto de la tarjeta no se puede seleccionar con el ratón: queda anotado en D-157;
  - P3: el contraste del anillo de foco es el color `primary` de los tokens, cuyo contraste ya se prueba
    (`design-tokens.test.ts`).

**Pendientes, con la parte en la que se resuelven**

| Pendiente | Parte |
|---|---|
| ~~Un cuerpo de más de 64 KiB en `/api/` recibe el `413` HTML de nginx, no un Problem~~ | **Resuelto en P9** (D-158), ver abajo |
| Los de P7 y P8 (`q` en la URL, métricas, recordar la divisa, `DEMO_MODE`, AC-90 en el CI) siguen igual | P10–P11 |

**Decisiones:**
- D-152 y D-153: del usuario;
- D-154, D-155 y D-156: Claude · validadas en el plan;
- D-157: Claude · validada por el usuario tras el cierre;
- D-158: del usuario, tras la revisión de P9.

**Tiempo:** estimado 3,5 h · real ≈ 30 min de implementación (18:25–18:55, hora de Canarias), más el plan, la
revisión y el cierre.

**Tras el cierre, en el mismo PR (mensaje 5 del prompt 21):**
- **D-157 validada** por el usuario.
- **`413` de nginx en RFC 9457 (D-158):** el e2e `@prod-only` de `production-stack.spec.ts` (`POST` de 70 KiB) falló
  antes del arreglo (`text/html`) y pasa después: `PAYLOAD_TOO_LARGE` sin `instance`, una sola CSP, la de la API, y
  `no-store`. `nginx-problems.test.ts` (en la API) ata los cuerpos de `nginx.conf` a `problemOf`; lo escribí después
  del arreglo, así que no lo vi fallar. Con un cuerpo de 30 KiB, el `413` sigue viniendo de la API (D-132).
- **Un test de axe falló una vez contra la pila:** `color-contrast` en «Guardar simulación», medido a mitad de la
  transición de deshabilitado a primario. No es un fallo de contraste en reposo. La fixture espera ahora a que
  terminen las animaciones (`document.getAnimations()`) antes de auditar: 40/40 en cinco repeticiones. Va en un commit
  `test:` aparte.
- **El CI del PR falló en `quality (Node 24)`:** `eslint-outbound-network.test.ts` y `eslint-zones.test.ts` creaban y
  borraban a la vez el mismo fichero temporal (`apps/api/src/__lint_fixture__root.ts`). En local no salió por el
  orden de ejecución. El test nuevo usa ahora su propio prefijo (`__lint_fixture__outbound_`).
- **Resultados:** `verify` en verde (1042 tests de Node y 239 de la web), e2e 58/58 en `e2e:dev` y 72/72 contra la
  pila.

## Nota de traspaso — 2026-11-13, tras P9

**Para empezar una sesión nueva:** leer `CLAUDE.md`, esta nota, la sección de la parte siguiente de
[`04-plan-implementacion.md`](04-plan-implementacion.md) y su §4. El usuario activa el modo plan y Claude presenta el plan.

**Estado**
- Hechas: P0 a P9, todas integradas en `main`. P9 entró con el PR #13 (merge `4765d30`), que incluye D-158 y la
  validación de D-157.
- `main` exige 5 *checks*: `quality` ×3, `audit` y `e2e`.
- Para escribir e2e:
  - de accesibilidad: `expectNoSeriousA11yViolations(page, vista)` de `e2e/fixtures/a11y.ts`;
  - de 360 px: `NARROW_VIEWPORT`, `expectNoHorizontalScroll` y `expectTextFullyVisible` de `e2e/fixtures/layout.ts`;
  - con la API caída: `takeApiDown(page)` en los dos destinos, y `API_DOWN_WEB_URL` (`:8081`, solo `@prod-only`);
  - el formulario de alta: `fillCustomerForm` de `e2e/fixtures/customer-form.ts`.
- Los tests de la API no tienen red (D-154): un test que la necesite fallará con «outbound network is blocked».

**Siguiente parte: P10 · Should/Could y CI completo** (2,5 h).

**Decisiones por validar:** ninguna (D-157 validada; D-158 es del usuario).

## P10 · Should/Could y CI completo — 2026-11-13 · rama `feat/p10-should-could-ci`

**Hecho**
- **Métricas (AC-47, AC-92, TV-ST-01…03):**
  - dominio: `averageBaseCents` con TDD;
  - API: módulo `stats` (`GET /stats`), con una sola sentencia SQL para que los tres números salgan de la misma foto;
  - web: `DashboardStatsStore` y `app-dashboard-metrics`. El importe medio es una partida hoja convertida con
    `CurrencyStore.convertAmount` (D-20 y D-91). Si `/stats` falla, «—» y un aviso discreto, y el listado no se
    entera (D-162).
- **Búsqueda y página en la URL** (Should, D-163): `?q=…&page=…` con `replaceUrl`. La URL se lee al entrar y cuando
  cambia desde fuera, y la inválida se corrige. Los tests de AC-70 y AC-71 pasan sin cambios.
- **Desglose desplegable del historial** (Should): `<details>` nativo; `tierLabel` pasa a `shared/format`.
- **Divisa recordada** (Could): `localStorage` validado (`chosen-currency.storage.ts`); hasta que llegan los tipos,
  la divisa efectiva es EUR (D-143). El token pasa a llamarse `BROWSER_STORAGE`.
- **Ajustes pedidos:**
  - email del detalle entero y partido solo tras «@» y los puntos (D-159);
  - simulador en 15 usuarios, 140 € de base (D-160).
- **CI completo:**
  - trabajo `smoke` (AC-95) en Linux con Node 22, 24 y 26, y en Windows y macOS con `.nvmrc`: los comandos del
    README y Playwright sobre `npm run dev`;
  - trazabilidad bloqueante con pendientes declarados (D-161).
- **D-89 revisada** (D-164): `overrides` de `minimatch` 11.0.8, y `npm audit` pasa de 18 moderadas a 4.
- **README:** bloque «Estado» (P0 a P10) y `npm run e2e:smoke`.
- **Resultados:**
  - `npm run verify` en verde: 1064 tests de Node (+22) y 287 de la web (+48), con la cobertura del dominio al 100 %;
  - e2e: 69/69 en `e2e:dev` y 83/83 contra la pila Docker, con `check-containers` en verde;
  - trazabilidad estricta **AC 80/81 · TV 129/129** (+3 AC, +3 TV), con AC-61 como único pendiente declarado;
  - `npm audit`: 4 moderadas (antes 18), 0 altas o críticas;
  - comprobado en el navegador contra la pila, a 1280 y a 360 px: las métricas en EUR y USD, la recarga con
    `?q=…&page=2` y USD, el desglose abierto, el email y el simulador en 15. Sin errores en la consola y sin
    desplazamiento horizontal.

**Falló o lo descubrí por el camino**
- **El email en una línea con «…» chocaba con AC-84.** Lo avisé en el plan, y el usuario prefirió mantener AC-84 y
  partir solo por puntos naturales. En escritorio la columna del valor admite unos 38 caracteres: un email más largo
  sigue ocupando dos líneas, pero ahora se parte por un «.», nunca en mitad de una palabra.
- **Prettier partía en varias líneas el `@for` del email,** y Angular convertía ese salto en espacios dentro de la
  dirección. Ahora va en una línea con `prettier-ignore`, y lo protege un test de componente (`textContent` exacto).
- **Un test de la trazabilidad citaba «AC-61» en su título** y lo daba por cubierto. Lo reescribí sin nombrarlo.
- **Tres tests suponían el arranque en 1 usuario:** el de teclado de AC-86, el de AC-81 (24,20 €) y el de Re Pág de
  la web. Se ajustaron a 15.
- **`expectOne` saca la petición de la lista de abiertas:** un test la pedía dos veces. Era un fallo del test.
- **La prueba de humo no se pudo ejecutar en local:** el puerto 4200 estaba ocupado por un `ng serve` ajeno a esta
  sesión. La valida el CI.

**Correcciones**
- **Del usuario (plan):** el email, sin «…» y sin tocar AC-84 (D-159); `replaceUrl`; el `overrides`; autoriza a
  Claude a añadir los checks `smoke` a la protección de `main`.
- **Del revisor** (`sonnet`, una pasada): **APTO CON CAMBIOS**, sin P0 ni P1. Corregidos:
  - P2: el store ignoraba cualquier cambio de la URL mientras tuviera una navegación propia en vuelo (un contador), así
    que en teoría una navegación externa podía perderse. Ahora se compara por estado: solo se ignora una emisión igual
    a una escritura propia anterior (D-163). El test de la carrera (Intro y enseguida otra URL) **pasó también antes
    del arreglo**: en este router, la navegación cancelada resuelve su promesa antes de que la nueva emita. Se queda
    como guarda, y el diseño ya no depende de ese detalle;
  - P2: `smoke` instala Chromium con `--with-deps` en Linux, como `e2e`;
  - P3: el JSDoc de `SimulatorStore` había quedado separado de su clase; el orden de los imports tras el renombrado;
    un test unitario de `getStats` con totales imposibles (→ error, `500`).

  Sin cambio:
  - P3: un `<wbr>` también tras el último segmento del email. Es inocuo, y el test de componente lo fija.

**Pendientes, con la parte en la que se resuelven**

| Pendiente | Parte |
|---|---|
| AC-61 (demo pública, `DEMO_MODE`) | P11 |
| Quitar el `overrides` de `minimatch` cuando ESLint y typescript-eslint pidan la 11 | Cuando salgan |

**Decisiones:**
- D-159, D-160 y D-163 (`replaceUrl`): del usuario;
- D-161 y D-162: Claude · validadas en el plan;
- D-164: opción del usuario y versión de Claude;
- S-08: pendiente de validar.

**Tiempo:** estimado 2,5 h (unas 4 h con lo añadido) · real ≈ 30 min de implementación (21:46–22:17, hora de
Canarias), más el plan, las dos pilas de e2e, la revisión y el cierre.

## Nota de traspaso — 2026-11-13, tras P10

**Para empezar una sesión nueva:** leer `CLAUDE.md`, esta nota, la sección de la parte siguiente de
[`04-plan-implementacion.md`](04-plan-implementacion.md) y su §4. El usuario activa el modo plan y Claude presenta el plan.

**Estado**
- Hechas: P0 a P10. P10 está en la rama `feat/p10-should-could-ci`, con su PR.
- `main` exige `quality` ×3, `audit` y `e2e`, y los 5 `smoke` en cuanto pasen una vez en verde (D-88; autorizado en el
  prompt 22).
- `npm run trace` ya bloquea (D-161). **P11 tiene que quitar `AC-61` de `PENDING_CRITERIA`** en
  `scripts/trace-tests.mjs` cuando su test exista: si no, el CI falla con «Declared pending but already tested».
- Prueba de humo: `npm run e2e:smoke`, con los puertos 3000 y 4200 libres.
- El dashboard: el store de la búsqueda escribe la URL con `replaceUrl`, y las métricas están en `DashboardStatsStore`.
  Para convertir un importe suelto, `CurrencyStore.convertAmount`.

**Siguiente parte: P11 · Demo pública** (3 h). Su plan se aprueba antes de tocar el servidor.

**Decisiones por validar:** S-08.

## Arreglo tras P10 · e2e inestable de AC-91 — 2026-11-13 · rama `fix/e2e-slider-initial-value`

**Qué pasó:** el CI de `main` se puso en rojo tras fusionar la PR #15. El e2e de AC-91
(`simulator.spec.ts`, «the slider jumped over 10», recibido 15) había pasado en la PR con el mismo código.

**Causa:**
- El test pulsaba Inicio y leía `aria-valuetext` enseguida. Sin Zone.js, y con el slider en `OnPush`, la vista se
  repinta después de la tecla, no durante ella. A veces la lectura veía todavía el valor inicial: como 15 ≥ 10, el
  bucle no daba ningún paso y la aserción fallaba con 15.
- Hasta D-160 el valor inicial era 1, así que esa lectura obsoleta acertaba por casualidad. Es el mismo patrón que se
  corrigió en P9 en el test de teclado de AC-86, que ya espera con `expect.poll`.

**Arreglo** (solo tests, la web no cambia):
- `openSimulator` da el simulador por listo cuando el slider anuncia «15 usuarios». Antes le bastaba con que fuera
  visible.
- AC-91 espera «1 usuarios» tras Inicio antes de subir con las flechas.
- Revisados los demás e2e que suponen el valor inicial: el de teclado de AC-86 y el de AC-81 (→ de 15 a 16). Los dos
  esperan ya con aserciones que reintentan, y ahora `openSimulator` les garantiza el punto de partida. Los que usan
  `fill(...)` no dependen de él.

**Evidencia** (pila del e2e en local, `--workers=4`):
- antes del arreglo, AC-91 con `--repeat-each=100`: **6 de 100 fallan**, con el mismo error del CI;
- después, AC-91 con `--repeat-each=100`: **100/100**;
- después, `simulator.spec.ts`, `keyboard.spec.ts` y `exchange-rates.spec.ts` con `--repeat-each=50`: **850/850**;
- la suite completa (`npm run e2e`): 83/83;
- Prettier, ESLint y `tsc` del e2e en verde.

**Revisor** (`sonnet`, una pasada): **APTO**, sin P0, P1 ni P2. Dos P3:
- se ha completado esta entrada con la evidencia;
- sin cambio: que el test de D-160 repita «15 usuarios» en lugar de usar la constante de la fixture. Ese test comprueba
  el valor de la especificación, y por eso se escribe a mano.

**Decisiones:** ninguna nueva. **Tiempo:** unos 25 min, la mayor parte en repeticiones de la pila.

## Nota de traspaso — 2026-11-13, tras el arreglo de AC-91

**Estado**
- P0 a P10 fusionadas. Este arreglo va en su propia PR. Cuando se fusione, `main` debería volver a verde; hay que
  comprobarlo antes de empezar P11.
- El plan de P11 ya está aprobado (prompt 24, que se guarda al cerrar P11).
  - El usuario validó D-169 a D-173, y autoriza a añadir el *check* `demo` a la protección de `main` tras su primer
    verde.
  - La numeración definitiva se fija al registrarlas.

**Siguiente parte: P11 · Demo pública**, en la rama `feat/p11-demo`, desde `main` en verde.

**Decisiones por validar:** S-08.

## P11 · Demo pública — 2026-11-14 · ramas `feat/p11-demo` (PR #17) y `chore/p11-close`

**Hecho**
- **Código** (PR #17):
  - API: con `DEMO_MODE`, cada arranque siembra el perfil `demo` en un `/data` vacío. Nunca borra una base de datos
    (D-174), y no arranca con más de 5 escrituras por minuto (D-173);
  - web: el aviso de spec 05 §2, solo en el build `demo` (D-168, D-169);
  - `deploy/demo/`: el *override* de Compose, las plantillas del sitio de nginx y el reinicio diario con systemd
    (D-171, D-172);
  - CI: el trabajo `demo` prueba las imágenes, y `publish` sube esas mismas a GHCR (D-170). AC-61 sale de
    `PENDING_CRITERIA`.
- **`main`** exige ahora 11 *checks*: se ha añadido `demo` tras su primer verde, como autorizó el usuario.
- **Publicación:** `sha-ab4960e…` y `main` de las dos imágenes. Los paquetes heredaron la visibilidad pública del
  repositorio, así que no hubo que cambiarla (D-166 lo daba por necesario). El *pull* anónimo funciona, y cada etiqueta
  apunta al *digest* que probó el trabajo `demo`.
- **Despliegue** (por SSH, según 08-despliegue §4.4):
  - Docker 29.1.3 y Compose 2.40.3, del archivo de Ubuntu;
  - la pila, con `sha-ab4960e…`;
  - el fichero del sitio, con las plantillas rellenadas en el servidor;
  - el certificado ECDSA, emitido con `certonly --nginx` al primer intento. La renovación de prueba pasa y no toca el
    fichero;
  - el *timer* del reinicio, activo.
- **Cierre** (esta PR):
  - las etiquetas OCI de las imágenes (D-176, con TDD);
  - la documentación, la trazabilidad y el README, con el enlace a la demo.

**Comprobación en vivo** (AC-61, parte R; https://saas-o-matic.codeserviceapi.es)

| Comprobación | Resultado |
|---|---|
| HTTP → HTTPS | `301` en `/` y en `/api/health`. |
| HSTS | Una sola cabecera, `max-age=31536000; includeSubDomains`, en `/`, `/api/customers` y `/api/catalog`. |
| Cabeceras | CSP, `nosniff` y `same-origin` en todas; COOP y CORP en la API. `no-store` en la API, salvo `/catalog` (`max-age=300`). |
| Aviso | El texto exacto, antes de la cabecera, a 1280 y a 360 px y sin desplazamiento horizontal. |
| Datos | Los 25 clientes de ejemplo. |
| Escrituras | 5 × `201`, y la sexta da `429 RATE_LIMITED` con `retry-after: 59`. |
| Suplantación | Con un `X-Forwarded-For` o un `X-Real-IP` falsos sigue el `429`. Si se envía `CF-Connecting-IP`, Cloudflare lo rechaza con `403`. |
| Cubos por cliente | A (IPv4): 90 → 89 → 88, mientras B (IPv6) va de 98 a 97. Además, B escribe (`201`) con A limitado. |
| *Timer* | Activo; el próximo, el 15/11 a las 05:00, hora del servidor. |
| Reinicio | Con la propia unidad de systemd: el cliente del visitante pasa de `200` a `404`, y el total de 26 a 25. `Result=success`, y dos siembras en el log. |
| Contenedores | Sin root, solo lectura, sin capacidades y con `no-new-privileges`. Dentro de sus límites, y con `/data` en `tmpfs`. Unos 42 MB entre los dos. |
| Los demás sitios | Igual que la línea base, comprobados después de cada paso. |

**Falló o lo descubrí por el camino**
- **`publish` falló la primera vez** (D-177): la API se publicó, y GHCR rechazó el manifiesto de la web con `denied`.
  Al relanzar solo ese trabajo, pasó.
- **La imagen de la web decía ser nginx** (D-176): heredaba las etiquetas de su base, y GHCR mostraba su descripción
  y su licencia. Lo descubrí al buscar la causa del `denied`, que resultó no tener relación.
- **La segunda red no pudo ser el propio servidor.** Se usaron IPv4 e IPv6 de un mismo equipo, que Cloudflare envía
  como dos clientes, y 08-despliegue §4.4 lo admite ya.
- **Cloudflare inyecta su script de analítica** (`static.cloudflareinsights.com`) en el HTML. La CSP lo bloquea, así
  que no sale ningún dato del visitante, pero la consola muestra el error. Queda pendiente de decidir.
- **La primera petición del reto ACME por Cloudflare dio `520`**, justo tras recargar nginx. No se repitió, y certbot
  emitió el certificado al primer intento.

**Correcciones**
- **Del usuario:** aprueba D-174 y D-175.
- **Del revisor** (`sonnet`, una pasada): **APTO CON CAMBIOS**, sin P0 ni P1. Corregidos:
  - P2: las recomendaciones de abajo, aunque genéricas, dejaban ver el estado del servidor. Ahora son una lista de
    endurecimiento que vale para cualquier servidor, sin decir cómo está este, como pidió el usuario y recoge D-175;
  - P3: la frase sobre la segunda red describía la protección del origen; ahora es neutra;
  - P3: el test de D-176 descarta los comentarios antes de unir las líneas de continuación, y lee las instrucciones
    sin distinguir mayúsculas, como Docker.

  Sin cambio:
  - P3: la lista de etiquetas de la base de nginx es fija. Queda ligada a su *digest*, y el comentario pide releerla
    al cambiar de base.

**Recomendaciones fuera del alcance de la prueba** (del usuario, para después de la entrega). Es la lista habitual de
endurecimiento de un servidor; el detalle no se publica (D-175):
- revisar las actualizaciones automáticas de seguridad del sistema;
- revisar en qué interfaces escucha cada servicio.

**Pendientes, con la parte en la que se resuelven**

| Pendiente | Parte |
|---|---|
| README final, prueba desde un clon limpio y revisión final | P12 |
| El script de analítica de Cloudflare que bloquea la CSP | Decisión del usuario |
| Quitar el `overrides` de `minimatch` cuando ESLint y typescript-eslint pidan la 11 | Cuando salgan |

**Decisiones:**
- D-165 a D-173: validadas en el plan;
- D-174 y D-175: aprobadas;
- D-176 y D-177: aprobadas.

**Tiempo:** estimado 3 h (unas 4 h con el CI de la demo). Real:
- unas 2 h 20 min desde el *merge* de la PR #16 hasta la PR #17 (23:41–02:06, hora de Canarias), con una pausa por el
  límite de uso;
- más 1 h de publicación, despliegue y comprobación (06:23–07:20).

## Nota de traspaso — 2026-11-14, tras P11

**Estado**
- P0 a P11 hechas. El código de P11 está en `main` (PR #17), y el cierre, en la PR #18.
- La demo, https://saas-o-matic.codeserviceapi.es, corre `sha-ab4960e…`. Las imágenes de esta PR solo cambian las
  etiquetas, así que no hace falta volver a desplegarla. Si se hace, son los pasos de 08-despliegue §4.4.
- El directorio de la demo está en el servidor, fuera de cualquier repositorio. Las órdenes de operación y la vuelta
  atrás están en 08-despliegue §4.4.
- `main` exige 11 *checks*: `quality` ×3, `audit`, `e2e`, los 5 `smoke` y `demo`.

**Siguiente parte: P12 · Cierre:** README final, prueba desde un clon limpio y revisión final.

**Decisiones por validar:** S-08.
