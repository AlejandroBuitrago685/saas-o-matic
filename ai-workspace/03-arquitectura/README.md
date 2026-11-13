# 03 · Arquitectura

| Campo | Valor |
|---|---|
| Estado | **v1.0, aprobada por el usuario con ajustes (2026-11-12):** D-70, D-71 y D-72. |
| Fecha | 2026-11-12 |
| Entradas | [`../02-especificacion/`](../02-especificacion/README.md) (v1.0 aprobada) · [`../decisiones.md`](../decisiones.md) |
| Siguiente fase | Implementación según [`../04-plan-implementacion.md`](../04-plan-implementacion.md), empezando por P0 (scaffolding) |

Define **cómo** se construye lo que la especificación dice que hay que construir. Las decisiones con impacto tienen
su ADR en [`adr/`](adr/) y su entrada `D-xx` en el registro.

## Ficheros

| Fichero | Contenido |
|---|---|
| [`01-vision-general.md`](01-vision-general.md) | Componentes, quién habla con quién y dónde se valida cada cosa. |
| [`02-monorepo.md`](02-monorepo.md) | Árbol de carpetas, paquetes, reglas de dependencia, versiones e inventario de dependencias. |
| [`03-backend.md`](03-backend.md) | Módulos y capas, construcción testeable de la app, errores, configuración y logs. |
| [`04-base-de-datos.md`](04-base-de-datos.md) | Diagrama ER, tablas, restricciones, índices, migraciones y datos de ejemplo. |
| [`05-driver-sqlite.md`](05-driver-sqlite.md) | Comparativa de drivers y prueba de instalación real (RT-06). |
| [`06-frontend.md`](06-frontend.md) | Features, estado con signals, divisas, errores y proyección en tiempo real. |
| [`07-tests.md`](07-tests.md) | Estrategia por niveles, aislamiento y trazabilidad hasta AC y TV. |
| [`08-despliegue.md`](08-despliegue.md) | Arranque local, Docker Compose, pipeline de CI y opciones de hosting de la demo. |
| [`09-calidad-y-automatizacion.md`](09-calidad-y-automatizacion.md) | Cómo se hacen cumplir las reglas de código con herramientas, hooks de Claude Code y subagente revisor. |
| [`10-diseno-visual.md`](10-diseno-visual.md) | Dirección visual a partir de roams.es: tokens con su origen, contraste AA, componentes base, tipografía autoalojada y tono (P5). |
| [`adr/`](adr/) | Un ADR por decisión con impacto (ADR-001…014). |

## Las cinco decisiones con más impacto

1. **Dominio compartido puro** (ADR-001): una sola implementación de tramos, impuestos, conversión, validadores
   fiscales y slider, usada por la API y por Angular.
2. **Proyección calculada en el navegador** con ese dominio y los datos de `GET /catalog` (ADR-008). El servidor
   recalcula al guardar. Así se elimina la divergencia de RT-02 sin hacer una llamada a la red por cada movimiento del slider.
3. **`better-sqlite3`** como driver (ADR-003): se instala sin compilar en las seis plataformas habituales, y está
   verificado con una instalación real.
4. **La base de datos como última línea de defensa** (ADR-004, ADR-005, ADR-007): `CHECK`, `UNIQUE`, claves foráneas
   y triggers que hacen las tablas de solo inserción.
5. **Origen único con proxy `/api`** (ADR-012): sin CORS en el uso normal, CSP `connect-src 'self'`, y la API conserva
   sus rutas literales.
