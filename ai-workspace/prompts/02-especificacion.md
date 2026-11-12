<!--
Prompt literal enviado por el usuario a Claude Code (Opus 5.5).
- Fase: 2 · Especificación
- Fecha: 2026-11-12
- Contexto: respuesta del usuario a las 20 preguntas de ai-workspace/01-analisis.md §8.
El texto que sigue a este comentario es el prompt tal cual se envió, sin editar.
-->

Buen análisis. Lo he revisado entero; abajo van mis respuestas a tus 20 preguntas y algunas correcciones.

## Respuestas
1. **Usuarios:** de acuerdo, entero de 1 a 10 000. En la interfaz, slider y campo numérico sincronizados.
2. **Almacenamiento y llamadas a la API:** de acuerdo, solo informativos y sin efecto en el precio, con las unidades y topes que propones. Regístralo también como pregunta abierta para negocio.
3. **Planes:** catálogo cerrado y descriptivo: `STARTER`, `BUSINESS`, `ENTERPRISE`. No afectan al precio. Márcalo como SUPUESTO validado por mí y como pregunta abierta para negocio. El diseño debe permitir que, en el futuro, el plan influya en el precio sin tocar el núcleo del cálculo.
4. **Impuestos:** de acuerdo con la lista de países, con la simplificación (documentada), con los tipos como datos configurables y con guardar el tipo aplicado en cada simulación.
5. **Redondeo y proyección:** de acuerdo: céntimos enteros, un solo redondeo comercial del impuesto y desglose completo en la proyección.
6. **Identificadores españoles:** DNI, NIE y CIF; los K/L/M quedan fuera. «Verdadero» = estructura y carácter de control correctos. Contrasta la regla del CIF con la Orden EHA/451/2008, como propusiste, y cita la fuente en la especificación.
7. **Normalización:** de acuerdo con tu propuesta.
8. **Fuera de España:** aquí no estoy de acuerdo. Una validación genérica de 2 a 20 caracteres no es «estricta». Quiero el formato específico de cada país de la lista cerrada, con la fuente de cada uno documentada. El algoritmo de control solo es obligatorio para España. Diseño: un validador por país detrás de una interfaz común, para poder añadir algoritmos de otros países sin tocar el resto.
9. **Unicidad:** de acuerdo.
10. **Simulaciones:** de acuerdo con lo que se guarda y con mostrar el historial al tipo de cambio actual, con el aviso.
11. **Alcance:** solo altas y consultas. Las simulaciones son inmutables.
12. **Dashboard:** de acuerdo con el listado paginado y el buscador, pero no con quitar las métricas. Unas pocas métricas agregadas de los datos reales (número de clientes, número de simulaciones, importe medio simulado) no son reglas de negocio inventadas. Inclúyelas como «Could» en la priorización.
13. **Alta de cliente y simulador:** sí a las dos cosas.
14. **Divisas:** de acuerdo con la lista. La llamada se hace desde el navegador, porque el enunciado lo pide en la interfaz, con caché, validación del esquema de la respuesta y vuelta a EUR si falla.
15. **Autenticación:** fuera de alcance, pero no basta con decirlo: tiene que quedar justificado en el modelo de amenazas (ver Seguridad).
16. **Rutas y errores:** rutas literales sin prefijo y errores RFC 9457. La regla de códigos es esta:
    - 400: la petición no cumple el esquema.
    - 422: cumple el esquema pero viola una regla de negocio (identificador fiscal inválido, `customerId` inexistente).
    - 404: solo para recursos de la URL (`GET /customers/:id`).
    - 409: duplicados.
17. **Interfaz:** en español y con formato `es-ES`.
18. **Entrega:** el camino principal es npm (instalar, migrar, sembrar y arrancar en pocos comandos). Además quiero Docker Compose como alternativa, CI en GitHub Actions, tests e2e con Playwright y una demo desplegada con URL pública. Repo público en GitHub y datos de ejemplo.
19. **Node:** no actualizo ahora. Lo que importa es la máquina del evaluador, no la mía: `engines` con el mismo rango que admite Angular, un `.nvmrc` y en el CI una matriz con Node 22, 24 y 26. Por cierto, según tus propios datos la LTS activa es la 26, no la 24; revisa esa recomendación.
20. **Prompts como evidencia:** sí. Guarda en `ai-workspace/prompts/` cada prompt que te envíe, literal, empezando por el primero y este. Al final exportaré la conversación completa.

## Seguridad
El RNF-11 se queda corto. Sustitúyelo por un bloque de requisitos RNF-SEC-xx basado en el OWASP API Security Top 10 (2023) y añade un modelo de amenazas breve: activos (datos personales como el email y el DNI/NIE de autónomos), actores, amenazas (STRIDE) y la medida que cubre cada una, incluido por qué no hay login. Como mínimo debe cubrir:
- Validación estricta de toda entrada: rechazo de campos desconocidos, límites de longitud y límite de tamaño del body.
- Solo consultas parametrizadas, con escape de los comodines de `LIKE`.
- El servidor siempre recalcula los importes.
- IDs no enumerables (UUID v7).
- Cabeceras de seguridad, CSP y CORS con una lista cerrada de orígenes.
- Rate limiting y paginación con un máximo de resultados.
- Errores sin detalles internos y logs sin datos personales.
- Configuración validada al arrancar y ningún secreto en el repo.
- Validar la respuesta de la API externa antes de usarla.
- En Angular, prohibido `innerHTML` y `bypassSecurityTrust*`.
- Auditoría de dependencias en el CI y contenedores sin root.

## Lo que quiero en este paso (sin código)
1. En `01-analisis.md`, marca cada AMB como **Cerrada** con su decisión. No reescribas el resto.
2. Crea un registro de decisiones (D-01, D-02…) con la decisión, la alternativa descartada, el motivo y quién la tomó (tú o yo).
3. Escribe la especificación en `ai-workspace/02-especificacion/`, dividida en ficheros con una sola responsabilidad. Como guía:
   - Alcance: priorización MoSCoW y lo que queda fuera.
   - Reglas de negocio: tramos, impuestos y redondeo, con tabla de ejemplos.
   - Validación fiscal: algoritmos paso a paso, fuentes y vectores de prueba válidos e inválidos.
   - Contrato de la API: cada endpoint con request, response, códigos, ejemplos JSON, errores y paginación.
   - Frontend: vistas, estados de carga, vacío y error, y comportamiento de las divisas.
   - Seguridad: el bloque RNF-SEC y el modelo de amenazas.
   - Criterios de aceptación en formato Given/When/Then.
4. Cada criterio de aceptación y cada vector de prueba debe referenciar su ID (RF, RNF, CL). Serán la base de los tests.
5. Nada de arquitectura todavía (tablas, carpetas, librerías concretas): eso va en la siguiente fase.

Cuando termines, haz un commit y dime qué ha cambiado respecto al análisis. Si alguna de mis decisiones te parece mala, dímelo ahora, antes de seguir.
