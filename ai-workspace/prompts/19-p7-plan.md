# 19 · Plan de P7 (búsqueda, dashboard y seed)

## Mensaje 1

Continuamos con SaaS-O-Matic en una sesión nueva. Antes de empezar, lee CLAUDE.md, ai-workspace/04-plan-implementacion.md y la nota de traspaso de ai-workspace/diario.md. No releas la especificación entera: consulta solo lo que necesites.

Seguimos con P7: búsqueda y dashboard, con el seed (perfiles demo y e2e de 04-base-de-datos §7), que se asignó a esta parte. Incluye también:
- cerrar AC-54 con la parte de q y quitar el TODO(P7) de las rutas («Clientes» debe llevar al listado);
- que e2e:dev no escriba en la base de datos de desarrollo: que use una base propia, y un comando para dejar la de desarrollo limpia con el seed (ahora tiene clientes «Pruebas E2E…» de P6).

Estoy en modo plan: preséntame el plan de P7. Protocolo de siempre al cerrar.

## Mensaje 2 (respuestas a las preguntas del plan)

- **Perfil «e2e» del seed** (no tendría ningún consumidor): No crearlo (Recomendado).
- **Reiniciar la base de desarrollo con `npm run db:reset` al cerrar P7** (9 clientes, 8 «Pruebas E2E…», y 3 simulaciones; no se puede deshacer): Sí, reiníciala tú.
- **Hueco de la spec en la búsqueda** (una `q` como «-» o «.» se normaliza a vacío para el identificador fiscal): No filtra ese campo (Recomendado).

## Mensaje 3

(Aprobación del plan en la interfaz de modo plan, sin texto.)
