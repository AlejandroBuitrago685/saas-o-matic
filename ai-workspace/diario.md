# Diario de desarrollo

Una entrada corta por fase o parte (D-74): **lo hecho**, **lo que falló**, **las correcciones** (del usuario, del
revisor o propias) y **las decisiones**. Es la evidencia del desarrollo iterativo con IA que pide el enunciado (§3.3).
Los prompts literales están en [`prompts/`](prompts/) y las decisiones, en [`decisiones.md`](decisiones.md).

---

## Fase 1 · Análisis — 2026-11-12 · commit `d860065`

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

## Fase 2 · Especificación — 2026-11-12 · commits `1577793`, `5bf8294`, `80bd9c1` y `df33f27`

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

## Fase 3 · Arquitectura — 2026-11-12 · commit `089ecc5`

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

## Fase 4 · Plan de implementación — 2026-11-12

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
