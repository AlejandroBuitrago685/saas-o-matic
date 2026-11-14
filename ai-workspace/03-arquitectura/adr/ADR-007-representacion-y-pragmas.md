# ADR-007 · Representación de datos y pragmas de SQLite

- **Estado:** aceptada (D-60, validada el 2026-11-12) · **Fecha:** 2026-11-12

## Contexto

SQLite tiene tipado dinámico, y Drizzle 0.45 no permite declarar tablas `STRICT` (comprobado en sus tipos). Hay que
decidir cómo se guardan los UUID v7, las fechas y los importes, y qué pragmas se aplican.

## Decisión

- **UUID v7:** `TEXT` canónico de 36 caracteres en minúsculas, con `CHECK (length = 36 AND id = lower(id))`.
- **Fechas:** `INTEGER`, milisegundos Unix UTC. La API las serializa como ISO 8601 con `Z`.
- **Importes y tipos:** `INTEGER` en céntimos y en puntos básicos.
- **Tipado:** `CHECK (typeof(col) = 'integer')` en las columnas numéricas, que sustituye a `STRICT`.
- **Pragmas en cada conexión:** `foreign_keys = ON`, `journal_mode = WAL`, `synchronous = NORMAL`,
  `busy_timeout = 5000` y `trusted_schema = OFF`.

## Alternativas

- **UUID como `BLOB(16)`:** ocupa menos, pero no es legible y complica la depuración y Drizzle; a esta escala el
  ahorro no importa.
- **Fechas en texto ISO:** legibles, pero un error de formato rompe el orden; habría que validar el formato con
  `GLOB`.
- **Tablas `STRICT` editando a mano el SQL generado:** la siguiente migración que genere `drizzle-kit` podría
  reconstruir la tabla sin `STRICT`. Es frágil.
- **`synchronous = FULL`:** más durable ante cortes de luz, pero más lento; para un simulador no compensa.

## Consecuencias

- La base de datos rechaza tipos y valores fuera de rango aunque la aplicación tuviera un bug.
- Un test con un fichero real verifica que los pragmas quedan aplicados.
