# ADR-014 · TypeScript 6.0.x fijado en todo el monorepo

- **Estado:** propuesta (D-67) · **Fecha:** 2026-11-12

## Contexto

TypeScript 7.0.2 se publicó el 2026-11-12 y es la versión `latest` en npm. `@angular/compiler-cli@22` exige
`typescript >=6.0 <6.1` y `typescript-eslint@8.72` exige `<6.1.0` (comprobado en sus `peerDependencies`). En un
monorepo con npm workspaces, versiones distintas de TypeScript por paquete causan errores difíciles de diagnosticar
(RT-07).

## Decisión

- `typescript` **6.0.3**, versión exacta, como dependencia de desarrollo de la raíz. Ningún paquete declara otra.
- Se revisará cuando Angular y typescript-eslint soporten TypeScript 7.

## Alternativas

- **TypeScript 7 en el backend y 6 en la web:** dos compiladores y dos comportamientos en un mismo repositorio, con
  tipos compartidos entre ambos.
- **Rango amplio (`^6`):** una 6.1 rompería Angular.

## Consecuencias

- Instalación reproducible; el *lockfile* y `npm ci` la garantizan.
- Habrá una tarea de actualización cuando el ecosistema adopte TypeScript 7 (fuera de esta entrega).
