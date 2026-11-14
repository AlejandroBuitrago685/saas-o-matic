# 26 · P12: cierre y entrega

## Mensaje 1

Parte P12: cierre y entrega. Lee CLAUDE.md, la nota de traspaso del diario y la sección P12 del plan de implementación.Ya he comprobado yo que la PR #19 está fusionada y que main está en verde.

Apruebo S-08: regístralo.

Cambio de plan: añade una parte P13, "Recorrido visual para los evaluadores". Es una página HTML interactiva que se hará en otra sesión cuando P12 esté fusionada, y por eso la etiqueta de la entrega pasa a P13. Regístralo en el plan y como decisión.

Objetivo: que un evaluador entienda el proyecto en 5 minutos y pueda comprobar cualquier requisito sin leer todo ai-workspace.

1) README.md pensado para quien llega por primera vez, en este orden:
- qué es, en dos líneas;
- el enlace a la demo;
- tres capturas: el dashboard, el simulador con el desglose por tramos y el móvil a 360 px. Hazlas con un script de Playwright que se pueda volver a ejecutar (npm run capturas) y guárdalas optimizadas en docs/capturas; P13 las reutilizará;
- el arranque rápido;
- el enlace a la guía del evaluador;
- después, lo que ya hay: Docker, e2e, API, comandos y estructura.
Quita el bloque de estado por partes y deja una línea que diga que está completo.

2) GUIA-EVALUADOR.md en la raíz, de una página:
- recorridos de 5 minutos (la demo), 15 minutos (en local, con los tests) y 60 minutos (el código y el proceso);
- una tabla con cada requisito del enunciado, dónde se ve en la aplicación y qué test lo cubre, con enlaces a los ficheros. Sácala de la matriz de trazabilidad, no la inventes.

3) Sección "Cómo he trabajado con la IA". Explica:
- el proceso guiado por especificación, una sesión por parte, el revisor y los hooks;
- con transparencia: además de las sesiones de construcción, usé una sesión aparte de Claude como asesor. Me ayudaba a preparar los prompts y revisaba los planes, el CI y el servidor. Los prompts que pegué en las sesiones de construcción están literales en ai-workspace/prompts;
- que usé dos cuentas y que las transcripciones se entregan aparte.

4) Sección "Dónde intervine yo": entre 8 y 10 momentos en los que mi criterio cambió el rumbo, cada uno en dos líneas con el enlace a la decisión o al diario. Búscalos en decisiones.md (las que tienen como autor al usuario y las corregidas tras mi revisión) y en el diario. Enséñame antes la lista de candidatos para que elija yo, y no la escribas hasta entonces.

5) Sección "Qué es deliberadamente exigente y qué haría distinto en producción", breve y honesta:
- por qué hay tanto proceso: es una prueba sobre el uso de la IA;
- qué cambiaría: autenticación y roles, Postgres, un proveedor de divisas con SLA, observabilidad, copias de seguridad, y lo que veas.

6) Un README corto en ai-workspace con qué hay en cada carpeta y por dónde empezar a leer.

7) Cabeceras de la demo. En la demo, Cloudflare (su opción "Add security headers" de Managed Transforms) añade X-Frame-Options SAMEORIGIN, X-XSS-Protection y Expect-CT, y cambia Referrer-Policy de no-referrer a same-origin. Compruébalo con curl en vivo. Si sigue así, documéntalo como decisión en 08-despliegue y explica por qué no es una debilidad: frame-ancestors 'none' de la CSP manda sobre X-Frame-Options, y same-origin no envía el referer a otros orígenes. No escribas ningún dato del servidor.

8) Prueba desde un clon limpio. Clona el repositorio de GitHub en una carpeta temporal fuera del proyecto y sigue el README al pie de la letra: npm ci, npm run setup, npm run dev, la prueba de humo y docker compose up --build. Apunta en el diario cuánto tarda y cualquier paso que falle o que el README no diga, y corrige el README si hace falta.

9) Revisión final:
- pasa el revisor sobre todo el diff de la parte;
- comprueba que no hay enlaces rotos en los markdown;
- comprueba que no hay datos del servidor (D-99, D-175), ni TODOs ni restos.

10) Cierre: diario, decisiones, plan, el prompt literal y una PR. En la nota de traspaso deja a P13 lo que necesita: dónde están las capturas y su script, la lista final de "Dónde intervine yo" y la tabla de requisitos.

Reglas de siempre: primero el plan; el push y el merge me los pides; el CI tiene que estar en verde. Si algo del enunciado no está cubierto, dímelo en vez de esconderlo.

## Mensaje 2

Apruebo el plan, con estos ajustes:

1) El script de analítica de Cloudflare ya está desactivado. Lo he quitado con una Configuration Rule solo para el subdominio de la demo. No lo documentes como pendiente: compruébalo en vivo (que el HTML no incluye beacon.min.js y que la consola de la demo no muestra errores al cargar) y apúntalo en el diario como resuelto en el panel de Cloudflare, sin cambios en la CSP. Las cabeceras de Managed Transforms sí se quedan: documéntalas en D-179 como tenías previsto.

2) Las secciones de IA no van al final del README. Pon un bloque corto, de 5 o 6 líneas con enlaces, justo después del arranque rápido, y el detalle en ai-workspace/README.md.

3) Cambio respecto a lo que te pedí: no hagas una sección sobre la sesión asesora. Basta una línea neutra dentro de "Cómo he trabajado con la IA": "Además de las sesiones de construcción, usé Claude fuera del repositorio para preparar los prompts de cada parte y revisar los planes antes de aprobarlos." Nada más sobre eso.

4) "Dónde intervine yo", sin coletillas en el título. Usa los números 1, 3, 5, 6, 8, 10, 12, 13 y 15, y añade uno que no está en tu lista: pedí que el diseño fuera una extensión visual de roams.es (búscalo en 10-diseno-visual.md y en el diario). Redacta cada uno como una decisión mía ("decidí", "pedí", "rechacé"). La decisión de no tener login, documentada, va en una línea de la sección de producción.

5) P13 dura unas 3 h.

Los dos tests de documentación me parecen bien: déjalos. Te autorizo el push de docs/p12-cierre para la prueba del clon limpio, también con los arreglos que salgan de ella. La PR y el merge, como siempre: me los pides con el CI en verde.

## Mensaje 3

Respuesta a la pregunta de la interfaz: «¿Paro yo el ng serve huérfano que ocupa el puerto 4200 (PID 48772)?»

Sí, páralo

## Mensaje 4

Respuestas: mantén la línea de las dos cuentas y las tres debilidades de la sección de producción; el prompt 26 literal está bien. El puerto 4200 ya está libre: termina la prueba del clon limpio (npm run dev, la descarga limpia de Chromium y e2e:smoke). Un ajuste menor: el README repite los requisitos de Node en "Arranque rápido" y en "Requisitos"; déjalo en un solo sitio. Después, el diario, la nota de traspaso para P13 y pídeme abrir la PR.
