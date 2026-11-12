<!--
Prompts literales enviados por el usuario a Claude Code (Opus 5.5).
- Parte: P0 · Scaffolding y herramientas (presentación y aprobación del plan, en modo plan)
- Fecha: 2026-11-12
- Contexto: plan de implementación aprobado (commit c04abd5).
Son tres mensajes, en orden. El texto de cada uno está tal cual se envió, sin editar.
-->

## Mensaje 1 · Aprobación del plan de implementación y paso a P0

Plan aprobado. Respondo a lo que necesitas:

1. Disponibilidad (S-06): la que has supuesto me vale.
2. P1 y P2 en un único plan: de acuerdo.
3. GitHub: ya he creado el repositorio público y vacío: https://github.com/AlejandroBuitrago685/saas-o-matic. Añádelo como remoto en P0 y pídeme autorización antes del primer push.
4. Hosting de la demo: lo decido mañana viernes antes de las 14:00 y tendré la cuenta creada antes del sábado.
5. Fecha de entrega (S-05): sigo esperando su respuesta, así que mantenemos el lunes 16 a las 23:00 como límite.

Empezamos por P0. Estoy en modo plan: preséntame el plan de la parte siguiendo el protocolo.

## Mensaje 2 · Respuesta a la pregunta sobre el email de los commits

Usa noreply: 73494963+AlejandroBuitrago685@users.noreply.github.com

## Mensaje 3 · Aprobación del plan de P0 con ajustes

Plan aprobado con dos ajustes:

1. Flujo de git: una rama y una PR por parte, no commits directos a main. En la descripción de cada PR, el resumen de la parte, los AC que cierra y el resultado del revisor. Merge cuando el CI esté en verde. Voy a instalar gh y autenticarme yo. Si no lo tengo listo cuando llegues al paso 12, haz el primer push a main y seguimos con PRs desde P1.

2. Los hooks tienen que ser rápidos o van a frenar cada turno: el hook Stop usa verify:changed, nunca el build completo, y el PostToolUse solo lintea el fichero editado. Si alguno tarda más de unos 10 segundos, avísame.

Con estos dos cambios, adelante.
