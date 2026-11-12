# CLAUDE.md — SaaS-O-Matic

Herramienta interna para que el equipo comercial simule y presupueste suscripciones SaaS
multi-divisa para clientes corporativos. Es una prueba técnica: el proceso de ingeniería
(planificación, criterio técnico y control de calidad) se evalúa tanto como el código.

- Enunciado: `ai-workspace/00-enunciado.md`
- Análisis de requisitos: `ai-workspace/01-analisis.md`

## Reglas de trabajo

1. **Trabajo por fases.** No se escribe código de producción de una parte hasta que su
   especificación esté aprobada explícitamente por el usuario.
2. **No inventar reglas de negocio.** Ante una ambigüedad, preguntar. Si hace falta asumir algo
   para avanzar, marcarlo como `SUPUESTO` y registrarlo en la documentación de la fase para que
   el usuario lo valide.
3. **Todo lo diseñado se documenta en `/ai-workspace`**, que también es un entregable.
   Los ficheros se numeran por fase (`00-`, `01-`, …).
4. **Idioma:** documentación en español; código, identificadores y mensajes de commit en inglés,
   siguiendo [Conventional Commits](https://www.conventionalcommits.org/).
5. **Cierre de cada paso:** resumen corto con qué se ha hecho, qué se ha decidido y qué dudas quedan.

## Trazabilidad

Los requisitos tienen ID (`RF-xx` funcionales, `RNF-xx` no funcionales) definidos en
`ai-workspace/01-analisis.md`. Specs, código y tests deben referenciar esos IDs.

## Stack (decidido)

- Monorepo con npm workspaces.
- Backend: Node.js + TypeScript, Fastify + Zod, SQLite con Drizzle ORM.
- Frontend: Angular (última versión estable: standalone components, signals, nuevo control flow)
  con Tailwind CSS.
- Tests: Vitest (unitarios e integración) y Playwright (e2e).

## Reglas de código

_Pendiente: se definirán al cerrar la fase de arquitectura._
