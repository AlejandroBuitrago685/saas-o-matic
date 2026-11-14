# Guía del evaluador

Tres recorridos según el tiempo que tengas, y una tabla que lleva cada requisito del enunciado a la pantalla donde se
ve y al test que lo comprueba. Lo que no está aquí está en el [`README`](README.md) y en
[`ai-workspace/`](ai-workspace/README.md).

> Para una vista de conjunto antes de empezar, el
> [recorrido visual](https://alejandrobuitrago685.github.io/saas-o-matic/recorrido/) (en local,
> [`docs/recorrido/index.html`](docs/recorrido/index.html)) muestra el producto, la arquitectura y el proceso, con
> esta misma tabla y estos recorridos.

## Recorrido de 5 minutos: la demo

Abre <https://saas-o-matic.codeserviceapi.es>. Los datos son ficticios y se regeneran cada día; admite 5 escrituras por
minuto e IP.

1. **Dashboard** (`/`): 25 clientes (20 por página), las métricas y el buscador. Escribe `nandu`: encuentra «Telefonía Ñandú S.A.» sin
   acento ni mayúsculas.
2. **Detalle de «Acme Ibérica S.L.»**: mueve el slider de usuarios y mira el desglose por tramos (10 × 10 € + 40 × 8 € +
   el resto a 5 €), el impuesto de España y el total.
3. **Divisas**: cambia el selector «Divisa» de la cabecera a GBP o JPY. Los importes se convierten con los tipos de
   `open.er-api.com`, y el indicador de la cabecera dice de qué día son.
4. **Guardar** la simulación: aparece arriba en el historial del cliente.
5. **Nuevo cliente** con país España y el identificador `12345678A` (dígito de control incorrecto): el formulario lo
   rechaza. Con `11111111H` (un DNI válido que no está en los datos de ejemplo) lo acepta; si otro visitante ya lo dio
   de alta, la demo avisa de que está duplicado, que es la otra regla (el par país e identificador es único).
6. Reduce la ventana a 360 px: no hay desplazamiento horizontal.

## Recorrido de 15 minutos: en local, con los tests

Necesitas Node 22 (desde la 22.22.3), 24 (desde la 24.15) o 26 en adelante (el [`.nvmrc`](.nvmrc) recomienda la 26) y
npm 10. No se compila nada nativo: el driver de
SQLite trae binarios.

```bash
npm ci
npm run setup
npm run dev
```

- Web en <http://localhost:4200> y API en <http://localhost:3000/health>. Con `npm run dev`, la documentación
  interactiva de la API está en <http://localhost:3000/docs>.
- Medido en un clon limpio con la caché de npm vacía, `npm ci`, `npm run setup` y `npm test` tardan unos 2 minutos en
  total; el resto del recorrido es leer.
- `npm test`: tests de dominio, contrato, API, herramientas y web.
- `npm run trace`: comprueba que cada criterio de aceptación y cada vector de prueba lo cita algún test.
- Opcional, con Docker: `docker compose up --build -d` y <http://localhost:8080>. Para los e2e, `npm run e2e:stack` y
  `npm run e2e`.

## Recorrido de 60 minutos: el código y el proceso

1. [`ai-workspace/README.md`](ai-workspace/README.md): qué hay en cada carpeta, cómo se trabajó con la IA y dónde
   intervino el responsable del proyecto. Es la mejor entrada al proceso.
2. Del problema a la especificación: [`00-enunciado.md`](ai-workspace/00-enunciado.md),
   [`01-analisis.md`](ai-workspace/01-analisis.md) (ambigüedades y casos límite) y
   [`02-especificacion/`](ai-workspace/02-especificacion/README.md) (reglas, contrato, criterios de aceptación).
3. La arquitectura: [`03-arquitectura/`](ai-workspace/03-arquitectura/README.md) y sus
   [ADR](ai-workspace/03-arquitectura/adr/README.md).
4. Las reglas que seguía la IA y cómo se hacen cumplir: [`CLAUDE.md`](CLAUDE.md), el subagente
   [`revisor`](.claude/agents/revisor.md) y los hooks de [`.claude/settings.json`](.claude/settings.json).
5. El código, de dentro afuera:
   - reglas de negocio puras: [`packages/domain`](packages/domain/src) (empieza por
     [`pricing`](packages/domain/src/pricing) y [`tax-id`](packages/domain/src/tax-id));
   - la API: [`apps/api/src/modules`](apps/api/src/modules) (rutas, casos de uso y repositorios por módulo);
   - la web: [`apps/web/src/app/features`](apps/web/src/app/features);
   - el pipeline: [`.github/workflows/ci.yml`](.github/workflows/ci.yml).
