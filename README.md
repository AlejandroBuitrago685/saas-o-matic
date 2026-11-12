# SaaS-O-Matic

Herramienta interna para que el equipo comercial simule y presupueste suscripciones SaaS multi-divisa para
clientes corporativos: alta de clientes con validación fiscal, simulación por tramos con impuestos y conversión de
divisas en tiempo real.

> **Estado:** en construcción. Esta es la base del proyecto (parte P0: monorepo, herramientas de calidad y CI). Las
> funcionalidades llegan en las partes siguientes del [plan de implementación](ai-workspace/04-plan-implementacion.md).

## Requisitos

- **Node.js** `^22.22.3 || ^24.15.0 || >=26.0.0` (recomendado: la versión de [`.nvmrc`](.nvmrc), Node 26).
- **npm** 10 o superior.
- No hace falta compilar nada nativo: el driver de SQLite trae binarios para Windows, macOS y Linux.

## Arranque en local

```bash
npm ci
npm run dev
```

- API: <http://localhost:3000/health>
- Web: <http://localhost:4200> (reenvía `/api/*` a la API)

## Comandos

| Comando             | Qué hace                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `npm run dev`       | Paquetes en modo watch, API y web a la vez.                                                                        |
| `npm test`          | Tests de dominio, contrato, API, herramientas y web (sin los barridos lentos, D-101).                              |
| `npm run lint`      | ESLint estricto (límites de tamaño, fronteras entre capas, reglas de seguridad).                                   |
| `npm run typecheck` | TypeScript estricto en todos los paquetes.                                                                         |
| `npm run verify`    | Todo lo anterior más formato, comprobaciones del repo, cobertura y build (los pasos del trabajo `quality` del CI). |
| `npm run build`     | Build de producción de paquetes, API y web.                                                                        |

## Estructura

```text
packages/domain     reglas de negocio puras (sin dependencias)
packages/contract   esquemas Zod del contrato de la API
apps/api            API Fastify + SQLite (Drizzle)
apps/web            Angular 22 + Tailwind 4
tools/, scripts/    configuración de lint, comprobaciones del repo y hooks
ai-workspace/       proceso con IA: análisis, especificación, arquitectura, decisiones, prompts y diario
```

## Cómo se ha construido

Todo el proceso (análisis, especificación, arquitectura, plan, decisiones, prompts literales y diario de
desarrollo) está en [`ai-workspace/`](ai-workspace/). Las reglas que sigue la IA están en [`CLAUDE.md`](CLAUDE.md).
