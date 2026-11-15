# Conversaciones con la IA

Las sesiones de Claude Code en las que se construyó SaaS-O-Matic, del análisis del enunciado a la etiqueta de la
entrega. Están convertidas a Markdown legible ([D-188](../decisiones.md), [D-189](../decisiones.md)):

- **Completo:** mis mensajes y las respuestas de Claude, también los planes que presentó (dentro de un desplegable) y
  mis respuestas a sus preguntas.
- **En una línea, sin su salida:** cada llamada a una herramienta («🔧»). Cada subagente, con el primer párrafo de su
  informe («🤖»); en el revisor, su veredicto.
- **Fuera:** el razonamiento interno, los recordatorios del sistema y las salidas de las herramientas.
- **Tapado:** todo lo que describe el servidor privado de la demo, con una sola marca que no dice qué tapa:
  «[Omitido: detalle del servidor privado]» (D-175). Las rutas de mi equipo se acortan a `~`. Un test,
  `tools/privacy.test.ts`, lo comprueba en cada CI.

Las horas son de Canarias, que en noviembre es UTC+0. Cada turno tiene un encabezado numerado, así que se puede
enlazar. No entran las sesiones de asesoría. La 13 llega hasta la fusión de la PR #25: lo que siguió en la misma
sesión, el redespliegue de la demo y la etiqueta, no entra.

## Las sesiones

| Nº | Fecha | Parte | Modelo | Prompts literales | PR |
|---|---|---|---|---|---|
| [01](01-fases-y-p0-p3.md) | 12/11 08:47 → 13/11 09:25 | Fases 1 a 4 (análisis, especificación, arquitectura y plan) y P0 a P3 | Claude Opus 5.5 | [01](../prompts/01-analisis.md) a [13](../prompts/13-p3-cierre.md) | #1 a #6 |
| [02](02-p4.md) | 13/11 09:27 → 10:52 | P4 · API de la porción vertical | Claude Sonnet 5.5 | [14](../prompts/14-p4-plan.md), [15](../prompts/15-p4-cierre.md) | #7, #8 |
| [03](03-p5.md) | 13/11 10:54 → 11:51 | P5 · Web de la porción vertical | Claude Opus 5.5 | [16](../prompts/16-p5-plan.md), [17](../prompts/17-p5-cierre.md) | #9 |
| [04](04-p6.md) | 13/11 11:55 → 12:43 | P6 · Docker Compose, nginx y e2e | Claude Opus 5.5 | [18](../prompts/18-p6-plan.md) | #10 |
| [05](05-p7.md) | 13/11 15:51 → 17:03 | P7 · Búsqueda, dashboard y seed | Claude Opus 5.5 | [19](../prompts/19-p7-plan.md) | #11 |
| [06](06-p8.md) | 13/11 17:07 → 18:00 | P8 · Divisas | Claude Opus 5.5 | [20](../prompts/20-p8-plan.md) | #12 |
| [07](07-p9.md) | 13/11 18:10 → 19:47 | P9 · Robustez: seguridad, estados, responsive y accesibilidad | Claude Opus 5.5 | [21](../prompts/21-p9-plan.md) | #13, #14 |
| [08](08-p10.md) | 13/11 21:36 → 22:34 | P10 · Should/Could y CI completo | Claude Opus 5.5 | [22](../prompts/22-p10-plan.md) | #15 |
| [09](09-arreglo-ac91-y-p11.md) | 13/11 22:36 → 14/11 09:05 | Arreglo del e2e de AC-91 y P11 · Demo pública | Claude Opus 5.5 | [23](../prompts/23-arreglo-e2e-ac91.md), [24](../prompts/24-p11-plan.md), [25](../prompts/25-p11-despliegue.md) | #16 a #19 |
| [10](10-p12.md) | 14/11 09:17 → 10:37 | P12 · Cierre | Claude Sonnet 5.5 | [26](../prompts/26-p12-cierre.md) | #20 |
| [11](11-p13.md) | 14/11 10:55 → 13:02 | P13 · Recorrido visual para los evaluadores | Claude Opus 5.5 | [27](../prompts/27-p13-recorrido.md) | #21, #22 |
| [12](12-cierre-conversaciones-y-readme.md) | 14/11 13:12 → 22:20 | Cierre: conversaciones con la IA y README | Claude Opus 5.5 | [28](../prompts/28-cierre-conversaciones.md), [29](../prompts/29-readme-destacado.md) | #23, #24 |
| [13](13-rediseno-visual.md) | 14/11 22:54 → 15/11 10:48 | Rediseño visual a partir de tres maquetas | Claude Opus 5.5 | [30](../prompts/30-rediseno-visual.md) | #25, #26 |

