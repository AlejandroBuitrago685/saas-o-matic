# 06 · Seguridad

Sustituye a RNF-11 (D-40). Se basa en el **OWASP API Security Top 10 (2023)**
(`https://owasp.org/API-Security/editions/2023/en/0x11-t10/`). Donde el Top 10 de API no cubre un riesgo
(inyección, XSS, dependencias vulnerables), se usa el OWASP Top 10 (2021).

## 1. Cobertura del OWASP API Security Top 10 (2023)

| Riesgo | ¿Aplica? | Cómo se cubre |
|---|---|---|
| API1 · Broken Object Level Authorization | Parcial. No hay propietarios de objetos: todos los comerciales ven todos los clientes (S-02). | IDs no enumerables (RNF-SEC-04). La ausencia de autorización por objeto es una decisión justificada (§3.6). |
| API2 · Broken Authentication | No hay autenticación, por diseño (D-30). | Justificación y riesgo residual en §3.6. Compensación en la demo (RNF-SEC-20). |
| API3 · Broken Object Property Level Authorization | Sí. | Campos desconocidos rechazados (RNF-SEC-01), campos calculados no aceptados (RNF-SEC-03), respuestas mínimas (RNF-SEC-05). |
| API4 · Unrestricted Resource Consumption | Sí. | Límites de entrada y de body (RNF-SEC-01), límite de peticiones (RNF-SEC-08), paginación con máximo (RNF-SEC-09). |
| API5 · Broken Function Level Authorization | No: un solo rol y ninguna función administrativa expuesta. | Inventario cerrado de endpoints (RNF-SEC-17). |
| API6 · Unrestricted Access to Sensitive Business Flows | Sí: altas masivas automatizadas. | Límite de escrituras (RNF-SEC-08); en la demo, reinicio y límites más estrictos (RNF-SEC-20). |
| API7 · Server Side Request Forgery | No, por diseño: el backend no hace peticiones salientes. | RNF-SEC-18 mantiene esa propiedad. |
| API8 · Security Misconfiguration | Sí. | Cabeceras y CSP (RNF-SEC-06), CORS (RNF-SEC-07), errores (RNF-SEC-10), configuración (RNF-SEC-12), contenedores (RNF-SEC-16), caché (RNF-SEC-21). |
| API9 · Improper Inventory Management | Sí. | Contrato publicado, sin endpoints no documentados (RNF-SEC-17), inventario de dependencias (RNF-SEC-15). |
| API10 · Unsafe Consumption of APIs | Sí: API de tipos de cambio. | Validación de la respuesta y solo HTTPS (RNF-SEC-13). |

## 2. Requisitos RNF-SEC

