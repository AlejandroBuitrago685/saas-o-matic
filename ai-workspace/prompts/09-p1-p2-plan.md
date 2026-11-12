<!--
Prompts literales enviados por el usuario a Claude Code (Opus 5.5).
- Parte: cierre de la publicación de P0 y plan conjunto de P1 y P2 (en modo plan)
- Fecha: 2026-11-12
- Contexto: PR #1 con el CI en verde; plan conjunto de P1 y P2.
- Nota: el mensaje 2 son las respuestas a tres preguntas de Claude (dos opciones elegidas y un texto libre). El plan se
  aprobó con el botón de aprobación, sin texto. El mensaje 3 se envió a mitad de turno.
Son tres mensajes, en orden. El texto de cada uno está tal cual se envió, sin editar.
-->

## Mensaje 1 · Merge de P0 y paso a P1 y P2

Ya he activado «Keep my email addresses private» en GitHub. D-89 aprobada: riesgo aceptado, se revisa en P10. Me quedo con todo lo que añadiste a la protección de main.

Adelante con el merge, con merge commit y borrando la rama remota. Después empezamos P1 y P2: estoy en modo plan, preséntame el plan conjunto.

## Mensaje 2 · Respuestas a las preguntas del plan

- «D-34 dice que el nombre de empresa va "sin caracteres de control". ¿Qué caracteres debe rechazar el dominio?» → **Control y formato (Recommended)**
- «El nombre de empresa admite "de 2 a 200 caracteres" (D-34). ¿Cómo se cuentan, una vez normalizado?» → **Puntos de código (Recommended)**
- «P1 se cerraría hacia las 22:30 (el calendario la ponía a las 20:00). ¿Qué hacemos con P2, que son unas 2 h más?» → texto libre:

La empresa ha confirmado la fecha: jueves 19 a las 23:00 (S-05 resuelto). Mi objetivo es entregar el lunes 16, como muy tarde el martes 17. Hoy cerramos P1, y P2 pasa a mañana viernes a primera hora. Al cerrar P1, recalcula el calendario y los puntos de control con el nuevo margen: jornadas razonables, entrega el lunes 16 y el martes 17 como margen.

## Mensaje 3 · Validación de D-90 a D-93 y condición para P2

Apruebo D-90 a D-93.

Una cosa para P2, que no afecta a P1: el barrido exhaustivo de AC-14 son decenas de millones de validaciones (vectores válidos × caracteres × 65 000 puntos de código). Mídelo antes de dejarlo. Si pasa de unos 2 segundos, el test normal usa un vector válido por país y tipo, más los caracteres peligrosos representativos (homóglifos cirílicos, dígitos de ancho completo, ſ, espacios invisibles…), y el barrido completo pasa a ser un test lento que solo corre en el CI. No quiero que el hook Stop tarde un minuto en cada turno.
