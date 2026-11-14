# ADR · Registros de decisiones de arquitectura

Formato corto: contexto, decisión, alternativas y consecuencias. Cada ADR tiene su entrada `D-xx` en
[`../../decisiones.md`](../../decisiones.md), que es donde se registra la validación del usuario.

| ADR | Decisión | D | Estado |
|---|---|---|---|
| [ADR-001](ADR-001-dominio-compartido-puro.md) | Paquete `domain` en TypeScript puro, compartido por API y web | D-54 | Aceptada |
| [ADR-002](ADR-002-contrato-compartido-zod.md) | Paquete `contract` con esquemas Zod; la web solo importa tipos | D-55 | Aceptada |
| [ADR-003](ADR-003-driver-better-sqlite3.md) | Driver `better-sqlite3` | D-56 | Aceptada |
| [ADR-004](ADR-004-desglose-en-tabla-hija.md) | Desglose por tramo en tabla hija; tablas de solo inserción | D-57 | Aceptada |
| [ADR-005](ADR-005-catalogo-configuracion-tipada.md) | Catálogo como configuración tipada validada al arrancar | D-58 | Aceptada |
| [ADR-006](ADR-006-busqueda-normalizada.md) | Búsqueda con columna normalizada y `LIKE` con escape | D-59 | Aceptada |
| [ADR-007](ADR-007-representacion-y-pragmas.md) | UUID en texto, fechas en milisegundos, importes en céntimos; pragmas | D-60 | Aceptada |
| [ADR-008](ADR-008-proyeccion-en-cliente.md) | Proyección calculada en el navegador con el dominio compartido | D-61 | Aceptada |
| [ADR-009](ADR-009-errores-result-y-manejador-unico.md) | `Result` en el dominio, `AppError` y un único manejador RFC 9457 | D-62 | Aceptada |
| [ADR-010](ADR-010-app-por-factoria.md) | `buildApp(deps)` con inyección manual de dependencias | D-63 | Aceptada |
| [ADR-011](ADR-011-frontend-signals.md) | Stores con signals, `httpResource`, Signal Forms, sin Zone.js y sin estilos de componente | D-64 | Aceptada |
| [ADR-012](ADR-012-origen-unico-proxy-api.md) | Origen único: la SPA llama a `/api` y un proxy quita el prefijo | D-65 | Aceptada |
| [ADR-013](ADR-013-cumplimiento-automatico.md) | Reglas aplicadas con herramientas, hooks y subagente revisor | D-66 | Aceptada |
| [ADR-014](ADR-014-typescript-6-fijado.md) | TypeScript 6.0.x fijado | D-67 | Aceptada |
