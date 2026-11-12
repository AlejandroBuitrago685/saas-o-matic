<!--
Prompt literal enviado por el usuario a Claude Code (Opus 5.5).
- Fase: 3 · Arquitectura
- Fecha: 2026-11-12
- Contexto: especificación v1.0 aprobada sin decisiones pendientes (commits 72cd2ab y 6fc6745).
El texto que sigue a este comentario es el prompt tal cual se envió, sin editar.
-->

Fase 3: arquitectura. Igual que antes, sin código de producción: solo diseño, documentación y la configuración del entorno de trabajo con la IA.

## Entregables
Todo en `ai-workspace/03-arquitectura/`, un fichero por tema:

1. **Visión general.** Diagrama (Mermaid) de los componentes: SPA Angular, API Fastify, SQLite, paquete compartido y API externa de divisas. Que se vea qué habla con qué y dónde se valida cada cosa.
2. **Estructura del monorepo.** Árbol de carpetas comentado (`apps/api`, `apps/web`, `packages/...`) y reglas de dependencia entre ellos. Restricciones mías:
   - El dominio compartido (tramos, impuestos, redondeo, conversión, validadores fiscales y la función del slider) es TypeScript puro: sin I/O, sin dependencias de framework y con tests unitarios exhaustivos. Lo usan la API y Angular.
   - Valora si los esquemas Zod del contrato deben vivir también en un paquete compartido para que el frontend use los mismos tipos. Dame pros y contras.
3. **Backend.** Organización por módulos de negocio (customers, simulations, catalog, stats, health), con capas claras: rutas (HTTP y validación) → casos de uso → repositorios (Drizzle). Ninguna regla de negocio en las rutas. Explica:
   - cómo se construye la app para poder testearla sin levantar el servidor;
   - cómo se gestionan los errores (RFC 9457), la configuración y los logs.
4. **Base de datos.** Diagrama ER, tablas con sus tipos, restricciones (`CHECK`, `UNIQUE`, claves foráneas), índices justificados por las consultas reales (búsqueda, historial por cliente) y estrategia de migraciones y datos de ejemplo. Decide y justifica:
   - el desglose por tramo de cada simulación: tabla hija o columna JSON;
   - el catálogo (países, tipos, tarifas, planes): tablas sembradas o configuración tipada validada al arrancar;
   - cómo se resuelve la búsqueda sin acentos ni mayúsculas en SQLite;
   - cómo se representan los UUID v7, las fechas y los importes;
   - los pragmas de SQLite (claves foráneas, WAL…).
5. **Driver de SQLite (RT-06).** No lo asumas. Compara las opciones compatibles con Drizzle y comprueba, con una instalación real en una carpeta temporal, que la elegida se instala sin compilar en mi máquina. La matriz de CI y la prueba de Windows y macOS (D-53) cubrirán el resto.
6. **Frontend.** Estructura por features (dashboard y buscador, detalle de cliente, alta, simulador) más `core` y `shared`. Explica:
   - la gestión de estado con signals;
   - dónde viven la divisa seleccionada, los tipos de cambio y el indicador de estado de la API de divisas (D-51);
   - cómo se traducen los `code` de error de la API a mensajes en español;
   - cómo la proyección en tiempo real usa el dominio compartido con los datos de `GET /catalog`.
7. **Estrategia de tests.** Qué se prueba en cada nivel (dominio, integración de la API, componentes, e2e), con qué herramientas, cómo se aíslan la base de datos y la API externa, y cómo se traza cada test hasta su AC o TV.
8. **Despliegue.** Esbozo del Docker Compose y del pipeline de CI (con D-52 y D-53), y dos o tres opciones de hosting para la demo compatibles con D-47. No decidas el hosting todavía.
9. **ADRs.** Un ADR corto por cada decisión con impacto (contexto, decisión, alternativas, consecuencias). Añade al registro de decisiones las que salgan de cada ADR.

## Directrices para la IA (CLAUDE.md)
Amplía el `CLAUDE.md` con las reglas de código. Tiene que ser corto, porque lo lees en cada paso: enlaza a los documentos de arquitectura en lugar de copiarlos. Como mínimo debe incluir:
- **Nivel de exigencia:** trabaja con el estándar de un ingeniero senior. Código mantenible y modular, sin deuda técnica. Si una decisión mía es mala, dímelo antes de ejecutarla. Explica los trade-offs. Nada está terminado sin tests que pasen.
- Reglas de dependencia entre paquetes y capas.
- Límites de tamaño (líneas por fichero y por función, complejidad) y una sola responsabilidad por fichero.
- TypeScript estricto: sin `any`, sin aserciones `!` y con tipos explícitos en las APIs públicas.
- Convenciones de nombres, carpetas, errores y logs.
- Cada dependencia nueva se justifica: para qué sirve, qué alternativas hay y si está bien mantenida.
- Un resumen de las reglas de seguridad de `06-seguridad.md`.
- Tests: TDD en el dominio, cada bug con su test de regresión y cada test cita su AC o TV.
- La definición de "hecho" de cada parte.

Las reglas que se puedan comprobar con herramientas no se quedan en texto. Propón cómo hacerlas cumplir: ESLint con límites de tamaño y fronteras entre capas, TypeScript estricto, hooks de Claude Code que ejecuten lint y typecheck tras cada edición, etc. Se configurarán en la fase de scaffolding; ahora solo quiero el diseño.

Crea también un subagente revisor de solo lectura en `.claude/agents/`. Su trabajo es revisar un cambio contra el `CLAUDE.md`, la especificación y las reglas de seguridad, y devolver los hallazgos ordenados por prioridad. Lo usaremos al cerrar cada parte.

Cuando termines, haz un commit y dame un resumen con las 5 decisiones de arquitectura más importantes y lo que necesitas que valide.
