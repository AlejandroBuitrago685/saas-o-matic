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

**Decisiones:** D-117 y D-118 (usuario), D-119 a D-121 (Claude · pendiente). Siguen sin validar D-76, D-77, D-78, D-79,
D-83, D-84, D-86, D-87 y D-102 (la nota de traspaso de P3 decía que no quedaba ninguna).

**Tiempo:** estimado 2,5 h (mi estimación con los pendientes de P3: 3,5 h) · real ≈ 1,5 h (09:27–10:55, hora de
Canarias, con las correcciones de la revisión). La holgura del viernes queda casi entera.

## Nota de traspaso — 2026-11-13, tras P4

**Para empezar una sesión nueva:** leer `CLAUDE.md`, esta nota, la sección de la parte siguiente de
[`04-plan-implementacion.md`](04-plan-implementacion.md) y su §4. El usuario activa el modo plan y Claude presenta el plan.

**Estado**
- Hechas y mergeadas en `main`: P0 a P3; P4 en su PR (ver el estado de la rama).
- La API tiene el flujo completo de la porción vertical: alta y detalle de clientes, y creación, lectura e historial de
  simulaciones, con `openapi.json` al día. No existe aún `GET /customers` (P7) ni `GET /stats` (P10).
- Para escribir módulos nuevos: `buildApiTestApp` (límites altos), `expectBody`/`expectProblem` y `api-helpers`
  en `apps/api/test/`; un módulo solo se usa por su `index.ts`.

**Siguiente parte: P5 · Web de la porción vertical** (4,5 h): el contrato y la API ya están; ver el plan.

**Pendiente para P5 y P6:** las tablas de pendientes de las entradas P3 y P4. En especial: la referencia de error (8
últimos del UUID) y `strictTemplates` en `typecheck` (P5); SIGTERM, subred fija de Compose, `--ignore-scripts` y
Playwright en `devDependencies` (P6).

**Decisiones por validar:** D-119 a D-121 y las nueve de P0 y P2 que siguen en «Claude · pendiente».
