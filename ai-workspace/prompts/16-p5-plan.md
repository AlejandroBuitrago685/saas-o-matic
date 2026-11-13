# 16 · Plan de P5 (web de la porción vertical y dirección visual)

## Mensaje 1

Continuamos con SaaS-O-Matic en una sesión nueva. Antes de empezar, lee CLAUDE.md, ai-workspace/04-plan-implementacion.md y la nota de traspaso de ai-workspace/diario.md. No releas la especificación entera: consulta solo lo que necesites para esta parte.

Seguimos con P5, la web de la porción vertical. Antes de la primera pantalla quiero una dirección visual definida, no una plantilla genérica de Tailwind.

Referencia: la web de la empresa, https://roams.es/. SaaS-O-Matic es una herramienta interna de su equipo comercial, así que tiene que parecer una extensión natural de su web: misma familia visual, no una copia.

- Analiza su web y extrae el lenguaje visual: paleta (colores primarios, neutros y de estado), tipografía, escala de tamaños, espaciados, radios de borde, sombras, botones, tarjetas y tono de los textos.
- Conviértelo en design tokens del tema de Tailwind, documentados en 03-arquitectura con una tabla de cada token y su origen en la web de referencia.
- No copies su logo, imágenes, textos ni ficheros. El nombre de la app es SaaS-O-Matic; como mucho, una mención discreta «Prueba técnica para Roams».
- Si su tipografía no es libre, elige la equivalente libre más cercana. Las fuentes se alojan en el propio proyecto, porque la CSP no permite cargarlas de Google Fonts ni de ningún CDN.
- Comprueba el contraste de los colores (WCAG AA) y ajústalos si alguno no llega, explicando el cambio.

Estoy en modo plan: preséntame el plan de P5 con la dirección visual incluida. Protocolo de siempre al cerrar.

## Mensaje 2

(Aprobación del plan en la interfaz de modo plan, sin texto.)

## Mensaje 3 (punto de control visual)

La muestra me encaja: se reconoce la familia de roams.es sin copiarla. Dos ajustes antes de seguir:

1. Tarjeta del cliente: los valores (identificador, país, email, plan, alta) se ven demasiado pequeños. Valores a 14–16 px en el color de texto normal; solo las etiquetas en pequeño y apagado.
2. Cabecera: como en roams.es, navegación a la izquierda («Clientes») y un botón primario «Nuevo cliente» a la derecha, dejando el hueco para el selector de divisa y el indicador de estado de los tipos de cambio que llegan en P8. En móvil, que se recoja sin scroll horizontal.

Ajusta los tokens o componentes que haga falta, borra la muestra y sigue con lo funcional de P5.
