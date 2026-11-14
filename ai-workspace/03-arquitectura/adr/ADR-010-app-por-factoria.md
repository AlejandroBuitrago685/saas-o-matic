# ADR-010 · `buildApp(deps)` con inyección manual de dependencias

- **Estado:** aceptada (D-63, validada el 2026-11-12) · **Fecha:** 2026-11-12

## Contexto

Los tests de integración deben ejecutarse sin levantar el servidor y con control del reloj, de los IDs, de la base de
datos y de los logs (AC-50, AC-54, AC-62).

## Decisión

- `buildApp({ config, catalog, db, clock, ids, logger })` construye la instancia de Fastify sin escuchar.
- `main.ts` es la única raíz de composición con efectos (leer el entorno, abrir el fichero, escuchar).
- Las dependencias se conectan **a mano** en `buildApp`: repositorios → casos de uso → plugins de rutas.
- Los tests usan `buildTestApp()` con SQLite en memoria y `app.inject()`.

## Alternativas

- **Contenedor de inyección** (`awilix`, `@fastify/awilix`): ahorra algo de código de conexión, pero añade una
  dependencia y magia (resolución por nombre). Con cinco módulos, la conexión manual es corta y explícita.
- **Decorar la instancia de Fastify** (`app.decorate('db', …)`) y usarla en las rutas: acopla los casos de uso a
  Fastify.

## Consecuencias

- Los casos de uso no dependen de Fastify y se pueden probar por separado si hace falta.
- Los tests de integración son rápidos y aislados, con una base de datos por fichero.
