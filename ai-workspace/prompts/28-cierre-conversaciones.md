# 28 · Cierre de la entrega: conversaciones con la IA y README

Prompts literales de la sesión de cierre (2026-11-14), en orden. Literal, salvo los fragmentos marcados
«[Omitido: detalle del servidor privado]» (D-175, D-189): los que describen el servidor privado de la demo, como las listas de
palabras de alerta del fichero privado.

## Mensaje 1

Cierre de la entrega: conversaciones con la IA y un README a prueba de novatos. Lee CLAUDE.md, la última nota de traspaso del diario, ai-workspace/README.md y el enunciado (sección 3, "Interacción real": pide hilos de conversación). Main está en verde y la etiqueta v1.0.0 existe, pero aún no se ha entregado.

1) Conversaciones en ai-workspace/conversaciones/.
- Fuentes: las sesiones de construcción de este equipo, en ~/.claude/projects/C--Users-Usuario-Desktop-Proyectos-Web-saas-o-matic/*.jsonl (14 ficheros, del 13 y el 14 de noviembre), y los zips exportados de la otra cuenta (fases de análisis, especificación y arquitectura, del 12 de noviembre), que dejo en la carpeta que te indicaré. Antes de nada, enséñame qué sesión es cada fichero (fecha, parte y primer mensaje) y no conviertas nada hasta que lo confirme.
- Un script reproducible (scripts/conversaciones/, que recibe las rutas como argumentos) convierte cada sesión a un Markdown legible: mis mensajes y las respuestas de Claude en texto completo; cada llamada a una herramienta, en una sola línea con su nombre y su descripción, sin su salida; sin los recordatorios del sistema ni los mensajes internos. Los subagentes, solo como una línea con su resultado (por ejemplo, el veredicto del revisor).
- Datos que se tapan con una marca visible, por ejemplo [Omitido: detalle del servidor privado]. Siguen D-99 y D-175:
  - [Omitido: detalle del servidor privado]
  - cualquier email que no sea noreply, tokens y claves;
  - [Omitido: detalle del servidor privado]
  - las rutas locales de Windows se acortan a ~.
- Un test en tools/ recorre ai-workspace/conversaciones/ y falla si encuentra una IP, un email que no sea noreply, una ruta del servidor o uno de esos nombres de host. Pruébalo primero con una copia sin tapar para ver que falla.
- Un README en esa carpeta: una tabla con cada sesión (fecha, parte, modelo si consta, enlace a su prompt literal y a su PR) y, debajo, entre 8 y 12 momentos clave con enlace directo a su punto de la conversación. Entre ellos, los diez de "Dónde intervine yo". Que el evaluador pueda leer lo importante sin abrir ficheros de miles de líneas.
- Antes de hacer commit, enséñame el resultado de una sesión completa, la de P11 por ser la que más datos del servidor tiene, para que revise cómo queda.
- Si el total supera unos 15 MB, dímelo antes de seguir.

2) Cambia "las transcripciones se entregan aparte" en el README y en ai-workspace/README.md por un enlace a ai-workspace/conversaciones/. Regenera el recorrido si alguna de sus fuentes cambia, y comprueba que su test de frescura pasa.

3) Sección "Si algo falla" en el README, de tres o cuatro líneas, justo después del arranque rápido:
- si npm ci da EBADENGINE, la versión de Node no es compatible: instala Node 24 LTS desde nodejs.org o usa nvm install, que lee el .nvmrc;
- los puertos 3000 y 4200 tienen que estar libres;
- en Windows, si PowerShell no deja ejecutar npm, usa CMD o Git Bash;
- sin internet la app funciona, pero no hay tipos de cambio: lo indica en la cabecera y sigue en euros.

4) Revisor, diario, decisiones, el prompt literal y una PR. El merge me lo pides con el CI en verde.

5) Después del merge, recoloca la etiqueta: borra la release y la etiqueta v1.0.0 y créalas de nuevo sobre el commit del merge, con el mismo texto (cada párrafo y cada elemento de lista en una sola línea) y una línea más en "Qué entrega": las conversaciones con la IA en ai-workspace/conversaciones/. Pídeme confirmación antes de borrar nada.

Reglas de siempre: primero el plan; el push y el merge me los pides; ningún dato del servidor en el repositorio.

## Mensaje 2 · Respuestas a las preguntas del plan

- **La sesión 45aec011 de este equipo (12/11 08:47 → 13/11 09:25) ya contiene las fases de análisis, especificación, arquitectura y plan, además de P0–P3. ¿Qué hay en los zips de la otra cuenta?** → No hay zips de la otra cuenta ni hay que añadir nada más. Las fases ya están en 45aec011. Convierte solo las sesiones de construcción de este equipo, sin ninguna conversación de asesoría.

- **Al tapar las IP, ¿también se tapan las que no revelan nada: 127.0.0.1, ::1, 0.0.0.0 y los rangos de documentación (192.0.2.x, 198.51.100.x, 203.0.113.x y 2001:db8::)?** → Déjalas visibles: 127.0.0.1, ::1, 0.0.0.0 y los rangos de documentación. Deja también la subred de Docker del proyecto (172.30.0.0/24), porque ya es pública en los docker-compose del repositorio y sin ella no se entiende la discusión de TRUST_PROXY. Las demás se tapan.

- **La release v1.0.0 dice «187 decisiones» y «1 515 tests», y esta PR añade D-188, D-189 y tests nuevos. ¿Qué hago con esas cifras al recrearla?** → Actualizarlas (Recomendado)

- **En «Si algo falla», el .nvmrc instala Node 26, y en noviembre de 2026 la 26 debería ser la LTS activa y la 24 estar en mantenimiento (lo compruebo en el calendario oficial). ¿Qué versión nombra el README?** → La LTS actual (Recomendado)

## Mensaje 3 · Aprobación del plan con un ajuste en la privacidad

Apruebo el plan con un ajuste en la privacidad: las omisiones de D-175 no pueden depender solo de una revisión manual.

1) El fichero privado (fuera del repositorio) lleva tres categorías de términos:
- [Omitido: detalle del servidor privado]
- nada más: ningún dato real dentro del repositorio.

2) La autocomprobación del script falla si una palabra de alerta aparece en un párrafo que no esté omitido ni aprobado expresamente. Cada párrafo con alerta se resuelve en omissions.json de una de dos formas: se omite con «[Omitido: detalle del servidor privado]» o se marca como revisado y seguro, con el mismo identificador por hash. No queda ningún párrafo con alerta sin decidir.

3) En el plan de P11 que va dentro del desplegable, las secciones [Omitido: detalle del servidor privado] se omiten enteras, como ya se hizo en el prompt literal.

4) En el punto de control, además de la conversación de P11 completa, enséñame la lista de todos los párrafos con alerta de las 11 conversaciones, con la decisión de cada uno (omitido o seguro), para revisarla.

El resto del plan, tal cual.

## Mensaje 4

(Aprobación del plan en la interfaz de modo plan, sin texto.)

## Mensaje 5 · Enviado a mitad de turno

Un detalle más: en el prompt literal de esta tarea (prompts/28-…), sustituye la lista de palabras de alerta de mi mensaje por «[Omitido: detalle del servidor privado]», como en el prompt 24. El resto del prompt, literal.

## Mensaje 6 · Automático de la app, tras el límite de uso

I hit my usage limit while you were working, but it has reset now. Please continue from where you left off.

## Mensaje 7 · Cambio de criterio

Cambio de criterio, más estricto: en todo lo que se entrega no debe verse nada del servidor. Solo que la demo está desplegada en mi VPS privado.

1) Se queda, en términos genéricos, el diseño del despliegue de la demo: Cloudflare delante, un proxy inverso con TLS, contenedores que solo escuchan en local, TRUST_PROXY e IP real, el límite de escrituras, el reinicio diario y las imágenes de GHCR. Es contenido del proyecto.

2) Sale todo lo que describa el servidor en sí:
- [Omitido: detalle del servidor privado]

3) Las marcas de omisión no pueden describir lo que tapan. Todas pasan a ser idénticas: «[Omitido: detalle del servidor privado]». Esto incluye las que ya existen en los prompts (24 y siguientes), en las conversaciones y en cualquier documento.

4) Alcance: README, GUIA-EVALUADOR, todo ai-workspace (análisis, especificación, arquitectura con 08-despliegue, plan, decisiones con D-99 y D-175, diario, prompts y conversaciones), docs/recorrido (regenera) y los comentarios de deploy/. Reescribe D-175 sin mencionar [Omitido: detalle del servidor privado]: «los documentos y los prompts literales omiten los detalles del servidor privado de la demo». No toques lo que no es del servidor: los tipos de cambio «caducados», el puerto 80 interno del contenedor de nginx o las debilidades de diseño de la sección de producción (D-171, D-173 y D-176).

5) [Omitido: detalle del servidor privado]

6) Fuera del repositorio: revisa también las descripciones de las PR ya fusionadas (por ejemplo, la #17 y la #18) y quita con gh pr edit lo que describa el servidor [Omitido: detalle del servidor privado]. No reescribas el historial de git ni los mensajes de commit; anota en D-189 que lo anterior sigue en el historial y por qué no se reescribe.

Antes del commit, enséñame la lista de cambios por fichero y una búsqueda final de estos términos en todo lo entregable.

## Mensaje 8 · Aprobación del resultado, con una corrección

Lo he revisado: apruebo el resultado. Una sola corrección: en 10-p12.md (hacia la línea 487) queda la frase «[Omitido: detalle del servidor privado]». Omite esa frase con la marca, y añade «[Omitido: detalle del servidor privado]» a la búsqueda literal del escáner para que no vuelva a pasar.

Después, adelante: corrige las descripciones de las PR #3 y #18 con gh pr edit, y sigue con el revisor, la medición en un clon limpio, el commit, el push y la PR. El merge me lo pides con el CI en verde, y antes de recolocar v1.0.0 me pides confirmación.
