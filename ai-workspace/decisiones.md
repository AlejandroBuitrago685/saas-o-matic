# Registro de decisiones

Documento vivo y transversal a todas las fases. Cada decisión tiene un ID estable (`D-xx`) que se cita desde la
especificación, el código y los tests.

- **Quién:** `Usuario` (decisión del responsable del proyecto) · `Claude` (decisión técnica del asistente, aceptada
  salvo veto) · `Claude · pendiente` (decisión del asistente que el usuario debe validar de forma explícita) ·
  `Claude · validada` (el usuario ya la ha validado; las condiciones que añadió figuran como decisiones propias en
  «Validaciones del usuario»).
- **Refs:** ambigüedad (`AMB-xx`), requisito (`RF`/`RNF`) o documento de la especificación afectado.
- Una decisión no se edita: si cambia, se añade una nueva que la sustituye y se indica en ambas.

Última actualización: 2026-11-12 (fase 2, especificación validada por el usuario).

## Decisiones

### Proceso y entorno

| ID | Decisión | Alternativa descartada | Motivo | Quién | Refs |
|---|---|---|---|---|---|
| D-01 | Stack: monorepo con npm workspaces; Node.js + TypeScript, Fastify + Zod, SQLite con Drizzle; Angular + Tailwind; Vitest y Playwright. | Python (lo admite el enunciado). | Decisión previa del usuario. | Usuario | RNF-01, RNF-12 |
| D-02 | Trabajo por fases con aprobación explícita; todo se documenta en `/ai-workspace`; documentación en español y código y commits en inglés. | Iterar directamente sobre código. | El proceso es lo que más puntúa (35 % + 25 %). | Usuario | RNF-15 |
| D-03 | Fin de línea LF normalizado con `.gitattributes`. | `core.autocrlf` en cada máquina. | Los evaluadores pueden usar cualquier SO (RT-14). | Claude | RNF-14 |
| D-37 | Node no se actualiza en local. `engines` con el mismo rango que admite Angular (`^22.22.3 \|\| ^24.15.0 \|\| >=26.0.0`), `.nvmrc` y matriz de CI con Node 22, 24 y 26. **Alcance de la matriz concretado en D-52 y D-53.** | Fijar una única versión de Node. | Lo que importa es la máquina del evaluador, no la del desarrollador. | Usuario | RNF-23 |
| D-38 | `.nvmrc` apunta a Node 26, la LTS activa. Corrige la recomendación anterior de Node 24, que no cuadraba con los datos del análisis (§9). | Node 24 (ya en mantenimiento desde 2026-10-20). | Es la LTS activa, con soporte hasta 2029-04-30, y la matriz de CI cubre 22 y 24. | Claude | RNF-23 |
| D-39 | Cada prompt del usuario se guarda literal en `ai-workspace/prompts/`, uno por fase. | Resumir los prompts. | Evidencia del proceso con IA (§3.3 del enunciado). | Usuario | RNF-17 |

### Tarificación e impuestos

