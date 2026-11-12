<!--
Prompt literal enviado por el usuario a Claude Code (Opus 5.5).
- Fase: 1 · Análisis
- Fecha: 2026-11-12
- Resultado: commit 626ac38 (CLAUDE.md, 00-enunciado.md, 01-analisis.md)
- Adjunto mencionado: el .docx del enunciado (transcrito en ai-workspace/00-enunciado.md).
El texto que sigue a este comentario es el prompt tal cual se envió, sin editar.
-->

Hola. Vamos a resolver juntos una prueba técnica. Te adjunto el enunciado: @"C:\Users\Usuario\Downloads\Prueba Devs con IA (1).docx"

Contexto: es para un puesto de desarrollador que trabaja con IA. Lo que más puntúan es la planificación (35%) y el criterio técnico y control de calidad (25%), por encima del propio código (30%). Así que vamos a trabajar como lo haría un equipo serio: primero entender y especificar, después diseñar, y solo entonces implementar. Yo dirijo y apruebo cada fase; tú ejecutas, propones y me avisas de cualquier cosa que veas mal.

## Stack (ya decidido)
- Monorepo con npm workspaces.
- Backend: Node.js + TypeScript, Fastify + Zod, SQLite con Drizzle ORM.
- Frontend: Angular (última versión estable: standalone components, signals y el nuevo control flow) con Tailwind CSS.
- Tests: Vitest (unitarios e integración) y Playwright (e2e).

La arquitectura detallada la cerraremos en una fase posterior; en este paso no la diseñes.

## Reglas de trabajo para toda la sesión
1. Trabajamos por fases. No escribas código de producción hasta que yo apruebe la especificación de esa parte.
2. No inventes reglas de negocio. Si algo es ambiguo, pregúntame. Si necesitas asumir algo para avanzar, márcalo como SUPUESTO y regístralo para que yo lo valide.
3. Todo lo que diseñemos se documenta en `/ai-workspace`, que también es un entregable.
4. Idioma: documentación en español; código, nombres y commits en inglés (Conventional Commits).
5. Al terminar cada paso, dame un resumen corto: qué has hecho, qué has decidido y qué dudas quedan.

## Lo que quiero en este paso (sin código)
1. Comprueba qué versiones de Node y npm tengo instaladas y avísame si hay que actualizar algo para este stack.
2. Inicializa git en esta carpeta y crea un `CLAUDE.md` mínimo con las reglas de trabajo de arriba. Lo ampliaremos con reglas de código cuando cerremos la arquitectura.
3. Pasa el enunciado a `ai-workspace/00-enunciado.md`, fiel al original, para tenerlo versionado.
4. Escribe `ai-workspace/01-analisis.md` con:
   - Los requisitos desglosados, cada uno con un ID (RF-01, RF-02… funcionales; RNF-01… no funcionales), para poder trazarlos hasta el código y los tests al final.
   - Ambigüedades y huecos del enunciado, cada uno con tu propuesta de resolución, pero sin darla por cerrada.
   - Casos límite que habrá que cubrir (tramos, validación fiscal, divisas, etc.).
   - Riesgos técnicos.
5. Termina tu respuesta con una lista numerada de las preguntas que necesitas que te responda antes de escribir la especificación.

Cuando termines, haz un commit.
