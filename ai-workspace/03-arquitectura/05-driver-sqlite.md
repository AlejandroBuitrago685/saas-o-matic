# 05 · Driver de SQLite (RT-06)

Objetivo: que el evaluador instale el proyecto sin compilar código nativo, en cualquier sistema operativo y con
Node 22, 24 o 26. Decisión en [ADR-003](adr/ADR-003-driver-better-sqlite3.md).

## 1. Opciones compatibles con Drizzle 0.45.4

Comprobado en el campo `exports` de `drizzle-orm@0.45.4`. Hay drivers para `better-sqlite3`, `libsql`, `sql-js`,
`bun-sqlite`, `d1`, `durable-sqlite`, `expo-sqlite`, `op-sqlite` y `sqlite-proxy`. **No hay driver para
`node:sqlite`.** Bun, D1, Durable Objects, Expo y op-sqlite no aplican a una API en Node.

| Criterio | `better-sqlite3` 13.1.1 | `@libsql/client` 0.18.0 | `sql.js` 1.16.0 | `node:sqlite` (Node 22.23.4) |
|---|---|---|---|---|
| Soporte en Drizzle | Directo, con *migrator* | Directo, con *migrator* | Directo | **No hay driver.** Habría que escribir el adaptador sobre `sqlite-proxy`. |
| Binario nativo | Precompilados **dentro del paquete** (`prebuilds/`, Node-API): win32 x64/arm64, darwin x64/arm64, linux x64/arm64 y musl x64/arm64 | Paquetes opcionales por plataforma (`@libsql/win32-x64-msvc`, etc.; sin Windows arm64) | Ninguno (WASM) | Integrado en Node |
| ¿Compila al instalar? | **No** (verificado, §2) | No (verificado) | No | No aplica |
| Versión de SQLite | **3.54.1** | 3.45.1 (fork de libSQL) | Empaquetada en WASM | 3.53.4 |
| API | Síncrona | Asíncrona | Síncrona, **en memoria** | Síncrona |
| Persistencia en fichero | Sí, con WAL | Sí | **No**: hay que exportar la base entera a disco a mano | Sí |
| Estabilidad | Madura y muy usada | Estable, orientada a Turso | Madura, orientada al navegador | Muestra `ExperimentalWarning` en Node 22 |
| Último publish | 2026-11-11 | 2026-09-02 | 2026-11-10 | — |

Descartes:

- **`sql.js`:** trabaja en memoria; la durabilidad y la concurrencia con un fichero serían un problema propio.
- **`node:sqlite`:** sin driver de Drizzle y experimental en Node 22. Se reevaluará cuando Drizzle lo soporte.
- **`@libsql/client`:** es viable. Pierde frente a `better-sqlite3` porque trae un SQLite más antiguo, depende de
  un binario por plataforma (y no hay para Windows arm64) y añade una capa asíncrona que aquí no aporta nada.

## 2. Prueba de instalación real

En la máquina del usuario (Windows 11 x64, Node 22.23.4, npm 10.9.9), cada opción en una carpeta temporal vacía,
con `npm install <driver> drizzle-orm@0.45.4 --foreground-scripts`, el 2026-11-12:

| Driver | Resultado | Tiempo | Evidencia de que no compila |
|---|---|---|---|
| `better-sqlite3@13.1.1` | ✅ Instalado | 20 s | Ningún rastro de `node-gyp`, `prebuild` ni compilador en el log. No existe `build/Release/`. El binario cargado es `prebuilds/win32-x64.node`, que viene dentro del paquete. |
| `@libsql/client@0.18.0` | ✅ Instalado | 10 s | Se instala el paquete opcional `@libsql/win32-x64-msvc`. |
| `sql.js@1.16.0` | ✅ Instalado | 8 s | Sin binario. |

Como el binario de `better-sqlite3` es **Node-API**, su ABI es estable entre versiones de Node: el mismo fichero
sirve para 22, 24 y 26. La matriz de CI (D-52) y la prueba de humo en Windows y macOS (D-53) lo comprobarán en
cada cambio.

## 3. Prueba de funcionamiento con Drizzle

Script ejecutado contra la instalación de `better-sqlite3` (fuera del repositorio):

| Comprobación | Resultado |
|---|---|
| Versión de SQLite | 3.54.1 |
| `journal_mode = WAL`, `foreign_keys = ON`, `synchronous = NORMAL` | Aplicados y leídos de vuelta: `wal`, `1`, `1` |
| Violación de `CHECK` | `SQLITE_CONSTRAINT_CHECK` ✅ |
| Violación de clave foránea | `SQLITE_CONSTRAINT_FOREIGNKEY` ✅ |
| Tipo erróneo en tabla `STRICT` (SQL directo) | `SQLITE_CONSTRAINT_DATATYPE` ✅. Drizzle no puede declarar `STRICT`, ver 04 §5. |
| Consultas Drizzle (`select`, `where` con `sql`, `orderBy`, `limit`) | ✅ |
| **Rendimiento:** 100 000 clientes con nombre normalizado e índice `(company_name_search, id)` | `COUNT` con `LIKE '%fonia%'`: **12,5 ms**; página de 20 con `LIKE` y orden: **8,5 ms**; listado sin búsqueda: **0,5 ms**, usando el índice |
| Escape de comodines | Buscar `100%` con `ESCAPE '!'` → 0 resultados (sin escape devolvería miles) ✅ |

## 4. Riesgos que quedan

| Riesgo | Mitigación |
|---|---|
| Una plataforma sin binario precompilado (p. ej. FreeBSD o Linux armv7) | Caería en `node-gyp`. Fuera del público objetivo; el README lo documenta. |
| Node 26+ con algún cambio de Node-API | La matriz de CI con Node 26 lo detectaría. |
| La API síncrona bloquea el bucle de eventos | Consultas de pocos ms ([`03-backend.md`](03-backend.md) §8). |
