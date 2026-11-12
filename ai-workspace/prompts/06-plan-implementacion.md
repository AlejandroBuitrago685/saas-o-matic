<!--
Prompt literal enviado por el usuario a Claude Code (Opus 5.5).
- Fase: 3 · Validación de la arquitectura y Fase 4 · Plan de implementación
- Fecha: 2026-11-12
- Contexto: arquitectura del commit e729bf8 con 13 decisiones pendientes.
El texto que sigue a este comentario es el prompt tal cual se envió, sin editar.
-->

Revisada la arquitectura. Antes de nada, el plazo: el correo dice «lunes, 19 de noviembre, a las 23:00», pero el 19 cae en jueves. Hasta que me lo aclaren, trabajamos con la fecha más temprana posible, el lunes 16 a las 23:00. Mi objetivo es entregar antes, el domingo 15, con todo lo planificado, extras incluidos. El lunes queda como margen.

## Validación de la arquitectura
Apruebo D-55 a D-68 tal como las propones, con estos ajustes:

1. CSP (D-64 y D-65): comprueba que la build de producción de Angular no inyecta el CSS crítico en línea (inlineCritical). Si lo hace, mete un <style> y un onload en el index.html que la CSP bloquearía, y la app podría verse sin estilos. En ese caso, desactívalo. Además, quiero un test e2e que falle si aparece cualquier violación de CSP en la consola.
2. CLAUDE.md: la marca ⚙ solo puede ir en reglas cuya herramienta ya esté configurada. Mientras no lo esté, márcala como pendiente. No quiero que diga que algo se comprueba si todavía no es verdad.
3. Subagente revisor: si el campo tools no permite limitar Bash a comandos de solo lectura, quítale Bash y pásale tú el diff o la lista de ficheros. Es más simple que añadir un hook.

Registra todo en decisiones.md.

## Fase 4: plan de implementación (sin código)
Escribe `ai-workspace/04-plan-implementacion.md` con:

1. **Calendario** del jueves 12 al domingo 15, con todo incluido: Must, Should y Could, Docker, CI, e2e y la demo desplegada. El lunes 16 queda solo como margen. Antes de entregar, haz una prueba desde un clon limpio siguiendo el README al pie de la letra.
2. **Partes en orden.** Empieza por una porción vertical que funcione de punta a punta lo antes posible: alta de cliente → simulación → historial en EUR. Para cada parte: objetivo, AC y TV que cubre, módulos que toca, tests, riesgos, estimación y definición de hecho.
3. **Plan de contingencia.** No quiero recortar nada, pero si vamos tarde quiero saber qué se cae primero. Haz una lista ordenada de lo que se aplazaría, con puntos de control concretos («si el sábado a las 22:00 no está X, se aplaza Y»).
4. **Protocolo de cada parte**, que seguiremos siempre:
   - yo activo el modo plan y tú me presentas el plan de la parte;
   - cuando lo apruebe, implementas con TDD donde aplique;
   - lint, tipos y tests en verde;
   - pasas el subagente revisor y corriges todos los P0 y P1;
   - actualizas el diario y la trazabilidad;
   - commit.
5. **Diario de desarrollo** en `ai-workspace/diario.md`: una entrada corta por parte con lo hecho, lo que falló, las correcciones que hicimos yo o el revisor y las decisiones tomadas. Es la evidencia del desarrollo iterativo que pide el enunciado. Créalo ya, con una entrada para las fases 1 a 4.

Haz commit y dime si el calendario te parece realista. Si crees que no llegamos con todo, dímelo ahora.

## Mensaje adicional (durante la fase 4, tras una interrupción)

<!-- Añadido el 2026-11-12 al cerrar P0: no se guardó en su momento. -->

Try again
