# ADR-002 · Contrato compartido con Zod; la web solo importa tipos

- **Estado:** aceptada (D-55, validada el 2026-11-12) · **Fecha:** 2026-11-12

## Contexto

El contrato (spec `04`) lo usan la API (validación y serialización), la web (tipos de los DTO y códigos de error) y
el inventario OpenAPI (RNF-SEC-17). Pros y contras detallados en [`../02-monorepo.md`](../02-monorepo.md) §2.1.

## Decisión

- Paquete `@saas-o-matic/contract` con los esquemas Zod de peticiones, respuestas, Problem Details y códigos de
  error, y con los tipos derivados exportados con nombres explícitos (`CreateCustomerRequest`, `CustomerResponse`…).
- Las normalizaciones que forman parte del esquema (D-34: nombre y email) usan funciones de `domain`.
- La API usa los esquemas en las rutas (con `fastify-type-provider-zod`) y para generar `openapi.json`.
- La web **solo** usa `import type`, lo que impone el lint. Zod no llega al bundle.

## Alternativas

- **Esquemas solo en la API y tipos duplicados en la web:** divergencia silenciosa.
- **Contrato en OpenAPI y tipos generados:** añade un paso de generación y otra herramienta, y el esquema deja de
  ser código ejecutable en la API.
- **Compartir también la validación en tiempo de ejecución en la web:** añade Zod al bundle por una ganancia
  pequeña. La web valida lo mínimo con los límites del catálogo.

## Consecuencias

- Un cambio del contrato rompe la compilación de la web si no se adapta: es lo deseado.
- Un test de contrato valida cada respuesta de la API contra su esquema.
- Hay que distinguir `z.input` de `z.output` cuando un esquema transforma datos.
