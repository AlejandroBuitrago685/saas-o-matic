# CLAUDE.md — SaaS-O-Matic

Herramienta interna para que el equipo comercial simule y presupueste suscripciones SaaS
multi-divisa para clientes corporativos. Es una prueba técnica: el proceso de ingeniería
(planificación, criterio técnico y control de calidad) se evalúa tanto como el código.

- Enunciado: `ai-workspace/00-enunciado.md`
- Análisis de requisitos: `ai-workspace/01-analisis.md`
- Especificación: `ai-workspace/02-especificacion/` (empezar por su `README.md`)
- Registro de decisiones, supuestos y preguntas para negocio: `ai-workspace/decisiones.md`
- Prompts literales del usuario: `ai-workspace/prompts/`

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
6. **Prompts como evidencia:** cada prompt del usuario se guarda literal en `ai-workspace/prompts/`, un fichero por
   prompt, numerados en orden (`01-`, `02-`, …).
7. **Registro de decisiones:** toda decisión de diseño se anota en `ai-workspace/decisiones.md` (`D-xx`) con la
   alternativa descartada, el motivo y quién la toma. Las de Claude que requieren validación se marcan como
   `Claude · pendiente`.
8. **Verificar antes de afirmar:** los datos externos (normas, formatos, tipos impositivos, APIs) se contrastan con
   la fuente oficial y se citan. Los vectores de prueba se calculan con un script, nunca de memoria.

## Trazabilidad

Los documentos de fase se numeran (`00-`, `01-`, …). Los transversales (`decisiones.md`, `prompts/`) no llevan número.

| Prefijo | Qué es | Dónde se define |
|---|---|---|
| `RF-xx`, `RNF-xx`, `RNF-SEC-xx` | Requisitos | `01-analisis.md`, `02-especificacion/01-alcance.md`, `02-especificacion/06-seguridad.md` |
| `CL-xx` | Casos límite | `01-analisis.md` §5, `02-especificacion/07-criterios-aceptacion.md` §0 |
| `TV-…` | Vectores de prueba | `02-especificacion/02-reglas-negocio.md`, `02-especificacion/03-validacion-fiscal.md`, `02-especificacion/05-frontend.md` (slider) |
| `AC-xx` | Criterios de aceptación | `02-especificacion/07-criterios-aceptacion.md` |
| `D-xx`, `S-xx`, `PN-xx` | Decisiones, supuestos, preguntas para negocio | `decisiones.md` |

Código y tests referencian estos IDs: cada test cita el `AC-xx` que verifica. La matriz está en
`02-especificacion/08-trazabilidad.md`.

## Stack (decidido)

- Monorepo con npm workspaces.
- Backend: Node.js + TypeScript, Fastify + Zod, SQLite con Drizzle ORM.
- Frontend: Angular (última versión estable: standalone components, signals, nuevo control flow)
  con Tailwind CSS.
- Tests: Vitest (unitarios e integración) y Playwright (e2e).

## Reglas de código

_Pendiente: se definirán al cerrar la fase de arquitectura._