Las PR están en la [lista de PR fusionadas](https://github.com/AlejandroBuitrago685/saas-o-matic/pulls?q=is%3Apr+is%3Amerged)
del repositorio, y la tabla «Partes y PR» del [plan](../04-plan-implementacion.md) dice qué parte cerró cada una.

P4 tuvo dos arranques cortados por errores de la API (`ec9694fc` y `e70694f5`). Están enteros dentro de la sesión
`e7d20eb4`, que es la que se convierte.

## Doce momentos clave

Los diez de [«Dónde intervine yo»](../README.md#dónde-intervine-yo), el primer **NO APTO** del revisor y el rediseño,
cada uno con enlace al turno de la conversación en el que ocurrió.

1. **Validación fiscal estricta (D-15).** Rechazo la validación genérica de 2 a 20 caracteres y pido el formato
   oficial de cada país, con su fuente. [01 · turno 3](01-fases-y-p0-p3.md#3--alejandro--1211-0902)
2. **Seguridad con método (D-40).** En el mismo mensaje, el bloque basado en el OWASP API Security Top 10 y un modelo
   de amenazas. [01 · turno 3](01-fases-y-p0-p3.md#3--alejandro--1211-0902)
3. **Un *fallback* que no esconde el error (D-51).** Apruebo la caché de los tipos de cambio con la condición de que
   cada estado se vea y tenga su e2e. [01 · turno 5](01-fases-y-p0-p3.md#5--alejandro--1211-0938)
4. **La CSP, comprobada (D-70).** Pido verificar si el build de Angular inyecta CSS en línea y un e2e que falle ante
   cualquier violación de CSP. [01 · turno 11](01-fases-y-p0-p3.md#11--alejandro--1211-1206)
5. **El flujo de trabajo (D-80, D-82 y D-85).** Una rama y una PR por parte, y hooks rápidos
   ([01 · turno 21](01-fases-y-p0-p3.md#21--alejandro--1211-1323)). Tras el primer NO APTO, `npm install <paquete>` y
   `gh pr merge` pasan a pedir confirmación ([01 · turno 27](01-fases-y-p0-p3.md#27--alejandro--1211-1421)).
6. **El primer NO APTO del revisor, en P0.** Un P0 y cinco P1, y Claude explica por qué había parado sin cerrar la
   parte. [01 · turno 26](01-fases-y-p0-p3.md#26--claude--1211-1415)
7. **La IP real, sin atajos (D-113 y D-130).** Proxies de confianza solo `loopback` y la subred de Docker
   ([01 · turno 67](01-fases-y-p0-p3.md#67--alejandro--1311-0919)); en P6, direcciones exactas y un e2e de suplantación
   ([04 · turno 1](04-p6.md#1--alejandro--1311-1155)).
8. **El diseño, una extensión de roams.es (D-122).** Valido la maqueta con dos ajustes.
   [03 · turno 5](03-p5.md#5--alejandro--1311-1113)
9. **Una contradicción de la especificación (D-142 y D-143).** Claude la detecta y me plantea las salidas
   ([06 · turno 2](06-p8.md#2--claude--1311-1707)), y yo elijo ([06 · turno 3](06-p8.md#3--alejandro--1311-1713)).
10. **No enmendar un criterio para facilitar el código (D-159).** Cambio de idea sobre cortar el email con «…», para no
    tocar AC-84. [08 · turno 5](08-p10.md#5--alejandro--1311-2145)
11. **Parar la línea cuando el CI se pone rojo.** Pido arreglar el e2e inestable de AC-91 en una PR aparte antes de
    seguir con P11, y demostrarlo con repeticiones. [09 · turno 5](09-arreglo-ac91-y-p11.md#5--alejandro--1311-2304)
12. **Una maqueta no manda sobre la especificación (D-191).** Ante el choque de los tramos del total, elijo respetar
    la spec ([13 · turno 3](13-rediseno-visual.md#3--alejandro--1411-2258)). Al aprobar el plan, pido actualizar la spec
    con lo que cambia y que la cabecera no tape media pantalla en el móvil ([13 · turno 7](13-rediseno-visual.md#7--alejandro--1411-2303)).

## Cómo se regeneran

Con el script de [`scripts/conversaciones/`](../../scripts/conversaciones), que recibe las rutas como argumentos:

```bash
node scripts/conversaciones/convert-conversations.mjs --privado <fichero fuera del repositorio> --salida ai-workspace/conversaciones --sesion ~/.claude/projects/<proyecto>/<sesión>.jsonl …
```

- `sessions.json` dice qué sesión es cada fichero, con su título, sus prompts y sus PR.
- El **fichero privado** vive fuera del repositorio, y el script se niega a usar uno de dentro. Lleva los nombres que
  ningún patrón puede encontrar, que se tapan siempre, y las palabras de alerta.
- Cada párrafo que contiene una palabra de alerta tiene su decisión en `omissions.json`: omitido o seguro. Lo
  identifican el UUID de su mensaje y un *hash* de su texto, que no revelan nada.
- El script no escribe nada si queda una alerta sin decidir, una regla que ya no encuentra su párrafo o un dato que
  su propia comprobación detecta.