| ID | Decisión | Alternativa descartada | Motivo | Quién | Refs |
|---|---|---|---|---|---|
| D-04 | Usuarios activos: entero de 1 a 10 000. En la interfaz, slider y campo numérico sincronizados. | Admitir 0 o no poner tope. | Una suscripción con 0 usuarios no tiene sentido; el tope evita abusos y desbordamientos. | Usuario | AMB-01, RF-07, RF-16 |
| D-05 | El slider usa una **escala por segmentos**: 1–100 en pasos de 1 (50 % del recorrido), 100–1 000 en pasos de 10 (30 %) y 1 000–10 000 en pasos de 100 (20 %). El campo numérico admite cualquier entero. **Porcentajes corregidos y conversión concretada en D-48 y D-49.** | Slider lineal de 1 a 10 000. | En un slider lineal, los tramos que cambian el precio (1–50) ocuparían el 0,5 % del recorrido y no se podrían seleccionar con el ratón. | Claude · validada | AMB-01, RF-16 |
| D-06 | Almacenamiento (GB, entero de 0 a 100 000) y llamadas a la API (por mes, entero de 0 a 1 000 000 000): informativos, sin efecto en el precio. | Ponerles precio. | El enunciado no les asigna precio; inventarlo sería crear una regla de negocio. Los topes concretos los fija Claude. | Usuario | AMB-02, RF-07 · PN-01 · S-04 |
| D-07 | Planes: catálogo cerrado `STARTER`, `BUSINESS`, `ENTERPRISE`, descriptivo y sin efecto en el precio. | Planes que cambian los tramos. | El enunciado define una única tabla de tramos. | Usuario | AMB-03, RF-01 · S-01 · PN-02 |
| D-08 | Extensibilidad: el precio se calcula a partir de una **tarifa** (tramos y precios como datos) y el plan se traduce a una tarifa mediante una asociación configurable. Hoy los tres planes usan la tarifa `STANDARD`. | Codificar los tramos dentro del cálculo. | Así el plan podrá influir en el precio sin tocar el núcleo del cálculo. El requisito es del usuario; el mecanismo, de Claude. | Usuario | AMB-03, RNF-25 |
| D-09 | Impuesto: tipo general del país del cliente (ES 21 %, PT 23 %, FR 20 %, DE 19 %, IT 22 %, GB 20 %, US 0 %), aplicado tal cual. Los tipos son datos configurables y cada simulación guarda el tipo que se le aplicó. | Inversión del sujeto pasivo, OSS, IGIC/IPSI, *sales tax* estatal de EE. UU. | El enunciado pide «el impuesto correspondiente al país». La simplificación queda documentada. | Usuario | AMB-04, RF-09 · PN-03 |
| D-10 | Importes en céntimos enteros de EUR; tipos impositivos en puntos básicos (2 100 = 21 %); un único redondeo comercial (mitad hacia arriba) del impuesto. | Decimales en coma flotante o redondeo bancario. | Exactitud (RNF-04). Los puntos básicos son una decisión de Claude. | Usuario | AMB-05, RNF-04 |
| D-11 | La proyección muestra el desglose por tramo, la base, el impuesto (con su tipo) y el total. | Mostrar solo el total. | Transparencia para el comercial. | Usuario | AMB-06, RF-16 |
| D-18 | Cada simulación guarda las entradas, el desglose por tramo, la base, el país y el tipo impositivo aplicados, el impuesto, el total, la tarifa aplicada y la fecha en UTC. El servidor siempre recalcula. | Guardar solo las entradas. | Histórico reproducible aunque cambien tarifas o tipos. Guardar la tarifa y el país es una decisión de Claude. | Usuario | AMB-11, RF-10 |

### Validación fiscal

| ID | Decisión | Alternativa descartada | Motivo | Quién | Refs |
|---|---|---|---|---|---|
| D-12 | España: se admiten DNI, NIE y CIF. Los NIF especiales K, L y M se reconocen y se rechazan con un código propio. «Verdadero» = estructura y carácter de control correctos. | Consultar la existencia en la AEAT. | Comprobar la existencia exige servicios con certificado; queda fuera de alcance. | Usuario | AMB-07, RF-03 |
| D-13 | CIF: la estructura y las claves salen de la Orden EHA/451/2008. La **Orden no define el algoritmo ni cuándo el control es letra o dígito**, así que se aplica el algoritmo de uso general (contrastado con el NIF publicado de la AEAT, `Q2826000H`) y la regla habitual: A, B, E, H → dígito; N, P, Q, R, S, W → letra; C, D, F, G, J, U, V → cualquiera de los dos. Se **descarta** la regla «dígitos `00` ⇒ letra» que proponía el análisis. **Ampliada con CIF reales en D-50.** | Mantener la regla `00`; aceptar letra o dígito con cualquier clave. | Desde 2008 los 7 dígitos son «un número aleatorio» (art. 2) y desaparece el código de provincia (preámbulo), así que la regla `00` ya no tiene base. | Claude · validada | AMB-07, RF-03, RT-03 |
| D-14 | Normalización: se eliminan los espacios (cualquier espacio Unicode), los guiones `-` y los puntos `.`, y se pasa a mayúsculas. Después solo se admite `[A-Z0-9]`. Sin relleno de ceros. El prefijo de país es opcional: primero se valida el valor tal cual y, solo si no es válido y empieza por el prefijo del país, se valida el resto. | Quitar siempre el prefijo. | Quitarlo siempre rompería NIF-IVA franceses válidos que empiezan por «FR» (CL-52). La regla del prefijo es de Claude. | Usuario | AMB-08, RF-02 |
| D-15 | Fuera de España: formato específico de cada país de la lista cerrada, con su fuente documentada; algoritmo de control no obligatorio. Un validador por país detrás de una interfaz común. | Validación genérica de 2 a 20 caracteres (la que proponía Claude). | Una validación genérica no es «estricta». | Usuario | AMB-09, RF-02, RNF-26 |
| D-16 | Identificador exigido fuera de España: NIF-IVA en DE, FR, IT y PT (formato VIES), número de IVA del Reino Unido en GB y EIN en US. | Identificadores nacionales: Steuernummer, SIREN, codice fiscale… | Son los identificadores B2B habituales en facturación internacional y tienen estructura oficial publicada. | Claude · validada | AMB-09, RF-02 · S-03 · PN-04 |
| D-17 | El par (país, identificador normalizado) es único: un duplicado devuelve `409` con el ID del cliente existente. El email no es único. | Email único. | Un mismo contacto puede gestionar varias empresas. | Usuario | AMB-10, RF-01 |

