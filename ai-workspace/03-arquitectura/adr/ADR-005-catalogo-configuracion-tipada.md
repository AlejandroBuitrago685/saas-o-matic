# ADR-005 · Catálogo como configuración tipada validada al arrancar

- **Estado:** propuesta (D-58) · **Fecha:** 2026-11-12

## Contexto

Países con sus tipos, planes, tarifas y la asociación de plan a tarifa (D-08, D-09) son datos de negocio que cambian
poco y siempre con revisión. La especificación ya asume que se validan al arrancar y que un cambio requiere reiniciar
el servicio (AC-07, AC-46). Las simulaciones guardan una instantánea, así que el histórico no depende del catálogo.

## Decisión

- El catálogo es **código tipado** (`apps/api/src/config/catalog.data.ts`) validado al arrancar con `validateCatalog`
  de `domain`: tarifas contiguas, tipos de 0 a 10 000 bps, planes con tarifa existente y países con validador fiscal.
  Si falla, el servicio no arranca.
- La web lo recibe por `GET /catalog`.
- Las listas cerradas (`country`, `plan`, `tax_id_type`) se refuerzan con `CHECK ... IN (…)` en la base de datos,
  generados a partir de las mismas constantes de `domain`.

## Alternativas

- **Tablas sembradas** (`countries`, `plans`, `tariffs`, `tariff_tiers`): permiten claves foráneas, pero los cambios
  pasan por seeds o migraciones de datos, y la validación de coherencia (tramos contiguos, tarifa por plan) habría que
  hacerla igualmente en código. Además, sería otra fuente de verdad frente al registro de validadores, que es código.
- **JSON o YAML externo:** pierde la comprobación de tipos en compilación.

## Consecuencias

- Un único lugar, revisable en el código, con comprobación de tipos y validación al arrancar.
- Añadir un país implica una migración, por el `CHECK`. Es un coste intencionado: también hace falta su validador.
- Para cambiar un tipo impositivo hay que desplegar. Encaja con D-09 («datos configurables») y con AC-46.
