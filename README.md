# SaaS-O-Matic

Herramienta interna para que el equipo comercial simule y presupueste suscripciones SaaS multi-divisa para
clientes corporativos: alta de clientes con validación fiscal, simulación por tramos con impuestos y conversión de
divisas en tiempo real.

> **Demo pública:** <https://saas-o-matic.codeserviceapi.es>, con datos ficticios que se regeneran cada día. Admite
> 5 escrituras por minuto e IP.
>
> **Estado:** funcionalidad completa y demo publicada; falta el cierre. Hechas las partes P0 a P11:
>
> - monorepo, herramientas de calidad y CI;
> - reglas de negocio del dominio: precios por tramos, impuestos, identificador fiscal y conversión de divisas;
> - API y web: alta de cliente → detalle → simulador → guardar → historial (con el desglose por tramo);
> - dashboard con métricas, búsqueda y paginación (las dos en la URL) y datos de ejemplo;
> - divisas con caché, indicador de estado y la elegida recordada al recargar;
> - robustez: seguridad, estados de error, 360 px y accesibilidad;
> - Docker Compose con nginx, e2e contra esa pila y prueba de humo del arranque en Linux, Windows y macOS;
> - la demo pública: el CI prueba sus imágenes, las publica en GHCR y el servidor las descarga.
>
> Falta el cierre: README final, prueba desde un clon limpio y revisión (P12). Detalle en el
> [plan de implementación](ai-workspace/04-plan-implementacion.md).

## Requisitos

- **Node.js** `^22.22.3 || ^24.15.0 || >=26.0.0` (recomendado: la versión de [`.nvmrc`](.nvmrc), Node 26).
- **npm** 10 o superior.
- No hace falta compilar nada nativo: el driver de SQLite trae binarios para Windows, macOS y Linux.

## Arranque en local

```bash
npm ci
npm run setup
npm run dev
```

- `setup` crea la base de datos local (`apps/api/data/`) con 25 clientes ficticios y sus simulaciones. Si ya tiene
  clientes, no hace nada.
- API: <http://localhost:3000/health>
- Web: <http://localhost:4200> (reenvía `/api/*` a la API)
- Para volver a los datos de ejemplo, **con `npm run dev` parado**: `npm run db:reset` (borra la base local y la
  vuelve a sembrar). Ninguno de los dos comandos funciona con `NODE_ENV=production`.

## Con Docker Compose

Alternativa al arranque con npm: la misma aplicación servida como en producción, con nginx delante de la API.

```bash
docker compose up --build -d
```

- Aplicación: <http://localhost:8080> (la API, en <http://localhost:8080/api/health>).
- Para pararla: `docker compose down` (con `-v` se borran también los datos).
- Los contenedores no corren como root, tienen el sistema de ficheros en solo lectura salvo el volumen de datos, y
  el puerto solo se publica en `127.0.0.1`. La API no publica ninguno: solo se llega a ella a través de nginx.
- No puede estar levantada a la vez que la pila de e2e (`npm run e2e:stack`): las dos usan el puerto 8080 y la misma
  subred fija de Docker.

## e2e

Con Docker en marcha:

```bash
npm run e2e:stack
npm run e2e
npm run e2e:stack:down
```

- `e2e:stack` levanta la pila de Compose como un proyecto aparte, con una base de datos vacía y límites de peticiones
  más altos, y espera a que esté sana. `e2e` ejecuta Playwright (Chromium) contra ella, con la CSP real.
- La primera vez, `npx playwright install chromium` descarga el navegador.
- `npm run e2e:dev` ejecuta los mismos tests sin Docker, salvo los que solo tienen sentido contra la pila
  (`@prod-only`: cabeceras, CSP e IP real). Playwright arranca su propia API (puerto 3100, con SQLite en memoria) y
  su propio `ng serve` (puerto 4300): no toca la base de desarrollo y puede ejecutarse con `npm run dev` arrancado.
- `npm run e2e:smoke` es la prueba de humo del arranque (AC-95): lanza `npm run dev` y comprueba `GET /health` y el
  dashboard con los datos de ejemplo. Necesita los puertos 3000 y 4200 libres y la base recién creada con
  `npm run setup`.
- `npm run e2e:demo` prueba la pila de la demo pública (AC-61: aviso, datos de ejemplo, límite de escrituras y
  reinicio) en el puerto 4010. Cómo levantarla:
  [`07-tests.md`](ai-workspace/03-arquitectura/07-tests.md).

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
| `npm run setup`                         | Crea la base de datos local con los datos de ejemplo (si está vacía).                                              |
| `npm run dev`                           | Paquetes en modo watch, API y web a la vez.                                                                        |
| `npm run db:reset`                      | Borra la base de datos local y la vuelve a sembrar (con la API parada).                                            |
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
apps/web            Angular 22 + Tailwind 4 (y su nginx, en apps/web/nginx)
e2e                 tests de extremo a extremo con Playwright
tools/, scripts/    configuración de lint, comprobaciones del repo y hooks
ai-workspace/       proceso con IA: análisis, especificación, arquitectura, decisiones, prompts y diario
```

## Cómo se ha construido

Todo el proceso (análisis, especificación, arquitectura, plan, decisiones, prompts literales y diario de
desarrollo) está en [`ai-workspace/`](ai-workspace/). Las reglas que sigue la IA están en [`CLAUDE.md`](CLAUDE.md).