### Divisas

| ID | Decisión | Alternativa descartada | Motivo | Quién | Refs |
|---|---|---|---|---|---|
| D-19 | EUR es la fuente de verdad. La divisa no se guarda y el historial se muestra al tipo de cambio actual, con aviso. | Guardar la divisa o el tipo del momento. | La conversión es solo de visualización. | Usuario | AMB-12, RF-13, RF-15 |
| D-20 | Regla de conversión única para todas las vistas: se convierten las **partidas hoja** (cada subtotal de tramo y el impuesto) y se redondean a los decimales de la divisa (ISO 4217). La base y el total mostrados son la suma de las partidas ya convertidas. El precio unitario de la tarifa se muestra siempre en EUR. | Convertir cada importe por separado. | El desglose siempre cuadra. Con los tipos de referencia, convertir el total directamente da 141,60 £ y la suma de partidas 141,61 £ (TV-FX-02). | Claude · validada | AMB-12, RF-13 |
| D-21 | Divisas ofrecidas: EUR, USD, GBP, CHF, JPY y MXN. | Las 166 que devuelve la API. | Lista manejable que cubre los casos habituales y una divisa sin decimales (JPY). | Usuario | AMB-13, RF-13 |
| D-22 | La API de tipos de cambio se consulta desde el navegador, con caché, validación del esquema de la respuesta y vuelta a EUR si falla. | Pasar por un proxy en el backend. | El enunciado sitúa la integración en la interfaz. | Usuario | AMB-14, RF-12 |
| D-23 | Caché de los tipos durante 1 h (también tras recargar la página). Si el refresco falla y hay tipos guardados con menos de 48 h (según `time_last_update_unix`), se siguen usando con aviso de «desactualizados»; si no, solo EUR. **Condición de visibilidad de los estados en D-51.** | Volver a EUR en cuanto falle cualquier petición. | El proveedor recomienda pedir como mucho una vez por hora y bloquea 20 min con `429` si se abusa. | Claude · validada | AMB-14, RF-12, CL-60 |
| D-24 | La interfaz muestra la atribución «Rates By Exchange Rate API» con enlace al proveedor. | No mostrarla. | La exigen los términos del endpoint abierto. | Claude | RF-18 |

### Interfaz y alcance

