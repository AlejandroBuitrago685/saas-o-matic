# 20 · Plan de P8 (divisas)

## Mensaje 1

Continuamos con SaaS-O-Matic en una sesión nueva. Antes de empezar, lee CLAUDE.md, ai-workspace/04-plan-implementacion.md y la nota de traspaso de ai-workspace/diario.md. No releas la especificación entera: consulta solo lo que necesites.

Seguimos con P8: divisas. Es de lo que el enunciado evalúa expresamente («manejo de estados de carga/error al consumir la API externa» y ver los costes «convertidos en tiempo real»), así que tiene que quedar impecable:
- selector de divisa en la cabecera, en el hueco reservado en P5, que convierte al momento todos los importes: simulador, historial, dashboard;
- indicador de estado fijo con carga, error con «Reintentar» y tipos desactualizados con su fecha (D-23, D-51), también con EUR seleccionado;
- regla de conversión de D-20: el desglose siempre cuadra;
- validación de la respuesta de la API externa antes de usarla, caché de 1 h y vuelta a EUR si no hay tipos válidos;
- atribución del proveedor (D-24) y aviso de importe orientativo fuera de EUR;
- e2e de cada estado con la API simulada, sin depender nunca de la API real.

En el plan valido también D-137, D-138, D-140 y D-141, que quedaron pendientes de P7.

Estoy en modo plan: preséntame el plan de P8. Protocolo de siempre al cerrar.

## Mensaje 2 (respuestas a las preguntas del plan)

- **Contradicción entre spec 05 §4.4 (en «Cargando» solo hay EUR) y AC-88 (elegir GBP y luego JPY mientras cargan):** AC-88 en «Refrescando» (Recomendado).
- **Divisa tras recuperarse de un error de la API de tipos:** Vuelve a la elegida (Recomendado).

## Mensaje 3

(Aprobación del plan en la interfaz de modo plan, sin texto.)
