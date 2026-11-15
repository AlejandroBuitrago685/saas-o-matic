# 30 · Rediseño visual a partir de tres maquetas

Prompt literal de la sesión del rediseño (2026-11-14 y 2026-11-15). Llegó con tres imágenes adjuntas, que no se
guardan en el repositorio: el dashboard, el alta de cliente en escritorio y a 360 px, y el detalle con el simulador y
el historial.

## Mensaje 1

Rediseño visual de la web inspirado en las tres maquetas adjuntas (dashboard, alta de cliente en escritorio y móvil, y detalle con simulador e historial). Solo cambia la interfaz: la funcionalidad queda intacta.

Contexto de las maquetas: las generé con otra herramienta que solo conocía la especificación, no la aplicación ya construida. Son la dirección visual que quiero (jerarquía, tarjetas, iconos, distribución en columnas y aire), no un plano exacto. No tiene que quedar clavado: tiene que parecerse y verse igual de profesional y acorde con Roams. Por eso:
- todo lo que la app ya tiene y la maqueta no muestra se conserva, con el nuevo estilo (estados, avisos, enlaces, paginación, métricas, la nota del historial, etc.);
- lo que la maqueta inventa y choca con la especificación o con la app se adapta a lo que ya existe; si dudas, pregúntame;
- los textos exigidos por la especificación no cambian: el aviso de demo de spec 05 §2, la atribución «Rates By Exchange Rate API» del pie, los mensajes de error y las etiquetas accesibles. Los textos nuevos de la maqueta que no chocan con nada (un subtítulo, «Impuestos incluidos · EUR», «Ver detalle») se pueden incorporar.

Lee primero CLAUDE.md, la última nota de traspaso del diario, 10-diseno-visual.md, spec 05 (frontend) y los criterios de aceptación de la web. La etiqueta v1.0.0 existe pero aún no se ha entregado.

Qué tomar de las maquetas:
- Dashboard: subtítulo bajo el título; métricas con icono; buscador con icono; tarjetas con el plan arriba a la derecha, etiquetas visibles (identificador fiscal con su tipo, país y fecha de alta) y «Ver detalle»; la paginación al pie.
- Alta: el formulario en dos bloques con icono, «Datos de la empresa» y «Suscripción»; identificador y email en paralelo en escritorio; el botón principal a lo ancho.
- Detalle: en escritorio, tres columnas (datos del cliente, simulador y total); en el simulador, el campo numérico junto a «Usuarios activos», el slider debajo y un recuadro que explica la tarificación acumulativa; el total grande, su desglose por tramo y «Guardar simulación» en el panel del total; el historial en una cuadrícula de tarjetas con el importe «€/mes» destacado.
- Móvil (360 px): todo apilado, la cabecera en dos filas y «Nuevo cliente» a lo ancho, sin desplazamiento horizontal.

Límites técnicos:
- Solo plantillas, clases de Tailwind, tokens de diseño e iconos. No se tocan stores, servicios, rutas, validaciones, el dominio, el contrato ni la API.
- El recuadro de tarificación y los tramos del total salen de los datos del catálogo, no de texto escrito a mano. La maqueta muestra los tres tramos aunque el tercero tenga 0 usuarios. Si la especificación o un criterio dice otra cosa sobre qué tramos se muestran, dímelo antes de cambiarlo.
- Iconos SVG en línea, decorativos con aria-hidden, de un conjunto con licencia MIT o ISC (por ejemplo, Lucide), con la licencia anotada. Sin CDN y sin dependencias nuevas en tiempo de ejecución salvo que lo justifiques. Sin estilos en línea ni estilos de componente: la CSP y ADR-011 no cambian.
- Todos los estados con el nuevo estilo, no solo el feliz: carga, error con «Reintentar», tipos desactualizados, «Refrescando», sin resultados, 404, API caída, errores del formulario y el aviso de cliente creado.
- Contraste AA y todo usable con teclado.

Tests:
- Todos los tests actuales (unitarios, de componente y e2e) tienen que pasar. Un test solo puede cambiar porque cambió la estructura, como un selector, nunca lo que comprueba. Al final, dame la lista de cada test modificado con su motivo.
- Pasan axe, los 360 px, el teclado y el e2e de violaciones de CSP.

Punto de control: haz primero el dashboard y enséñame capturas a 1280 y a 360 px al lado de la maqueta. No sigas con el alta y el detalle hasta que lo apruebe. Usa la skill impeccable si la tienes, para el diseño y para la revisión visual.

Cierre:
- Regenera las capturas (npm run capturas) y el recorrido (npm run recorrido).
- Actualiza 10-diseno-visual.md y registra la decisión, el diario y el prompt literal.
- Revisor y una PR. El merge me lo pides con el CI en verde.
- Después del merge, propónme volver a desplegar la demo con la nueva etiqueta de imagen, siguiendo 08-despliegue §4.4. No toques el servidor sin mi aprobación. Comprueba la demo en vivo.
- Por último, recoloca v1.0.0 sobre ese merge y actualiza la release con las cifras vigentes. Pídeme confirmación antes de borrar nada.

Reglas de siempre: primero el plan; el push y el merge me los pides; ningún detalle del servidor en lo entregable.

## Mensaje 2 · Respuesta a la pregunta del plan

A la pregunta sobre los tramos del total («La maqueta del total muestra «Tramo 3 · 0 × 5,00 € — 0,00 €», pero la
spec 05 §3.4 dice «Solo aparecen los tramos con usuarios»… ¿Qué hago con los tramos del total?»), eligió la opción:

Respetar la spec (Recomendado)

## Mensaje 3 · Aprobación del plan con cuatro ajustes

Apruebo el plan con cuatro ajustes:

1) Actualiza también la especificación, no solo 10-diseno-visual.md: spec 05 §3.3 (las tres columnas desde 1 280 px) y lo que corresponda de D-122 (el título de 32 px), con D-191 enlazando los cambios. Comprueba que ningún criterio de aceptación cambia.

2) La cabecera es sticky: a 360 px, con el aviso de demo, dos filas y «Nuevo cliente» a lo ancho, no puede ocupar media pantalla mientras se desplaza. En móvil, que solo quede fija la primera fila (logotipo y navegación), o ninguna. Compruébalo en las capturas del punto de control.

3) Después de npm run capturas, revisa a ojo los recortes de cada paso del recorrido (D-186): con la nueva distribución pueden quedar mal encuadrados aunque el script no falle. Inclúyelos en las capturas finales que me enseñes.

4) Antes de recolocar v1.0.0, añade a ai-workspace/conversaciones/ esta conversación, y la de la sesión de cierre (conversaciones y README) si no está, con scripts/conversaciones y el fichero privado de siempre, pasando la autocomprobación y el test de privacidad.

El resto, tal cual.

## Mensaje 4 · Punto de control del dashboard

Aprobado, sigue