| ID | Decisión | Alternativa descartada | Motivo | Quién | Refs |
|---|---|---|---|---|---|
| D-25 | Dashboard: listado paginado de clientes con el buscador y métricas agregadas (número de clientes, número de simulaciones, importe medio simulado) como **Could**. | Sin métricas (lo que proponía Claude). | Las métricas agregadas de datos reales no son reglas de negocio inventadas. | Usuario | AMB-15, RF-14, RF-19 |
| D-26 | «Importe medio simulado» = media de la **base sin impuestos** de todas las simulaciones, redondeada al céntimo. | Media del total con impuestos. | Mezclar impuestos de distintos países distorsiona la media; la base es el ingreso comparable. | Claude · validada | RF-19 |
| D-27 | Búsqueda parcial sin distinguir mayúsculas ni acentos en el nombre, y por identificador normalizado. Resultados ordenados por nombre de empresa (orden alfabético sin distinguir mayúsculas ni acentos) y, a igualdad, por ID. | Ordenar por fecha de alta. | Orden predecible para un buscador. El orden lo decide Claude. | Usuario | AMB-15, RF-04 |
| D-28 | Hay formulario de alta en la interfaz. El simulador siempre trabaja sobre un cliente y vive en su detalle. | Simulación sin cliente. | El impuesto depende del país del cliente. | Usuario | AMB-16, AMB-17, RF-06, RF-16 |
| D-29 | Solo altas y consultas. Las simulaciones son inmutables. | CRUD completo. | No lo pide el enunciado; reduce la superficie de ataque. | Usuario | AMB-18 |
| D-34 | Nombre de empresa: sin espacios en los extremos, espacios internos colapsados, normalización Unicode NFC, de 2 a 200 caracteres y sin caracteres de control. Email: formato válido, guardado en minúsculas, 254 caracteres como máximo. | Sin límites. | AMB-21 no se llegó a preguntar; queda la propuesta del análisis. | Claude · validada | AMB-21, RF-01 |
| D-35 | Interfaz en español con formato `es-ES`. | Varios idiomas. | Lo decide el usuario. | Usuario | AMB-22 |
| D-36 | Entrega: el camino principal es npm (instalar, migrar, sembrar y arrancar en pocos comandos). Además, Docker Compose como alternativa, CI en GitHub Actions, e2e con Playwright, demo con URL pública, repositorio público y datos de ejemplo. | Solo npm. | Que el evaluador no encuentre fricción (10 %) y haya señales de calidad visibles. | Usuario | AMB-23, RNF-18, RNF-20, RNF-21, RNF-22 |

### API y seguridad

| ID | Decisión | Alternativa descartada | Motivo | Quién | Refs |
|---|---|---|---|---|---|
| D-30 | Sin autenticación, justificado en el modelo de amenazas (despliegue en red corporativa: S-02). | Login propio. | Herramienta interna con un solo rol. Un login con usuarios inventados sería seguridad de fachada. | Usuario | AMB-19, RNF-SEC-19 |
| D-31 | Rutas literales sin prefijo (`/customers`, `/simulations`). Errores RFC 9457. Códigos: `400` si no cumple el esquema; `422` si cumple el esquema pero viola una regla de negocio; `404` solo para recursos de la URL; `409` para duplicados. | Prefijo `/api/v1`. | Fidelidad al enunciado. | Usuario | AMB-20, RNF-05 |
| D-32 | Frontera 400/422: tipos, campos obligatorios, longitudes, rangos numéricos, enumerados (país, plan), formato de email y campos desconocidos son **esquema → 400**. La validez del identificador fiscal según el país y la existencia de `customerId` son **negocio → 422**. Códigos complementarios: `413`, `415`, `429`, `500` y `503` (solo en el health check). | Rangos como 422. | La regla de D-31 no cubría estos casos. Lo concreta Claude. | Claude | AMB-20, RNF-05 |
| D-33 | Formato de error: `type` como URI relativa `/problems/<slug>`, `title`, `status`, `detail` en inglés y sin datos internos, `instance` = `urn:uuid:<id de la petición>`, `code` estable y `errors[]` con `location` (`body`, `query` o `path`), `pointer` (JSON Pointer, RFC 6901) y `code` por campo. La interfaz traduce los `code` al español. | Mensajes en español generados por la API. | Contrato estable para máquinas; los textos visibles se gestionan en la interfaz. | Claude | RNF-05 |
| D-40 | Seguridad: el RNF-11 se sustituye por el bloque RNF-SEC-xx, basado en el OWASP API Security Top 10 (2023), más un modelo de amenazas STRIDE. | Mantener el RNF-11 genérico. | El RNF-11 se quedaba corto. | Usuario | RNF-SEC-01…21 |
| D-41 | IDs UUID v7 (RFC 9562). | Autoincremento. | No son enumerables y no revelan el volumen de datos. Contrapartida aceptada: revelan el instante de creación, que ya se publica en `createdAt`. | Usuario | RNF-SEC-04 |
| D-42 | El listado y la búsqueda de clientes no devuelven el email; solo el detalle lo incluye. | Devolver el cliente completo en el listado. | Minimizar datos personales en el endpoint masivo (OWASP API3). | Claude | RNF-SEC-05 |
| D-43 | Si una petición trae campos de importe, se rechaza con `400` (`UNKNOWN_FIELD`); no se ignoran en silencio. | Ignorarlos. | Coherente con el rechazo de campos desconocidos y más fácil de auditar. | Claude | RNF-SEC-03, CL-44 |
| D-44 | Límites por defecto, configurables: body de 16 KiB como máximo; paginación de 20 resultados por defecto y 100 como máximo; búsqueda de 100 caracteres como máximo; 100 peticiones por minuto e IP en total y 20 escrituras por minuto e IP. | Sin límites. | OWASP API4. | Claude | RNF-SEC-01, RNF-SEC-08, RNF-SEC-09 |
| D-45 | Endpoint `GET /catalog` con países y tipos, planes, tarifas y límites de entrada. | Copiar esos datos en el frontend. | Una sola fuente de datos de negocio (RT-02) y formularios alimentados por datos. | Claude | RF-20 |
| D-46 | Endpoints `GET /simulations/{id}` (destino de la cabecera `Location`) y `GET /health` (para Docker, CI y la demo). | No exponerlos. | Una respuesta `201` debe identificar el recurso creado, y el despliegue necesita comprobar que el servicio está vivo. | Claude | RF-10, RNF-24 |
| D-47 | Demo pública: solo datos ficticios, aviso visible «no introduzcas datos reales», reinicio periódico de los datos, HTTPS con HSTS y límites de escritura más estrictos. | Desplegar la demo igual que la herramienta interna. | En la demo no se cumple el supuesto S-02, que es lo que justifica no tener login. | Claude · validada | RNF-22, RNF-SEC-20 |

