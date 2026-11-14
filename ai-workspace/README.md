# ai-workspace

Aquí está el proceso con el que se construyó SaaS-O-Matic: lo que se pensó antes de escribir código, lo que se decidió
por el camino y lo que se pidió a la IA. El código y cómo levantarlo están en el [`README`](../README.md) de la raíz;
la [guía del evaluador](../GUIA-EVALUADOR.md) lleva cada requisito del enunciado a su test.

## Qué hay en cada sitio

| Qué | Para qué sirve |
|---|---|
| [`00-enunciado.md`](00-enunciado.md) | El enunciado original, transcrito sin cambios. |
| [`01-analisis.md`](01-analisis.md) | Requisitos, 23 ambigüedades con su propuesta y los casos límite, antes de decidir nada. |
| [`02-especificacion/`](02-especificacion/README.md) | Reglas de negocio, validación fiscal, contrato de la API, frontend, seguridad y 83 criterios de aceptación con sus vectores de prueba. Empieza por su README. |
| [`03-arquitectura/`](03-arquitectura/README.md) | Monorepo, backend, base de datos, frontend, tests, despliegue y calidad automatizada, con 14 [ADR](03-arquitectura/adr/README.md). |
| [`04-plan-implementacion.md`](04-plan-implementacion.md) | Las partes en las que se construyó, en orden, con sus criterios, riesgos y calendario. |
| [`decisiones.md`](decisiones.md) | Cada decisión (`D-xx`) con la alternativa descartada, el motivo y quién la tomó; los supuestos y las preguntas para negocio. |
| [`diario.md`](diario.md) | Una entrada por parte: qué se hizo, qué falló, qué corrigió el responsable del proyecto y qué corrigió el revisor. |
| [`prompts/`](prompts) | Los prompts de las sesiones de construcción, literales y numerados. |

## Por dónde empezar a leer

1. Esta página, que resume el proceso y dónde cambió el rumbo.
2. [`01-analisis.md`](01-analisis.md): cómo se desmenuzó el enunciado.
3. [`02-especificacion/README.md`](02-especificacion/README.md) y, de ahí, los criterios de aceptación.
4. [`03-arquitectura/README.md`](03-arquitectura/README.md): cómo se planteó el código y cómo se hizo cumplir.
5. [`decisiones.md`](decisiones.md) y [`diario.md`](diario.md): lo que realmente pasó.

## Cómo he trabajado con la IA

