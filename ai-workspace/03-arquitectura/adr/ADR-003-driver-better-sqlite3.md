# ADR-003 · Driver `better-sqlite3`

- **Estado:** propuesta (D-56) · **Fecha:** 2026-11-12

## Contexto

RT-06: si el driver necesita compilar código nativo, la instalación puede fallar en la máquina del evaluador, y eso
afecta al 10 % de README y despliegue. Drizzle 0.45.4 admite `better-sqlite3`, `libsql` y `sql.js`, pero no
`node:sqlite`. Comparativa y pruebas en [`../05-driver-sqlite.md`](../05-driver-sqlite.md).

## Decisión

`better-sqlite3` 13.1.1 con `drizzle-orm/better-sqlite3`:

- Trae binarios precompilados **dentro del paquete** (Node-API) para Windows, macOS y Linux (glibc y musl), en x64 y arm64.
- Instalación real verificada sin compilar en la máquina del usuario.
- SQLite 3.54.1.
- API síncrona.

## Alternativas

- **`@libsql/client`:** viable, pero trae SQLite 3.45.1, depende de un binario por plataforma (sin Windows arm64) y
  su API asíncrona no aporta nada aquí.
- **`sql.js`:** trabaja en memoria y la persistencia en fichero sería un problema propio.
- **`node:sqlite`:** sin driver de Drizzle y experimental en Node 22.

## Consecuencias

- Instalación sin herramientas de compilación en las plataformas habituales. Lo vigilan la matriz de CI y las
  pruebas de humo (D-52, D-53).
- Las consultas bloquean el bucle de eventos mientras duran: medido en pocos ms
  ([`../03-backend.md`](../03-backend.md) §8).
- Las transacciones son síncronas y simples (`db.transaction(fn)`).
