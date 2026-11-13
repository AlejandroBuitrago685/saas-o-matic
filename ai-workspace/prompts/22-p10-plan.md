# 22 · Plan de P10 (Should/Could y CI completo)

## Mensaje 1

Continuamos con SaaS-O-Matic en una sesión nueva. Antes de empezar, lee CLAUDE.md, ai-workspace/04-plan-implementacion.md y la nota de traspaso de ai-workspace/diario.md. No releas la especificación entera: consulta solo lo que necesites.

Seguimos con P10: Should/Could y CI completo, según el plan. Además de lo que tenga asignado, incluye:

1. Dashboard: las métricas agregadas (AC-92: número de clientes, número de simulaciones e importe medio simulado), con el importe convertido a la divisa seleccionada con la misma regla que el resto (partida hoja). Ahora mismo el «Dashboard» del enunciado es solo un listado.
2. Recordar la divisa elegida tras recargar la página.
3. Ajustes visuales que he visto al revisar la app:
   - en la tarjeta del cliente, el email largo se parte en varias líneas: que quede en una línea, cortado con puntos suspensivos y el email completo accesible (title o similar, sin romper la accesibilidad);
   - el simulador arranca en 1 usuario: que arranque en 15, que es el ejemplo del enunciado (100 € + 40 € = 140 €), salvo que tengas un motivo de spec para no hacerlo.
4. Revisar D-89 (vulnerabilidades moderadas de desarrollo), como quedó previsto para P10.
5. Actualizar el bloque «Estado» del README, que todavía dice P0 a P7.

Estoy en modo plan: preséntame el plan de P10. Protocolo de siempre al cerrar.

## Mensaje 2 (respuestas a las preguntas del plan)

- **Email del detalle frente a AC-84:** Cortar y enmendar AC-84 (Recomendado).
- **D-89:** Override de minimatch (Recomendado).
- **Búsqueda y página en la URL, botón «Atrás»:** Sustituir la entrada (Recomendado).

## Mensaje 3 (al rechazar la primera versión del plan)

Un cambio: en el email del detalle me quedo con mantener AC-84, no con cortarlo. Con «…» y title el email completo no se puede leer en móvil ni con el teclado. Que el email se vea entero y solo se parta por puntos naturales (después de la @ y de los puntos, con <wbr> o overflow-wrap), sin enmendar AC-84. D-159 queda así.

Lo demás, aprobado, incluidas D-161 y D-162. Cuando los checks smoke hayan pasado una vez en verde, añádelos tú a la protección de main con gh: te lo autorizo.

## Mensaje 4

(Aprobación del plan en la interfaz de modo plan, sin texto.)