- **Guiado por especificación.** Antes de la primera línea de código hubo cuatro fases: análisis, especificación,
  arquitectura y plan de implementación. Ningún código de producción de una parte se escribe hasta que su especificación
  está aprobada ([D-02](decisiones.md#proceso-y-entorno), [`CLAUDE.md`](../CLAUDE.md)).
- **Una sesión por parte.** El plan divide la construcción en partes. Cada una empieza en una sesión nueva, que lee la
  nota de traspaso del [diario](diario.md), presenta su plan y no toca código hasta que lo apruebo
  ([D-73](decisiones.md#validación-de-la-arquitectura-y-plan-2026-11-12)). Cada parte acaba en una rama y una PR, con el CI en
  verde.
- **Un revisor.** Al cerrar cada parte, un subagente [`revisor`](../.claude/agents/revisor.md) revisa el cambio contra la
  especificación y las reglas de seguridad. Solo puede leer (D-72). Los hallazgos P0 y P1 de código se corrigen con un
  test que falla antes del arreglo; la primera revisión, la de la parte P0, fue un **NO APTO** con un hallazgo P0 y cinco
  P1 ([diario](diario.md)).
- **Hooks y herramientas.** Las reglas de `CLAUDE.md` marcadas con ⚙ las comprueba una herramienta probada: ESLint con
  límites de tamaño y fronteras entre capas, `tsc` estricto, scripts del repositorio, hooks de Claude Code y un CI
  obligatorio para integrar en `main` ([09-calidad-y-automatizacion](03-arquitectura/09-calidad-y-automatizacion.md)).
- **Los prompts** que pegué en las sesiones de construcción están literales en [`prompts/`](prompts). Donde habría
  revelado datos del servidor de la demo llevan la marca «[Omitido (D-175): …]»; el resto no se toca.
- Además de las sesiones de construcción, usé Claude fuera del repositorio para preparar los prompts de cada parte y
  revisar los planes antes de aprobarlos.
- Usé dos cuentas de Claude. Las transcripciones de las sesiones se entregan aparte.

## Dónde intervine yo

Diez momentos en los que mi criterio cambió el rumbo, en el orden en que ocurrieron. Cada uno enlaza con la decisión y
con el prompt en el que lo pedí.

1. **Validación fiscal estricta.** Rechacé la validación genérica de 2 a 20 caracteres fuera de España: no es
   «estricta». Pedí el formato oficial de cada país, con su fuente, y un validador por país detrás de una interfaz
   común. [D-15](decisiones.md#validación-fiscal) · [prompt](prompts/02-especificacion.md)
2. **Seguridad con método.** Pedí sustituir el requisito de seguridad genérico por un bloque basado en el OWASP API
   Security Top 10 y un modelo de amenazas, incluido por qué no hay login.
   [D-40](decisiones.md#api-y-seguridad) · [prompt](prompts/02-especificacion.md)
3. **Un fallback que no esconde el error.** Aprobé la caché de los tipos de cambio con una condición: carga, error con
   «Reintentar» y tipos desactualizados se ven siempre, cada estado con su e2e.
   [D-51](decisiones.md#validación-de-la-especificación-2026-11-12) · [prompt](prompts/03-validacion-especificacion.md)
4. **La CSP, comprobada.** Pedí verificar si el build de Angular inyectaba CSS en línea, y un e2e que falle ante
   cualquier violación de CSP. Con el valor por defecto, la política habría dejado la web sin estilos.
   [D-70](decisiones.md#validación-de-la-arquitectura-y-plan-2026-11-12) · [prompt](prompts/06-plan-implementacion.md)
5. **El flujo de trabajo.** Decidí una rama y una PR por parte, y hooks rápidos (el lint del fichero editado, nunca el
   build completo). Tras el primer NO APTO del revisor acepté su propuesta: `npm install <paquete>` y `gh pr merge`
   pasaron a pedir confirmación. [D-80, D-82 y D-85](decisiones.md#p0--scaffolding-2026-11-12) ·
   [prompt 07](prompts/07-p0-plan.md) y [prompt 08](prompts/08-p0-permisos-y-cierre.md)
6. **La IP real, sin atajos.** Exigí que los proxies de confianza fueran solo `loopback` y la subred de Docker de la
   demo, nunca todos los rangos privados; en P6 estreché el de la demo a direcciones exactas y pedí un e2e que demuestre
   que una IP falsa no abre un cubo nuevo del límite.
   [D-113](decisiones.md#p3--contrato-y-base-de-la-api-2026-11-12) y D-130 · [prompt 13](prompts/13-p3-cierre.md) y [prompt 18](prompts/18-p6-plan.md)
7. **El diseño, una extensión de roams.es.** Pedí que la interfaz pareciera una extensión natural de la web de la
   empresa, [roams.es](https://roams.es/): misma familia visual, no una copia. Validé la maqueta con dos ajustes.
   [D-122](decisiones.md#p3--contrato-y-base-de-la-api-2026-11-12) · [10-diseno-visual](03-arquitectura/10-diseno-visual.md) · [prompt](prompts/16-p5-plan.md)
8. **Una contradicción de la especificación.** Claude detectó que la §4.4 dejaba solo EUR mientras cargan los tipos y
   que AC-88 pedía cambiar de divisa en ese momento, y me planteó las salidas. Decidí que AC-88 se cumple en
   «Refrescando» y que tras un error los importes vuelven a la divisa que había elegido. [D-142 y D-143](decisiones.md#p8--divisas-2026-11-13) · [prompt](prompts/20-p8-plan.md)
9. **No enmendar un criterio para facilitar el código.** Yo había pedido cortar el email del detalle con «…», y eso
   obligaba a cambiar AC-84. Al revisar el plan me di cuenta de que con «…» y `title` no se puede leer en móvil ni con
   el teclado, y cambié de idea: que se vea entero y se parta solo por puntos naturales, sin tocar el criterio. [D-159](decisiones.md#p10--shouldcould-y-ci-completo-2026-11-13) · [prompt](prompts/22-p10-plan.md)
10. **Parar la línea cuando el CI se pone rojo.** Tras fusionar P10, el e2e de AC-91 falló en `main`. Pedí arreglarlo en
    una PR aparte antes de seguir, y demostrarlo con repeticiones: de 6 fallos en 100 ejecuciones a 0 en 100.
    [diario](diario.md#arreglo-tras-p10--e2e-inestable-de-ac-91--2026-11-13--rama-fixe2e-slider-initial-value) · [prompt](prompts/23-arreglo-e2e-ac91.md)

## Qué es deliberadamente exigente y qué haría distinto en producción

**Por qué hay tanto proceso.** Esto es una prueba sobre cómo uso la IA, y el enunciado dice que el valor está en el
proceso de ingeniería. Para una herramienta interna de este tamaño, 83 criterios de aceptación, 129 vectores de
prueba, 14 ADR, un revisor y hooks son más de lo que haría falta: están ahí para que se vea cómo se planifica, se
delega y se controla, y cada parte cuesta tiempo de proceso además de código.

**Qué cambiaría para producción:**

- **Autenticación y roles.** No hay login: es una herramienta interna tras la red corporativa, con un solo rol
  ([D-30, §3.6 de seguridad](02-especificacion/06-seguridad.md#36-por-qué-no-hay-login-d-30)). En
  producción, SSO con roles y auditoría por usuario.
- **Postgres en lugar de SQLite.** SQLite lo pide el enunciado y encaja con una instancia. Con varios comerciales
  escribiendo y más de una réplica haría falta Postgres; los límites de peticiones, que viven en memoria de cada
  instancia, pasarían a un almacén compartido.
- **Un proveedor de divisas con SLA.** `open.er-api.com` es el endpoint abierto del proveedor: actualiza los tipos una
  vez al día y declara una caché de 1 hora ([análisis §9](01-analisis.md#9-datos-comprobados-durante-el-análisis-2026-11-12)),
  sin ningún acuerdo de servicio con nosotros. Hoy se llama desde el navegador (D-22) y no se guarda el tipo usado, así
  que un presupuesto no es reproducible a la divisa de ese día. Lo pasaría al servidor, con un proveedor con SLA y el
  tipo guardado en cada simulación.
- **Observabilidad.** Hoy hay una línea de log por petición, sin datos personales, y un `/health`. Faltan métricas,
  trazas, alertas y un seguimiento de errores.
- **Copias de seguridad.** Los datos de la demo son efímeros a propósito. Una base real necesita copias periódicas y una
  restauración probada.
- **Fiscalidad real.** Hoy se aplica el tipo general del país (D-09) y se valida el formato del identificador, no su
  existencia (D-12). Habría que consultar a negocio la inversión del sujeto pasivo y consultar VIES o la AEAT.
- **Lo que veo al repasarlo.** El repositorio es público y no declara licencia. El despliegue de la demo es manual, sin
  vuelta atrás automática. Y el límite de escrituras es por IP y, en IPv6, por bloque /64, un riesgo que acepté en
  [D-173](decisiones.md#p11--demo-pública-2026-11-14).