### Validación de la especificación (2026-11-12)

| ID | Decisión | Alternativa descartada | Motivo | Quién | Refs |
|---|---|---|---|---|---|
| D-48 | La conversión entre posición del slider y número de usuarios es una **función pura con tests**: se llega exactamente a 10, 11, 50 y 51, e ir y volver devuelve el mismo valor. El slider anuncia «{n} usuarios» a los lectores de pantalla con `aria-valuetext` (Must). | Lógica de conversión dentro de la vista. | Testabilidad y accesibilidad. | Usuario | D-05, RF-16, RNF-13 |
| D-49 | Concreción de D-05: 280 posiciones (0–279). 0–99 → 1–100; 100–189 → 110–1 000; 190–279 → 1 100–10 000. Con esos pasos los segmentos ocupan el **35,7 %, 32,1 % y 32,1 %** del recorrido, no el 50/30/20 % que decía D-05. Un valor que no corresponde a ninguna posición se representa con la más cercana (en caso de empate, la menor). | Mantener el 50/30/20 % cambiando los pasos (p. ej. 20 y 200). | Los pasos son lo que el usuario ve y ya estaban aprobados; los porcentajes de D-05 eran una estimación errónea. | Claude · pendiente | D-05, D-48 |
| D-50 | Además de los vectores sintéticos, se prueban CIF reales públicos: Telefónica `A28015865`, Inditex `A15075062`, Mercadona `A46103834` y Banco Santander `A39000013`. Los cuatro pasan con el algoritmo de D-13, y su asociación a cada empresa se ha comprobado en fuentes públicas (CNMV y registros LEI). | Solo vectores sintéticos. | Contrastar el algoritmo con casos reales, además del de la AEAT. | Usuario | D-13, RF-03 |
| D-51 | Los estados de la API de tipos de cambio se ven **siempre**, sea cual sea la divisa seleccionada: carga, error con «Reintentar» y aviso de tipos desactualizados con su fecha. El fallback (caché o EUR) nunca oculta el error. Cada estado tiene su e2e con la API simulada. | Fallback silencioso. | El enunciado evalúa expresamente los estados de carga y error de la API externa. | Usuario | D-23, RF-12, RNF-08 |
| D-52 | CI: lint, tests unitarios, tests de integración y build en una matriz con Node 22, 24 y 26; los e2e, una sola vez, con la versión de `.nvmrc`. | Ejecutar los e2e en toda la matriz. | Que el pipeline no tarde demasiado. | Usuario | RNF-21, D-37 |
| D-53 | La matriz de D-52 se ejecuta en Linux. Además, una prueba de humo en Windows y otra en macOS con la versión de `.nvmrc` (instalación limpia, build, arranque y `GET /health`). La auditoría de dependencias se ejecuta una sola vez. | Matriz completa de 3 SO × 3 versiones de Node, o solo Linux. | Cubre RNF-14 y el riesgo RT-06 (driver nativo de SQLite en la máquina del evaluador) sin multiplicar la duración del pipeline. | Claude · pendiente | RNF-14, RNF-21, RT-06 |

