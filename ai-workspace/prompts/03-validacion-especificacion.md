<!--
Prompt literal enviado por el usuario a Claude Code (Opus 5.5).
- Fase: 2 · Especificación (validación de las decisiones pendientes)
- Fecha: 2026-11-12
- Contexto: respuesta a las 8 decisiones «Claude · pendiente» y a los supuestos S-02 y S-03 del commit e9fbe2e.
El texto que sigue a este comentario es el prompt tal cual se envió, sin editar.
-->

He revisado lo pendiente. Lo apruebo todo, con estas condiciones:

1. D-05 (slider por segmentos): aprobada. La conversión entre posición y número de usuarios tiene que ser una función pura con tests: se tiene que poder llegar exactamente a 10, 11, 50 y 51, e ir y volver tiene que devolver el mismo valor. Además, el slider debe anunciar el número de usuarios a los lectores de pantalla (aria-valuetext).

2. D-13 (CIF): aprobada. Además de los vectores inventados, añade como prueba CIF reales de empresas conocidas: Telefónica A28015865, Inditex A15075062, Mercadona A46103834 y Banco Santander A39000013. Son datos públicos y tienen que pasar con tu algoritmo.

3. D-16 y S-03: aprobados.

4. D-20: aprobada.

5. D-23: aprobada, pero el fallback no puede esconder el error. El enunciado evalúa expresamente los estados de carga y error de la API externa, así que tienen que verse siempre: carga, error con botón de reintentar y aviso de tipos desactualizados con su fecha. Cada uno cubierto por un e2e con la API simulada.

6. D-26 y D-34: aprobadas.

7. D-47 y S-02: aprobados.

8. Un ajuste al CI (RNF-21): la matriz de Node 22/24/26 para lint, tests unitarios, de integración y build, y los e2e una sola vez, con la versión del .nvmrc, para que el pipeline no tarde una eternidad.

Registra las validaciones en decisiones.md, refleja las condiciones en la especificación y haz commit. Todavía no empieces la arquitectura.
