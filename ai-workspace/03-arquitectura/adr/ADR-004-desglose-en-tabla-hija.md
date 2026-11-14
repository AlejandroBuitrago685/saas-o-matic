# ADR-004 · Desglose por tramo en tabla hija; tablas de solo inserción

- **Estado:** aceptada (D-57, validada el 2026-11-12) · **Fecha:** 2026-11-12

## Contexto

Cada simulación guarda su desglose por tramo (D-18) como instantánea inmutable. Se lee siempre junto con la
simulación y nunca se consulta por tramo. El enunciado valora la «persistencia limpia» (§4.3), y D-29 hace las
simulaciones inmutables.

## Decisión

- Tabla `simulation_tiers` con clave primaria `(simulation_id, tier)`, clave foránea a `simulations` y `CHECK` por
  fila: `units > 0`, `to_user` nulo o `>= from_user`, y **`subtotal_cents = units * unit_price_cents`**.
- La simulación y sus tramos se escriben en una transacción.
- Los tramos de una página del historial se leen con una sola consulta `IN (…)`, nunca N+1.
- **Triggers** `BEFORE UPDATE/DELETE` en `customers`, `simulations` y `simulation_tiers`, que abortan: son tablas de
  solo inserción (D-29), creadas en una migración personalizada.

## Alternativas

- **Columna JSON** (`tiers TEXT CHECK(json_valid(tiers))`): una sola escritura y una sola lectura, pero la base de
  datos no puede garantizar la forma ni la aritmética de cada tramo; toda la integridad dependería de la aplicación.
- **Sin triggers:** la inmutabilidad solo la garantizaría la API (no hay endpoints de edición). Los triggers son
  defensa en profundidad y cuestan unas pocas líneas de SQL.

## Consecuencias

- La base de datos rechaza un tramo con el subtotal mal calculado.
- La regla «base = suma de subtotales» sigue dependiendo del caso de uso, porque afecta a varias filas; la cubren los
  tests de integración.
- El reinicio de la demo recrea el fichero de la base de datos, así que los triggers no lo impiden.
