# ADR-013 · Reglas de código aplicadas con herramientas, hooks y subagente revisor

- **Estado:** propuesta (D-66) · **Fecha:** 2026-11-12

## Contexto

El enunciado evalúa que el código generado por IA sea limpio y modular y que no tenga ficheros masivos (§3.2, §4.2),
y RT-11 lo señala como riesgo alto. Las reglas escritas en `CLAUDE.md` se pueden olvidar; las herramientas, no.

## Decisión

Cada regla comprobable se hace cumplir con una herramienta, en el momento más temprano posible
([`../09-calidad-y-automatizacion.md`](../09-calidad-y-automatizacion.md)):

- **TypeScript estricto** (con `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`…) y `domain` sin DOM ni Node.
- **ESLint:**
  - `strictTypeChecked` y angular-eslint.
  - Límites: **250 líneas por fichero, 40 por función, complejidad 8, profundidad 3, 3 parámetros**.
  - `eslint-plugin-boundaries` para paquetes y capas; restricciones de imports (Drizzle, Fastify, Zod) por zona.
- **dependency-cruiser** para ciclos; scripts propios para nombres de fichero, patrones prohibidos y trazabilidad.
- **Hooks de Claude Code:**
  - `PostToolUse`: lint y tipos del fichero editado.
  - `PreToolUse`: bloquea editar migraciones aplicadas, `--no-verify`, `push --force` y `drizzle-kit push`.
  - `Stop`: verificación de los paquetes cambiados; no se puede terminar con tests en rojo.
- **lefthook** (pre-commit, commit-msg, pre-push) y **CI** como última barrera.
- **Subagente revisor** de solo lectura al cerrar cada parte.

## Alternativas

- **Solo `CLAUDE.md` y revisión humana:** depende de la memoria y la atención.
- **husky + lint-staged:** dos paquetes frente a uno.
- **Solo CI:** detecta los problemas tarde, después de generar mucho código.

## Consecuencias

- Respuesta inmediata a la IA tras cada edición; los fallos se corrigen en el momento.
- Los límites de tamaño obligan a dividir pronto, que es el objetivo. Cada excepción requiere un motivo escrito y la
  revisa el revisor.
- Mantener los hooks tiene un coste pequeño: scripts de Node sin dependencias.