| ID | Requisito | OWASP | Prioridad | Verificación |
|---|---|---|---|---|
| RNF-SEC-01 | **Validación estricta de toda entrada** (cuerpo, consulta y ruta) contra un esquema. Se rechazan los campos desconocidos, incluidas claves como `__proto__`, `constructor` y `prototype`. Se aplican tipos, longitudes, rangos y enumerados. Body de 16 KiB como máximo (`413`), solo `application/json` (`415`) y ningún carácter de control en los textos. | API3, API4, API8 | Must | AC-21, AC-22, AC-23, AC-24 |
| RNF-SEC-02 | **Solo consultas parametrizadas**: ninguna consulta se construye concatenando datos de entrada. En las búsquedas con `LIKE` se escapan los comodines `%`, `_` y el carácter de escape. | A03:2021 (Injection) | Must | AC-31 + revisión de código |
| RNF-SEC-03 | **El servidor siempre calcula los importes.** No se acepta en la entrada ningún campo calculado (`pricing`, `*Cents`, `taxRateBps`) ni ningún campo que asigne el servidor (`id`, `createdAt`). | API3, API6 | Must | AC-22, AC-42 |
| RNF-SEC-04 | **IDs no enumerables:** UUID v7 (RFC 9562), con al menos 62 bits aleatorios. Nunca autoincrementales en la API. | API1 | Must | AC-62 |
| RNF-SEC-05 | **Minimización de datos en las respuestas:** el listado y la búsqueda no incluyen el email (D-42), y nunca se exponen campos internos. | API3 | Must | AC-33 |
| RNF-SEC-06 | **Cabeceras de seguridad.** En la API: `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` y `Cross-Origin-Resource-Policy: same-site`, sin cabeceras que revelen la tecnología. En la interfaz, una CSP con `default-src 'self'`; `script-src 'self'` sin `unsafe-inline` ni `unsafe-eval`; `connect-src 'self'` + origen de la API + `https://open.er-api.com`; `img-src 'self' data:`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`; `frame-ancestors 'none'`. Los estilos en línea solo con *nonce* o *hash*, si el framework lo permite (se decide en arquitectura). Con HTTPS, además `Strict-Transport-Security`. | API8 | Must | AC-52, AC-63, AC-64 |
| RNF-SEC-07 | **CORS con una lista cerrada de orígenes** (configuración). Los orígenes que no están en la lista no reciben cabeceras CORS y sus peticiones previas (*preflight*) se rechazan. Sin comodín `*` y sin credenciales. | API8 | Must | AC-53 |
| RNF-SEC-08 | **Límite de peticiones** por IP: 100 por minuto en total y 20 escrituras por minuto (D-44, configurable). Al superarlo → `429` con `Retry-After`. | API4, API6 | Must | AC-51 |
| RNF-SEC-09 | **Paginación obligatoria** en todos los listados (máximo 100 por página) y búsqueda de 100 caracteres como máximo. | API4 | Must | AC-32 |
| RNF-SEC-10 | **Errores sin detalles internos:** sin trazas, SQL, rutas, versiones ni valores enviados. Los errores no controlados devuelven `500` genérico con `instance` para correlacionarlos con los logs. | API8 | Must | AC-50 |
| RNF-SEC-11 | **Logs sin datos personales:** no se registran cuerpos de petición o respuesta, cadenas de consulta (`q` puede contener nombres o identificadores), emails, identificadores fiscales, nombres de empresa ni IPs completas. Sí se registran el método, la ruta sin consulta, el estado, la duración y el ID de petición. | API8; RGPD art. 5.1.c | Must | AC-54 |
| RNF-SEC-12 | **Configuración validada al arrancar:** variables de entorno, tarifas, tipos impositivos, orígenes CORS y límites. Si algo no es válido, el proceso termina antes de aceptar peticiones. Ningún secreto en el repositorio; se versiona un `.env.example` con valores de ejemplo. | API8 | Must | AC-07, AC-55 |
| RNF-SEC-13 | **Validar la respuesta de la API externa** antes de usarla ([`05-frontend.md`](05-frontend.md) §4.3). Solo por HTTPS y con tiempo máximo de respuesta. Los valores no válidos nunca llegan a la interfaz. | API10 | Must | AC-80 |
| RNF-SEC-14 | **Frontend sin inyección de HTML:** prohibido el enlace a `innerHTML` o `outerHTML` y el uso de `bypassSecurityTrust*`; los datos se muestran solo por interpolación. El CI lo comprueba de forma automática. | A03:2021 (XSS) | Must | AC-56, AC-63 |
| RNF-SEC-15 | **Auditoría de dependencias en el CI:** falla si hay vulnerabilidades altas o críticas. *Lockfile* versionado e instalación reproducible. | A06:2021; API9 | Must | AC-57 |
| RNF-SEC-16 | **Contenedores sin root:** usuario sin privilegios y sistema de ficheros de solo lectura salvo el volumen de datos. | API8 | Should | AC-60 |
| RNF-SEC-17 | **Inventario de API cerrado:** solo existen los endpoints de [`04-contrato-api.md`](04-contrato-api.md). Sin endpoints de depuración ni documentación interactiva en la demo. Cualquier otra ruta o método → `404`. | API9, API5 | Must | AC-58 |
| RNF-SEC-18 | **Sin peticiones salientes desde el backend.** Si algún día hicieran falta, irían a destinos fijos en la configuración y nunca a URLs derivadas de la entrada. | API7 | Must | AC-59 |
| RNF-SEC-19 | **Sin autenticación, de forma justificada:** se documentan la decisión, sus supuestos (S-02) y el riesgo residual (§3.6). El diseño debe permitir añadir autenticación como un paso previo a todas las rutas sin modificarlas. | API2, API5 | Must | AC-94 |
| RNF-SEC-20 | **Demo pública protegida** (D-47): solo datos ficticios de ejemplo, aviso visible permanente, reinicio periódico de los datos (al menos cada 24 h y en cada despliegue), HTTPS con HSTS y límite de escrituras más estricto (5 por minuto e IP). | API4, API6, API8 | Should | AC-61 |
| RNF-SEC-21 | **Respuestas con datos personales no cacheables:** `Cache-Control: no-store` (todas salvo `GET /catalog`). | API8 | Must | AC-52 |

## 3. Modelo de amenazas

### 3.1 Alcance

Navegador del comercial → interfaz → API → base de datos SQLite, más la API externa de tipos de cambio y la cadena
de suministro (dependencias y CI). Se consideran dos entornos:

- **Interno** (producción prevista): solo accesible desde la red corporativa (S-02).
- **Demo pública** (RNF-22): accesible desde Internet.

### 3.2 Activos

| ID | Activo | Por qué importa |
|---|---|---|
| A-01 | **Datos personales:** email de contacto; DNI/NIE de autónomos; nombre de empresa (puede ser el nombre de una persona física). | RGPD. Es el activo más sensible. |
| A-02 | Información comercial: simulaciones y presupuestos por cliente. | Confidencialidad comercial. |
| A-03 | Integridad de los cálculos guardados. | Un presupuesto erróneo tiene impacto comercial. |
| A-04 | Disponibilidad del servicio. | Herramienta de trabajo diario. |
| A-05 | Cadena de suministro: dependencias y CI. | Ejecución de código ajeno. |
| A-06 | Integridad de la interfaz en el navegador del comercial. | Lo que el comercial ve y decide. |

### 3.3 Actores

| ID | Actor | Entorno |
|---|---|---|
| ACT-01 | Comercial (usuario legítimo; puede equivocarse). | Interno |
| ACT-02 | Persona de la red interna sin necesidad de acceso, o curiosa. | Interno |
| ACT-03 | Atacante externo anónimo. | Demo, o el entorno interno mal configurado |
| ACT-04 | Bot o *scraper* automatizado. | Demo |
| ACT-05 | Proveedor de tipos de cambio caído o comprometido, o un intermediario en la red. | Ambos |
| ACT-06 | Paquete de dependencia comprometido. | Ambos (CI y ejecución) |

### 3.4 Fronteras de confianza

- **TB-1:** navegador ↔ API (todo lo que llega a la API es no confiable).
- **TB-2:** navegador ↔ API de tipos de cambio (la respuesta es no confiable).
- **TB-3:** API ↔ fichero de base de datos.
- **TB-4:** CI ↔ registro de paquetes.

### 3.5 Amenazas (STRIDE)

| ID | STRIDE | Amenaza | Actor → activo | Medidas | Riesgo residual |
|---|---|---|---|---|---|
| T-01 | S | Cualquiera con acceso a la red usa la herramienta como si fuera un comercial (no hay login). | ACT-02, ACT-03 → A-01, A-02 | S-02 (solo red corporativa), RNF-SEC-19; en la demo, RNF-SEC-20 (sin datos reales). | **Aceptado** en el entorno interno (§3.6). |
| T-02 | S, T | Tipos de cambio falsificados (proveedor comprometido o intermediario). | ACT-05 → A-06 | Solo HTTPS, RNF-SEC-13 (validación). Los importes en otra divisa son orientativos y lo guardado está en EUR, que no se ve afectado. | Bajo: solo afecta a lo que se ve. |
| T-03 | T | El cliente envía importes manipulados para guardar un presupuesto falso. | ACT-01, ACT-02 → A-03 | RNF-SEC-03 (el servidor recalcula; los campos calculados se rechazan con `400`). | Ninguno. |
| T-04 | T | Inyección SQL a través de la búsqueda o de otros campos. | ACT-02, ACT-03 → A-01, A-03 | RNF-SEC-02, RNF-SEC-01. | Ninguno conocido. |
| T-05 | T | Asignación masiva: fijar `id`, `createdAt` o `pricing` desde la petición. | ACT-02, ACT-03 → A-03 | RNF-SEC-01, RNF-SEC-03. | Ninguno. |
| T-06 | T | Manipulación del fichero de base de datos en el servidor. | ACT-06, o acceso al host → A-03 | RNF-SEC-16 (sin root, solo lectura salvo el volumen). | Depende del host; las copias de seguridad quedan fuera de alcance. |
| T-07 | S, T | Una web maliciosa que visita el comercial lanza peticiones desde su navegador a la API interna (tipo CSRF). | ACT-03 → A-01, A-03 | Las escrituras exigen `application/json` (`415` si no), lo que obliga a una petición previa CORS que se rechaza para orígenes no permitidos (RNF-SEC-01, RNF-SEC-07). No hay cookies que aprovechar. | Bajo (CL-59). |
| T-08 | R | No se puede saber quién creó un cliente o una simulación. | ACT-01, ACT-02 → A-02 | `createdAt` y logs con ID de petición. | **Aceptado**: sin identidad no hay atribución (§3.6). |
| T-09 | I | Extracción masiva de datos personales recorriendo el listado o la búsqueda. | ACT-02, ACT-03, ACT-04 → A-01 | RNF-SEC-09 (paginación con máximo), RNF-SEC-08 (límite de peticiones), RNF-SEC-05 (sin email en el listado); la demo solo tiene datos ficticios. | Medio en el entorno interno: un actor paciente puede recorrerlo todo sin superar los límites. Aceptado bajo S-02. |
| T-10 | I | Enumeración de recursos o deducción del volumen de clientes por IDs secuenciales. | ACT-03 → A-01, A-02 | RNF-SEC-04 (UUID v7). | El UUID v7 revela el instante de creación, que ya es público en `createdAt`. |
| T-11 | I | Fuga de detalles internos en los errores. | ACT-03 → A-04 | RNF-SEC-10, RNF-SEC-06. | Ninguno. |
| T-12 | I | Datos personales en los logs. | Acceso a logs → A-01 | RNF-SEC-11; nginx sin log de acceso (D-134) y, en `/api/`, `error_log` a nivel `crit` (D-153). | Ninguno conocido. Con la API caída o un cuerpo de más de 64 KiB, nginx ya no escribe la línea de la petición con su consulta: contesta él mismo con un Problem RFC 9457 (D-152, AC-85). El healthcheck de Compose sigue avisando de que la API no responde. |
| T-13 | I, T | XSS: un nombre de empresa malicioso ejecuta código en el navegador del comercial. | ACT-02, ACT-03 → A-01, A-06 | RNF-SEC-14 (solo interpolación) y RNF-SEC-06 (CSP). | Bajo. |
| T-14 | I | Una caché intermedia o del navegador guarda respuestas con datos personales. | Terceros → A-01 | RNF-SEC-21. | Ninguno. |
| T-15 | D | Inundación de peticiones, cuerpos enormes o páginas enormes. | ACT-03, ACT-04 → A-04 | RNF-SEC-01 (16 KiB), RNF-SEC-08, RNF-SEC-09. | Bajo: no se protege frente a DoS distribuido (eso se hace en la infraestructura). |
| T-16 | D | Altas masivas automatizadas que llenan el disco o ensucian la demo. | ACT-03, ACT-04 → A-04 | RNF-SEC-08 (escrituras), RNF-SEC-20 (reinicio periódico y límite más estricto). | Bajo. |
| T-17 | D | La API de tipos cae o nos bloquea (`429`). | ACT-05 → A-04 (parcial) | Caché y vuelta a EUR (D-22, D-23); sin reintentos automáticos durante 20 min tras un `429`. | Bajo: EUR siempre funciona. |
| T-18 | E | Una dependencia comprometida ejecuta código en el CI o en el servidor. | ACT-06 → A-05 | RNF-SEC-15 (auditoría, *lockfile*, instalación reproducible), RNF-SEC-16 (limita el alcance del daño). | Medio: la auditoría solo detecta vulnerabilidades ya conocidas. |
| T-19 | E | Escape del contenedor al host aprovechando privilegios de root. | ACT-06 → A-05 | RNF-SEC-16. | Bajo. |

### 3.6 Por qué no hay login (D-30)

**Motivos:**

1. El enunciado describe una **herramienta interna** para el equipo comercial y no define roles ni permisos: todos los
   comerciales pueden hacer lo mismo (S-02).
2. Las operaciones están acotadas: **alta y consulta**. No hay edición ni borrado y las simulaciones son inmutables
   (D-29), así que un uso indebido no puede destruir ni alterar datos existentes.
3. En el entorno previsto, el control de acceso es responsabilidad de la **infraestructura** corporativa (red interna,
   VPN o un proxy con la identidad de la empresa), no de la aplicación (S-02).
4. Un login propio con usuarios inventados, sin un proveedor de identidad real, añadiría complejidad y una falsa
   sensación de seguridad.

**Riesgos residuales aceptados:** cualquiera con acceso a la red puede leer todos los datos de clientes (T-01, T-09) y
no hay atribución de acciones (T-08). Se compensan con la minimización (RNF-SEC-05), los límites (RNF-SEC-08 y 09) y
los logs sin datos personales (RNF-SEC-11).

**Cuándo deja de valer esta decisión:**

- si la herramienta se expone fuera de la red corporativa, salvo la demo, que tiene sus propias medidas;
- si aparecen roles distintos o operaciones destructivas;
- si se guardan datos reales en un entorno accesible desde Internet.

En cualquiera de esos casos, la autenticación pasa a ser Must, y el diseño permite añadirla como un paso previo a todas
las rutas (RNF-SEC-19).

**Demo pública:** en la demo no se cumple S-02. Por eso solo contiene datos ficticios, avisa de que no se introduzcan
datos reales, se reinicia de forma periódica y tiene límites más estrictos (RNF-SEC-20, D-47).