6. El proceso real: [`decisiones.md`](ai-workspace/decisiones.md) (cada decisión con su alternativa descartada y quién la
   tomó) y [`diario.md`](ai-workspace/diario.md) (una entrada por parte, con lo que falló y lo que corrigió el
   revisor).

## Requisitos del enunciado, dónde se ven y qué test los cubre

Cada fila sale de la [matriz de trazabilidad](ai-workspace/02-especificacion/08-trazabilidad.md) (requisito → criterio
de aceptación); la lista completa de criterios está en
[`07-criterios-aceptacion.md`](ai-workspace/02-especificacion/07-criterios-aceptacion.md). Un test comprueba que cada
criterio existe, que la matriz se lo asigna a esos requisitos y que cada fichero enlazado lo cita. Los criterios que
solo se revisan (AC-94 y AC-99) no tienen test: los revisa una persona, y la fila lo dice como «revisión». AC-93 tiene
una parte automática y otra de revisión, y AC-61 (la demo), una parte de revisión además del e2e.

| Requisito del enunciado                                                                | Dónde se ve                                                                                                                             | Criterios                                              | Tests                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta de un cliente corporativo, `POST /customers` (RF-01, RF-06)                       | «Nuevo cliente» → `/customers/new`                                                                                                      | AC-20, AC-26, AC-72                                    | [API](apps/api/src/modules/customers/create-customer.routes.test.ts) · [duplicados](apps/api/src/modules/customers/create-customer.rules.test.ts) · [e2e](e2e/specs/customer-create.spec.ts)                                                 |
| Validación algorítmica del identificador fiscal; España: DNI, NIE y CIF (RF-02, RF-03) | Formulario de alta, con España y `12345678A`                                                                                            | AC-10, AC-11, AC-12, AC-13, AC-14, AC-15, AC-25, AC-73 | [dominio](packages/domain/src/tax-id/validate-tax-id.test.ts) · [API](apps/api/src/modules/customers/create-customer.rules.test.ts) · [e2e](e2e/specs/customer-create.spec.ts)                                                               |
| Simulación de consumo guardada en la base de datos, `POST /simulations` (RF-07, RF-10) | «Guardar simulación» en el detalle del cliente                                                                                          | AC-40, AC-41, AC-46                                    | [API](apps/api/src/modules/simulations/create-simulation.routes.test.ts) · [validación](apps/api/src/modules/simulations/create-simulation.validation.test.ts) · [instantánea](apps/api/src/modules/simulations/simulation-snapshot.test.ts) |
| Facturación gradual por tramos: 10 €, 8 € y 5 € por usuario (RF-08)                    | Desglose del simulador: 15 usuarios son 100 € + 40 €                                                                                    | AC-01, AC-02, AC-03                                    | [dominio](packages/domain/src/pricing/calculate-pricing.test.ts)                                                                                                                                                                             |
| Impuesto del país del cliente, con un único redondeo (RF-09, RNF-04)                   | Líneas «Impuesto» y «Total» de la proyección                                                                                            | AC-04, AC-05                                           | [dominio](packages/domain/src/tax/calculate-tax.test.ts)                                                                                                                                                                                     |
| Base de datos SQLite con persistencia limpia (RNF-02, RNF-06)                          | [Esquema y restricciones](ai-workspace/03-arquitectura/04-base-de-datos.md) y las migraciones de [`apps/api/drizzle`](apps/api/drizzle) | AC-20, AC-93                                           | [API](apps/api/src/modules/customers/create-customer.routes.test.ts) · AC-93: revisión                                                                                                                                                       |
| Buscador por nombre de empresa o identificador fiscal (RF-04, RF-14)                   | Caja de búsqueda del dashboard (`/`)                                                                                                    | AC-29, AC-30, AC-70, AC-71                             | [API](apps/api/src/modules/customers/search-customers.routes.test.ts) · [e2e](e2e/specs/dashboard.spec.ts)                                                                                                                                   |
| Dashboard con el listado (RF-14) y, como extra, las métricas (RF-19)                   | Dashboard (`/`)                                                                                                                         | AC-47, AC-70, AC-92                                    | [API](apps/api/src/modules/stats/stats.routes.test.ts) · [e2e](e2e/specs/dashboard.spec.ts) · [métricas](e2e/specs/dashboard-metrics.spec.ts)                                                                                                |
| Detalle del cliente con tarjetas (RF-05, RF-15)                                        | Un cliente del dashboard → `/customers/:id`                                                                                             | AC-27, AC-75                                           | [API](apps/api/src/modules/customers/get-customer.routes.test.ts) · [e2e](e2e/specs/customer-detail.spec.ts)                                                                                                                                 |
| Historial de simulaciones guardadas (RF-11, RF-17)                                     | «Historial de simulaciones», en el detalle                                                                                              | AC-44, AC-78                                           | [API](apps/api/src/modules/simulations/read-simulations.routes.test.ts) · [e2e](e2e/specs/simulation-save.spec.ts)                                                                                                                           |
| Simulador con slider y proyección en tiempo real (RF-16, RNF-09)                       | «Simulador», en el detalle                                                                                                              | AC-76, AC-77, AC-90, AC-91                             | [e2e](e2e/specs/simulator.spec.ts) · [escala del slider](packages/domain/src/slider/slider-scale.test.ts)                                                                                                                                    |
| Cambio de divisa de visualización (RF-13)                                              | Selector «Divisa» de la cabecera                                                                                                        | AC-79, AC-88                                           | [e2e](e2e/specs/currency-conversion.spec.ts) · [dominio](packages/domain/src/currency/convert-pricing.test.ts)                                                                                                                               |
| Estados de carga y error de la API de tipos de cambio (RF-12, RNF-08)                  | Indicador de la cabecera, con «Reintentar»                                                                                              | AC-80, AC-81, AC-82, AC-85                             | [e2e](e2e/specs/exchange-rates.spec.ts) · [caché](e2e/specs/exchange-rates-cache.spec.ts) · [API caída](e2e/specs/api-down.spec.ts)                                                                                                          |
| Interfaz responsive desde 360 px y accesible (RNF-07, RNF-13)                          | Cualquier vista con la ventana a 360 px                                                                                                 | AC-84, AC-86                                           | [responsive](e2e/specs/responsive.spec.ts) · [accesibilidad](e2e/specs/accessibility.spec.ts)                                                                                                                                                |
| Backend en Node.js + TypeScript con API REST y código modular (RNF-01, RNF-03, RNF-10) | [`apps/api`](apps/api/src) y [`openapi.json`](apps/api/openapi.json)                                                                    | AC-93                                                  | [reglas de lint](tools/eslint-rules.test.ts) · AC-93: revisión                                                                                                                                                                               |
| Extra: tests y CI (RNF-12, RNF-21)                                                     | Pestaña «Actions» del repositorio                                                                                                       | AC-96                                                  | [pipeline](.github/workflows/ci.yml)                                                                                                                                                                                                         |
| Repositorio público y arranque en pocos pasos (RNF-14, RNF-18, RNF-19, RNF-23)         | El [README](README.md)                                                                                                                  | AC-94, AC-95, AC-98                                    | [arranque en limpio](e2e/smoke/clean-start.spec.ts) · [versiones de Node](tools/repo-config.test.ts) · AC-94: revisión                                                                                                                       |
| Carpeta `ai-workspace` con specs, arquitectura y prompts (RNF-15, RNF-16, RNF-17)      | [`ai-workspace/`](ai-workspace/README.md)                                                                                               | AC-99                                                  | AC-99: revisión                                                                                                                                                                                                                              |
| Extra: Docker Compose como alternativa de arranque (RNF-20)                            | `docker compose up --build`                                                                                                             | AC-97                                                  | [pila de producción](e2e/specs/production-stack.spec.ts)                                                                                                                                                                                     |
| Extra: demo pública protegida (RNF-22)                                                 | <https://saas-o-matic.codeserviceapi.es>                                                                                                | AC-61                                                  | [demo](e2e/demo/demo.spec.ts) · AC-61: revisión en vivo                                                                                                                                                                                      |

La seguridad (los RNF-SEC, basados en el OWASP API Security Top 10) no la pide el enunciado y no está en la tabla: tiene
su propio documento, [`06-seguridad.md`](ai-workspace/02-especificacion/06-seguridad.md), con el modelo de amenazas y la
razón de que no haya login ([§3.6](ai-workspace/02-especificacion/06-seguridad.md#36-por-qué-no-hay-login-d-30)).
