# SaaS-O-Matic

Herramienta interna para que el equipo comercial simule y presupueste suscripciones SaaS multi-divisa para
clientes corporativos: alta de clientes con validación fiscal, simulación por tramos con impuestos y conversión de
divisas en tiempo real.

> **Estado:** en construcción. Hechas las partes P0 a P3: monorepo, herramientas de calidad y CI, reglas de negocio
> del dominio y base de la API (contrato, base de datos, seguridad HTTP, `GET /catalog` y `GET /health`). El resto
> llega en las partes siguientes del [plan de implementación](ai-workspace/04-plan-implementacion.md).

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

## API

- **Contrato:** [`04-contrato-api.md`](ai-workspace/02-especificacion/04-contrato-api.md), con los errores en formato
  RFC 9457.
- **OpenAPI:** [`apps/api/openapi.json`](apps/api/openapi.json), generado de los mismos esquemas Zod que validan las
  peticiones. Se regenera con `npm run openapi -w @saas-o-matic/api`, y un test falla si no está al día.
- **Swagger UI**, solo en local: con `npm run dev`, en <http://localhost:3000/docs>. Solo existe con
  `NODE_ENV=development`; ni la demo ni la imagen de producción lo incluyen.

## Comandos

| Comando                                 | Qué hace                                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `npm run dev`                           | Paquetes en modo watch, API y web a la vez.                                                                        |
| `npm test`                              | Tests de dominio, contrato, API, herramientas y web (sin los barridos lentos, D-101).                              |
| `npm run lint`                          | ESLint estricto (límites de tamaño, fronteras entre capas, reglas de seguridad).                                   |
| `npm run typecheck`                     | TypeScript estricto en todos los paquetes.                                                                         |
| `npm run verify`                        | Todo lo anterior más formato, comprobaciones del repo, cobertura y build (los pasos del trabajo `quality` del CI). |
| `npm run build`                         | Build de producción de paquetes, API y web.                                                                        |
| `npm run db:check -w @saas-o-matic/api` | Comprueba que las migraciones versionadas coinciden con el esquema (lo ejecuta el CI).                             |

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
