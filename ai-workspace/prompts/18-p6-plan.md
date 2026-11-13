# 18 · Plan de P6 (Docker Compose, nginx y e2e de la porción vertical)

## Mensaje 1

Continuamos con SaaS-O-Matic en una sesión nueva. Antes de empezar, lee CLAUDE.md, ai-workspace/04-plan-implementacion.md y la nota de traspaso de ai-workspace/diario.md. No releas la especificación entera: consulta solo lo que necesites.

Seguimos con P6: Docker Compose, nginx y los e2e de la porción vertical, con la CSP real. Ten en cuenta D-99 y D-105/D-113 sobre la demo. La IP real tiene que funcionar con TRUST_PROXY limitado a loopback y a la subred de Docker, y los contenedores solo pueden escuchar en 127.0.0.1.

Estoy en modo plan: preséntame el plan de P6. Protocolo de siempre al cerrar.

## Mensaje 2 (respuestas a las preguntas del plan)

- **TRUST_PROXY:** Solo el nginx en local (loopback,172.30.0.10), como recomiendas. En la demo, en vez de la subred entera, también direcciones exactas: loopback, 172.30.0.1 (la pasarela por la que entra el nginx del host) y 172.30.0.10. Es lo mismo que necesitamos, pero más estrecho. Y el e2e de suplantación que demuestre que una IP falsa no cambia el cubo del límite.
- **Cabecera Server:** Imagen oficial sin versión (Recomendado).

## Mensaje 3

(Aprobación del plan en la interfaz de modo plan, sin texto.)

## Mensaje 4

Plan aprobado. Apruebo D-132 a D-134, y el seed va en P7 como propones.

Cuando el trabajo e2e haya corrido una vez en verde en la PR, añádelo tú a los checks obligatorios de main con gh. Te autorizo ese cambio en la protección de la rama.
