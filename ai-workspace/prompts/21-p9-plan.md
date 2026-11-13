# 21 · Plan de P9 (robustez)

## Mensaje 1

Continuamos con SaaS-O-Matic en una sesión nueva. Antes de empezar, lee CLAUDE.md, ai-workspace/04-plan-implementacion.md y la nota de traspaso de ai-workspace/diario.md. No releas la especificación entera: consulta solo lo que necesites.

Seguimos con P9: robustez. Seguridad, estados de carga, vacío y error en todas las vistas, responsive desde 360 px y accesibilidad (axe en los e2e, teclado y foco). Incluye lo que quedó asignado a P9 en partes anteriores, como el 502 de nginx en RFC 9457 cuando la API está caída (AC-85).

Estoy en modo plan: preséntame el plan de P9. Protocolo de siempre al cerrar.

## Mensaje 2 (respuestas a las preguntas del plan)

- **AC-85: respuesta de nginx con la API caída y mensaje en la web:** 502/504 + mensaje propio (Recomendado).
- **T-12: nivel del log de errores de nginx en `/api/`:** Sí, `crit` en /api/ (Recomendado).

## Mensaje 3 (al rechazar la primera versión del plan)

Acepto el plan con estas correcciones. Incorpóralas al plan antes de empezar:

1. Paso 2.2 (nginx, AC-85): las `location` con nombre del 502/504 NO incluyen `security-headers.conf`, porque lleva la CSP de la SPA (`default-src 'self'…`) y su propio comentario dice que nunca va en /api/. Si se mezclan, la respuesta llevaría dos `Content-Security-Policy`. Crea siempre `apps/web/nginx/api-error-headers.conf`, solo con las cabeceras de API de AC-52 (las mismas que emite la API: `default-src 'none'`, CORP `same-site`, `nosniff` y las demás), cada una con `always`, más `Cache-Control: no-store`. El e2e comprueba que solo hay una cabecera CSP y que es la de la API.

2. Servicio `web-api-down` (D-155): usa una red bridge propia, no `internal: true`, porque en una red interna Docker no publica `127.0.0.1:8081` al host. El servicio no lleva `depends_on: api`.

3. Guardián de red (AC-59, D-154): además de loopback, deja pasar las conexiones por `path` (pipes de Windows y sockets Unix), para no romper herramientas locales. Añade al test un caso que lo compruebe.

Valido D-154, D-155 y D-156 tal como están en el plan. Regístralas como validadas por el usuario al cerrar la parte.

## Mensaje 4

(Aprobación del plan en la interfaz de modo plan, sin texto.)

## Mensaje 5 (tras el cierre)

Revisada P9: está bien. Antes del merge, dos cosas en este mismo PR:

1. Valido D-157 tal como está. Regístrala como validada por el usuario.

2. Cierra el pendiente del 413 HTML de nginx, para que se cumpla el formato único RFC 9457 de ADR-009:
   - Primero el test que falla: un e2e @prod-only contra la pila hace POST /api/customers con un cuerpo de más de 64 KiB. Comprueba que la respuesta es 413 en application/problem+json, con type /problems/payload-too-large, code PAYLOAD_TOO_LARGE y sin instance; una sola cabecera Content-Security-Policy, la de la API; y Cache-Control: no-store. Comprueba que falla antes del arreglo.
   - nginx: en location ^~ /api/, `error_page 413 @api_too_large;`, con el mismo patrón que @api_unreachable (include de api-error-headers.conf, default_type application/problem+json y `return 413 '<json>'`). Usa el type, el title y el code que ya tiene PAYLOAD_TOO_LARGE en packages/contract/src/problem.ts, para que el cuerpo sea igual que el 413 de la API salvo el instance.
   - Entre 16 y 64 KiB sigue respondiendo la API (D-132). No cambies client_max_body_size.
   - Documentación, una sola vez: la fila del 413 en 04-contrato-api §2.2 (la emite nginx por encima de 64 KiB), 08-despliegue, una decisión nueva D-158 en decisiones.md y, en el diario, el pendiente pasa a resuelto.
   - Pasa verify, e2e:dev y e2e contra la pila. Haz un commit `fix:` aparte y súbelo al PR #13.
