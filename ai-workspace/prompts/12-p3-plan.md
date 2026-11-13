<!--
Prompts literales enviados por el usuario a Claude Code (Opus 5.5).
- Parte: P3 · Contrato y base de la API (presentación del plan, en modo plan)
- Fecha: 2026-11-12
- Contexto: P2 cerrada con la PR #4; plan de P3 con la IP real a través de Cloudflare y dos nginx.
- Nota: el mensaje 2 llegó como respuesta a la primera presentación del plan; después el usuario lo aprobó con el
  botón, sin texto.
Son cuatro mensajes, en orden. El texto de cada uno está tal cual se envió, sin editar.
-->

## Mensaje 1 · Aprobaciones y paso a P3

D-103 y D-104 aprobadas. Cuando los 4 checks de la PR #4 estén en verde, haz el merge.

Seguimos con P3. Estoy en modo plan: preséntame el plan, incluido cómo verá la API la IP real del cliente pasando por Cloudflare y los dos nginx.

## Mensaje 2 · Ajustes al plan de P3

Buen plan. Apruebo D-105 a D-108, y D-109 tras la prueba. Tres ajustes:

1. IP real (D-105): he revisado el servidor y el snippet de Cloudflare NO está a nivel global: solo se incluye dentro del server de api.codeservice.es. Nuestro fichero de sitio de P11 tiene que incluirlo explícitamente. Si no, $remote_addr sería la IP del nodo de Cloudflare y todos los usuarios compartirían el mismo cubo del rate limit. Corrige D-105 y añádelo como requisito de P11, con una comprobación después del despliegue.

2. Swagger: los evaluadores tienen que poder explorar la API sin leer código. Además de generarlo en el test, versiona el openapi.json en el repo, con una comprobación en el CI de que está al día, y sirve Swagger UI en /docs solo en desarrollo, nunca en la demo ni en producción. Enlázalo desde el README.

3. Parser JSON propio (D-106): como __proto__ llega como clave propia, nada puede tocar el cuerpo antes de Zod (ni Object.assign, ni merges, ni copias por asignación). Añade un test que envíe {"__proto__": {"polluted": true}} y compruebe, además del 400, que Object.prototype sigue limpio.

Con eso, adelante.

## Mensaje 3 · `@fastify/swagger-ui` solo en desarrollo (enviado a mitad de turno)

Plan aprobado. Un detalle sobre @fastify/swagger-ui: si solo se usa en desarrollo, no debe acabar en la imagen de producción. Ponlo en devDependencies y cárgalo con un import() dinámico solo cuando NODE_ENV=development. La imagen de Docker instala sin dependencias de desarrollo, así que en la demo ni siquiera existirá. Añade un test de que con production no se importa.

## Mensaje 4 · Reanudación tras el límite de uso

I hit my usage limit while you were working, but it has reset now. Please continue from where you left off.

## Mensaje 5 · Reanudación tras el límite de uso, durante las correcciones del revisor

I hit my usage limit while you were working, but it has reset now. Please continue from where you left off.