## Validaciones del usuario

Prompt literal: [`prompts/03-validacion-especificacion.md`](prompts/03-validacion-especificacion.md).

| Fecha | Elemento | Resultado | Condiciones | Decisiones derivadas |
|---|---|---|---|---|
| 2026-11-12 | D-05 | Aprobada con condiciones | Función pura con tests (10, 11, 50 y 51 exactos; ida y vuelta) y `aria-valuetext`. | D-48, D-49 |
| 2026-11-12 | D-13 | Aprobada con condiciones | Añadir CIF reales de empresas conocidas. | D-50 |
| 2026-11-12 | D-16, S-03 | Aprobados | — | — |
| 2026-11-12 | D-20 | Aprobada | — | — |
| 2026-11-12 | D-23 | Aprobada con condiciones | El fallback no oculta el error: carga, error con «Reintentar» y tipos desactualizados con fecha, siempre visibles, con un e2e por estado. | D-51 |
| 2026-11-12 | D-26, D-34 | Aprobadas | — | — |
| 2026-11-12 | D-47, S-02 | Aprobados | — | — |
| 2026-11-12 | RNF-21 | Ajustado | Matriz de Node para lint, tests unitarios, de integración y build; e2e una vez con `.nvmrc`. | D-52, D-53 |

## Supuestos

| ID | Supuesto | Estado | Refs |
|---|---|---|---|
| S-01 | Los planes `STARTER`, `BUSINESS` y `ENTERPRISE` son descriptivos y no cambian el precio. | Validado por el usuario; pendiente de negocio (PN-02). | D-07 |
| S-02 | En producción, la herramienta solo es accesible desde la red corporativa (o tras un proxy con identidad), y todos los comerciales tienen los mismos permisos. | Validado por el usuario (2026-11-12). | D-30, 06-seguridad §3 |
| S-03 | Fuera de España, el identificador que se pide a un cliente corporativo es su NIF-IVA (o el EIN en EE. UU.). | Validado por el usuario (2026-11-12); pendiente de negocio (PN-04). | D-16 |
| S-04 | El almacenamiento y las llamadas a la API no influyen en el precio. | Validado por el usuario; pendiente de negocio (PN-01). | D-06 |

## Preguntas abiertas para negocio

No bloquean la implementación: el diseño resuelve cada una de forma provisional y deja el cambio acotado.

| ID | Pregunta | Resolución provisional | Refs |
|---|---|---|---|
| PN-01 | ¿El almacenamiento y las llamadas a la API deben tener precio? ¿Con qué unidades y tarifas? | Informativos (D-06). | S-04 |
| PN-02 | ¿Los planes deben cambiar el precio (tramos o tarifas distintos)? | Todos usan la tarifa `STANDARD` (D-08). | S-01 |
| PN-03 | ¿Hay que aplicar la fiscalidad real de las ventas B2B: inversión del sujeto pasivo, exportaciones exentas, IGIC o IPSI? | Tipo general del país (D-09). | D-09 |
| PN-04 | ¿Qué identificador fiscal se pide a los clientes extranjeros? | NIF-IVA o EIN (D-16). | S-03 |
