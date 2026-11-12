# ADR-001 · Dominio compartido en TypeScript puro

- **Estado:** propuesta (D-54) · **Fecha:** 2026-11-12

## Contexto

Las mismas reglas (tramos, impuestos, redondeo, conversión, validación fiscal, escala del slider) se usan en el
navegador, para la proyección y la ayuda en formularios, y en la API, que es la autoridad. Si hubiera dos
implementaciones, acabarían divergiendo (RT-02). El usuario exige que este dominio sea puro, sin I/O ni frameworks,
y con tests exhaustivos.

## Decisión

Paquete `@saas-o-matic/domain`:

- **Sin dependencias de npm.** Compila con `lib: ["ES2023"]` y `types: []`, así que usar DOM, Node, `fetch`,
  `Date.now()` o `Math.random()` es un error de compilación.
- Funciones puras que devuelven `Result` y no lanzan excepciones por reglas de negocio.
- Las constantes de negocio (países, planes, tipos de identificador, límites) viven aquí y de aquí las toman el
  contrato, el catálogo y los `CHECK` de la base de datos.
- API pública solo por `index.ts`.
- TDD con los vectores de la spec y cobertura del 100 % como umbral del CI.

## Alternativas

- **Dominio dentro de `apps/api` y copia en la web:** dos implementaciones, el problema de RT-02.
- **Dominio en la API y proyección pidiendo al servidor:** ver ADR-008.
- **Dominio con Zod u otras librerías:** se acopla a una dependencia y la arrastra al bundle de la web.

## Consecuencias

- Una sola fuente de verdad para las reglas, probada una vez y usada en los dos lados.
- La validación del catálogo y las transiciones de estado que deban ser puras se escriben a mano, sin librería.
- El dominio no conoce el reloj ni los IDs: los reciben los casos de uso por inyección.
