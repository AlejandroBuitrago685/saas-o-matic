# ADR-009 · `Result` en el dominio, `AppError` en la aplicación y un único manejador RFC 9457

- **Estado:** aceptada (D-62, validada el 2026-11-12) · **Fecha:** 2026-11-12

## Contexto

Todas las respuestas de error deben seguir RFC 9457 con códigos estables (D-31 a D-33), y ninguna ruta debe
contener lógica (petición del usuario). Hay errores de cuatro orígenes: esquema, reglas de negocio, framework y fallos
inesperados.

## Decisión

- **`domain`** devuelve `Result<T, E>` con errores tipados: los fallos de negocio son valores, no excepciones, y el
  compilador obliga a tratarlos.
- **Los casos de uso** traducen esos resultados a una jerarquía cerrada de `AppError` (`BusinessRuleError` 422,
  `ConflictError` 409, `NotFoundError` 404) y los lanzan.
- **Un único `setErrorHandler`** traduce todo a Problem Details: errores de Zod (400), del framework (413, 415, 400
  por JSON), del límite de peticiones (429), `AppError`, y lo demás como 500 genérico.
  `setNotFoundHandler` cubre las rutas inexistentes. Tabla en [`../03-backend.md`](../03-backend.md) §4.

## Alternativas

- **`Result` hasta la ruta:** cada ruta tendría que traducir el error a HTTP, lo que repite código y deja reglas de
  presentación en las rutas.
- **Excepciones también en el dominio:** se pierde la exhaustividad en compilación y se mezclan errores esperados con bugs.

## Consecuencias

- Un único punto donde se garantiza que nunca se filtran detalles internos (RNF-SEC-10).
- Un test por cada código del contrato asegura que la traducción está completa.
