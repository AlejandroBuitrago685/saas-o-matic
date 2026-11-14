# 27 · P13: recorrido visual para los evaluadores

## Mensaje 1

Parte P13: recorrido visual para los evaluadores. Lee CLAUDE.md, la nota de traspaso del diario (tras P12), GUIA-EVALUADOR.md, ai-workspace/README.md, el README y 10-diseno-visual.md. P12 ya está fusionada (PR #20) y main está en verde.

Apruebo D-180: regístralo.

Qué quiero: una página HTML interactiva que explique el proyecto entero de forma muy visual, que no canse y que aporte valor a quien evalúa. Tiene que dejar claro qué hace la aplicación, cómo está construida, dónde está cada cosa en el repositorio y cómo se ha trabajado con la IA. Complementa a la guía, no la sustituye.

Contenido, como un recorrido y en este orden:
1) Portada: qué es en una frase, tres o cuatro cifras clave y botones a la demo, al repositorio y para empezar el recorrido.
2) El producto como un flujo: el camino del comercial (dashboard, alta con validación fiscal, detalle, simulador con tramos, impuestos y divisa, guardar, historial). Cada paso se despliega con su captura, la regla de negocio con un ejemplo con números reales, los ficheros que la implementan y los tests que la cubren. Si te faltan capturas, añádelas al spec de npm run capturas, como dice la nota de traspaso.
3) Cómo viaja una petición: un diagrama de la arquitectura (navegador, Cloudflare, nginx, API Fastify, contrato Zod, dominio, SQLite y la llamada de divisas). Al pulsar cada pieza se ve qué hace, qué control de seguridad aplica ahí y en qué fichero está.
4) Mapa del repositorio: un árbol interactivo con 25 a 35 carpetas y ficheros importantes, no todos. Cada uno con una línea de para qué sirve, cuándo merece la pena abrirlo y el enlace a GitHub. Que se pueda filtrar por interés: negocio, seguridad, tests y proceso con IA.
5) Cómo se construyó: la línea de tiempo de P0 a P13 (el objetivo, la PR y una decisión destacada de cada parte) y el ciclo de cada parte (plan, TDD, revisor, documentación, PR y CI).
6) Calidad: el pipeline del CI, los tests por capa y la trazabilidad.
7) Dónde intervine yo: los diez momentos de ai-workspace/README.md, en tarjetas, con el mismo texto de fondo y sin exagerarlos.
8) Requisitos y evidencias: la tabla de GUIA-EVALUADOR.md, con buscador. Léela de ese fichero al generar los datos; no la copies a mano.
9) Recorridos de 5, 15 y 60 minutos, como listas que se pueden marcar, con los tiempos medidos en el clon limpio.
Un extra, solo si sale barato y limpio: un mini simulador de tramos en la propia página que use el paquete domain compilado, no una copia de su lógica. Si no es así, no lo hagas.

Diseño:
- la identidad visual de la aplicación (lavanda y Montserrat), para que parezca parte del mismo producto;
- textos cortos y el detalle desplegable: mucho diagrama y poco párrafo;
- animaciones suaves, que respeten prefers-reduced-motion;
- accesible (teclado, lector de pantalla y contraste AA) y usable a 360 px;
- si tienes la skill impeccable, úsala para el diseño y para la revisión visual.
Punto de control: antes de construir todas las secciones, termina la portada y la sección del flujo del producto y enséñame capturas a 1280 y a 360 px. Sigue solo cuando apruebe la dirección visual.

Reglas técnicas:
- en docs/recorrido, sin CDNs ni rastreadores y con una CSP estricta. Tiene que funcionar abierta en local y publicada;
- se publica en GitHub Pages con un workflow que solo corre en main. La activación de Pages en los ajustes del repositorio me la pides a mí;
- nada inventado: cada cifra y cada tabla salen de un script que lee el repositorio (npm run recorrido), y un test comprueba que no está desfasado y que cada ruta a un fichero existe. La página tiene que pasar el comprobador de enlaces de npm run check (D-181), o amplíalo para cubrirla;
- ningún dato del servidor (D-99, D-175);
- un e2e de la página: carga sin errores de consola, pasa la comprobación de accesibilidad con axe y funciona a 360 px.

Verificación: enséñame capturas finales a 1280 y a 360 px antes de abrir la PR. Después, el revisor, la documentación de siempre, el prompt literal y una PR. Enlaza la página desde lo alto del README y desde la guía, sin reescribir nada más del README.

Al final, cuando esté fusionada y publicada, propón la etiqueta v1.0.0 y una release de GitHub con los enlaces a la demo y al recorrido. No la crees sin mi aprobación.

Reglas de siempre: primero el plan; el push y el merge me los pides; el CI tiene que estar en verde.

## Mensaje 2

Respuesta a la pregunta de la interfaz: «El mini simulador de tramos: Chrome y Firefox bloquean los módulos ES abiertos desde file://, así que usar el paquete domain compilado en el navegador solo funciona publicado (o servido por http). ¿Cómo lo hago?»

Módulos, con aviso local (Recomendado)

## Mensaje 3

Apruebo el plan, con cuatro ajustes:

1) Raíz de Pages: añade un docs/index.html mínimo que lleve a recorrido/, para que .../saas-o-matic/ no dé un 404. Que cumpla la misma CSP y el comprobador de enlaces.

2) Las cifras de la portada tienen que cuadrar con la guía: si das 83 criterios de aceptación, di también que 81 tienen test y 2 son de revisión (AC-94 y AC-99).

3) A 360 px, el diagrama de arquitectura pasa a vertical. No lo encojas ni obligues a desplazar en horizontal. Inclúyelo en las capturas del punto de control si ya lo tienes, o en las finales si no.

4) Acepto las 4-5 h. Si el simulador o alguna sección se complica, avísame y lo recortamos antes de alargar la parte.

Lo demás, tal cual: la rama nueva desde origin/main, primero los riesgos y el punto de control con capturas a 1280 y 360 px. Te activo Pages cuando me lo pidas.

## Mensaje 4

Apruebo la dirección visual: la portada, la identidad y la estructura de cada paso (la regla, dónde está y qué lo prueba) están muy bien. Sigue con estos ajustes:

1) Las capturas del flujo no se leen: se ve la pantalla entera reducida. En cada paso, muestra un recorte ampliado de lo que importa (por ejemplo, el buscador con un par de tarjetas, el error del identificador fiscal o el desglose por tramos), legible a 1280 y a 360 px, con un enlace a la captura completa. Genera los recortes con el spec de capturas, no a mano.

2) Que se sienta como un flujo: encima de los desplegables, una franja con los 7 pasos conectados (icono y nombre). Al pulsar uno se abre su paso y la página se desplaza hasta él. A 360 px puede ir en vertical o en una fila con desplazamiento propio, pero sin desplazamiento horizontal de la página.

3) En el paso 4 (simulador), pon el mini simulador en vivo en lugar de la captura, porque ahora repite los 810,70 € de la portada. Con file://, la captura y el aviso.

4) Menor: a 360 px, las cuatro cifras de la portada en una cuadrícula de 2x2.

Después, sigue con las secciones 3 a 9 como en el plan, y pásame las capturas finales a 1280 y a 360 px antes de la PR.

## Mensaje 5

I hit my usage limit while you were working, but it has reset now. Please continue from where you left off.

## Mensaje 6

Sí, push y PR

## Mensaje 7

Sí, Auto-fix

## Mensaje 8

Pages ya está activado y publicado: el asesor ha comprobado la URL, la redirección de la raíz, las capturas y el simulador en vivo, sin errores de consola. Apruebo D-186 y D-187: regístralas. Completa la fila de P13 en la tabla «Partes y PR» con la PR #21. Después, propónme la etiqueta v1.0.0 y el texto de la release (enlaces a la demo, al recorrido y a la guía del evaluador) antes de crearlas.

## Mensaje 9

Antes de la PR, una corrección. El número de tests está desactualizado: la release y la portada del recorrido dicen 1 378 (1 085 de Node y 293 de la web), que es la medición de P12, antes de los tests que añadió P13.

El asesor ha repetido la prueba en un clon limpio de main (c1c9890), siguiendo el README: git clone 2 s, npm ci 53 s, npm run setup 6 s, npm run dev listo en 13 s (API y web en 200 y el dashboard sin errores de consola), y npm test en 44 s con 1 222 tests de Node y 293 de la web, 1 515 en total, todos en verde.

1) Registra esa comprobación en el diario como la medición vigente del clon limpio, junto a la de P12.
2) Haz que el recorrido lea las cifras de la medición más reciente y no de la de P12, regenera la página y comprueba que su test de frescura pasa. Revisa si la guía o el README citan también 1 378 o 1 085 y corrígelo.
3) En el texto de la release, pon 1 515 tests (1 222 de Node y 293 de la web).

Con eso, apruebo el texto de la release y la etiqueta v1.0.0 sobre el commit que deje el merge de esta PR. Pídeme el merge con el CI en verde; la etiqueta y la release, créalas después.
