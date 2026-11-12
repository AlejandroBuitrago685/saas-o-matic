# 07 · Criterios de aceptación

Formato Given/When/Then (en español: **Dado / Cuando / Entonces**). Cada criterio indica:

- **Refs:** requisitos y casos límite que cubre.
- **Nivel:** `U` unitario · `I` integración (API + base de datos real efímera) · `E` e2e (navegador) · `CI` comprobación
  automática en el pipeline · `R` revisión.
- **Vectores:** los vectores de prueba que lo parametrizan, cuando los hay.

Estos criterios son la base de los tests: cada test citará su `AC-xx`.

## 0. Condiciones comunes y casos límite nuevos

**Condiciones comunes:**

- Tests `I`: base de datos efímera, vacía o con datos de ejemplo conocidos, en cada ejecución.
- Tests `E`: la API externa de tipos se **intercepta** y devuelve los tipos de referencia de
  [`02-reglas-negocio.md`](02-reglas-negocio.md) §4.1, o la respuesta de error que pida cada criterio. Ningún test
  depende de la API real (RT-05).
- Las comparaciones de importes formateados ignoran el tipo de espacio (normal o duro).

**Casos límite añadidos en esta fase** (continúan la numeración de `01-analisis.md` §5):

| ID | Caso límite |
|---|---|
| CL-52 | NIF-IVA francés cuyo valor sin prefijo ya empieza por «FR» (`FR123456789`): se valida tal cual antes de intentar quitar el prefijo. |
| CL-53 | EIN con un prefijo que el IRS no asigna (`00`, `07`…). |
| CL-54 | Número de IVA de Irlanda del Norte (`XI…`) con país GB. |
| CL-55 | Conversión en la que el total o la base convertidos directamente no coinciden con la suma de las partidas convertidas (GBP y JPY con los tipos de referencia). |
| CL-56 | Valor con estructura de CIF de clave W que se puede confundir con un NIE (`W1234567L`). |
| CL-57 | CIF cuyos dígitos empiezan por `00` (`J00000000`, `J0000000J`). |
| CL-58 | Precisión del slider en los límites de tramo (10/11 y 50/51) con la escala por segmentos. |
| CL-59 | Escritura sin `Content-Type: application/json` o desde un origen no permitido (por ejemplo, un formulario de otra web). |
| CL-60 | Tipos en caché caducados y fallo del refresco. |

## 1. Tarificación e impuestos

**AC-01 · Base, impuesto y total por tramos** · Refs: RF-08, RF-09, CL-02…CL-09, CL-13 · Nivel: U · Vectores: TV-PR-01…09
- Dado la tarifa `STANDARD` y el tipo de ES (2 100 bps)
- Cuando se calcula el precio para los usuarios de cada vector
- Entonces las unidades por tramo, `baseCents`, `taxCents` y `totalCents` coinciden con el vector, y el desglose solo contiene los tramos con unidades.

**AC-02 · Acumulativo, no por volumen** · Refs: RF-08, CL-05, CL-11 · Nivel: U · Vectores: TV-PR-04
- Dado 15 usuarios
- Cuando se calcula la base
- Entonces es 14 000 (10 × 1 000 + 5 × 800) y no 12 000 (15 × 800).

**AC-03 · Propiedades del cálculo** · Refs: RF-08, CL-10 · Nivel: U
- Dado cualquier `n` de 2 a 10 000
- Cuando se calculan `base(n)` y `base(n − 1)`
- Entonces la diferencia es el precio del tramo de `n`, y `base(n) > base(n − 1)`.

**AC-04 · Impuesto por país** · Refs: RF-09, CL-13, CL-14 · Nivel: U · Vectores: TV-TX-01…07
- Dado una base de 14 000 y cada país de la lista
- Cuando se calcula el impuesto
- Entonces `taxCents` y `totalCents` coinciden con el vector (US: impuesto 0 y total = base).

**AC-05 · Redondeo comercial** · Refs: RNF-04, CL-15 · Nivel: U · Vectores: TV-RD-01…05
- Dado una base y un tipo hipotético en bps
- Cuando se calcula el impuesto
- Entonces se redondea al céntimo con la mitad hacia arriba (TV-RD-01 da 3 443, no 3 442), sin usar coma flotante.

**AC-06 · El plan cambia el precio solo con datos** · Refs: RNF-25, D-08 · Nivel: U
- Dado una tarifa alternativa (p. ej. tramos 1–5 a 2 000 y desde 6 a 1 000) asignada a un plan en la configuración de prueba
- Cuando se calcula el precio para 8 usuarios con ese plan
- Entonces la base es 13 000 (5 × 2 000 + 3 × 1 000), y la función de cálculo no se ha modificado (es la misma que usa AC-01).

**AC-07 · Configuración de negocio inválida** · Refs: RNF-SEC-12, RNF-25 · Nivel: U/I
- Dado una tarifa con huecos entre tramos, que no empieza en 1, con más de un tramo sin límite o con precios no enteros; o un tipo impositivo fuera de 0–10 000 bps
- Cuando arranca el servicio
- Entonces el arranque falla con un mensaje que dice qué dato no es válido, y no se aceptan peticiones.

## 2. Validación fiscal

**AC-10 · DNI** · Refs: RF-03, CL-18, CL-19 · Nivel: U · Vectores: TV-ES-01…07
- Dado el país ES y cada entrada del vector
- Cuando se valida el identificador
- Entonces el resultado (válido con tipo `DNI`, o el motivo) coincide con el vector.

**AC-11 · NIE** · Refs: RF-03, CL-20 · Nivel: U · Vectores: TV-ES-08…12
- Ídem con tipo `NIE`.

**AC-12 · CIF** · Refs: RF-03, CL-20…CL-24, CL-56, CL-57, D-50 · Nivel: U · Vectores: TV-ES-13…27, TV-ES-29, TV-ES-31…34
- Dado el país ES y cada entrada del vector
- Cuando se valida
- Entonces el resultado coincide, incluidos los casos reales `Q2826000H` (AEAT, control letra) y los CIF de Telefónica, Inditex, Mercadona y Banco Santander (control dígito), todos válidos; las claves que exigen dígito o letra y el caso `W1234567L` (`INVALID_FORMAT`: no es un NIE y la L no es un control de CIF posible).

**AC-13 · NIF especiales K, L, M** · Refs: RF-03, D-12 · Nivel: U · Vectores: TV-ES-28
- Dado `K1234567L`, `L1234567L` o `M1234567L` con país ES
- Cuando se valida
- Entonces el motivo es `UNSUPPORTED_TYPE`, aunque el carácter de control sea correcto.

**AC-14 · Normalización** · Refs: RF-02, CL-25, CL-26 · Nivel: U · Vectores: TV-NO-01…11
- Dado cada entrada del vector con su país
- Cuando se normaliza y se valida
- Entonces el valor normalizado o el motivo coinciden con el vector, y ningún homóglifo Unicode (cirílico, ancho completo, `ſ`, raya) produce un identificador válido.

**AC-15 · Formatos por país** · Refs: RF-02, CL-27, CL-52, CL-53, CL-54 · Nivel: U · Vectores: TV-INT-01…31, TV-ES-30
- Dado cada entrada del vector con su país
- Cuando se valida
- Entonces el resultado, el tipo (`VAT` / `EIN`) y el valor normalizado coinciden, incluido `FR123456789` válido tal cual y los prefijos EIN no asignados rechazados.

**AC-16 · Un validador por país** · Refs: RNF-26, D-15 · Nivel: U
- Dado el conjunto de países del catálogo
- Cuando se compara con el conjunto de países que tienen validador
- Entonces son idénticos. Un país del catálogo sin validador hace fallar el test (y el arranque, según RNF-SEC-12).

## 3. API de clientes

**AC-20 · Alta válida** · Refs: RF-01, RNF-06, D-14, D-34 · Nivel: I
- Dado el cuerpo de ejemplo de [`04-contrato-api.md`](04-contrato-api.md) §3.2
- Cuando se envía `POST /customers`
- Entonces la respuesta es `201` con `Location: /customers/{id}`; el cuerpo trae `companyName` normalizado, `taxId` `B12345674`, `taxIdType` `CIF`, el email en minúsculas, `id` UUID v7 y `createdAt` en UTC; y `GET /customers/{id}` devuelve lo mismo.

**AC-21 · Errores de esquema** · Refs: RF-01, RNF-05, RNF-SEC-01, CL-17 · Nivel: I · Vectores: TV-NO-12
- Dado un cuerpo sin `companyName`, con `country` `XX`, `plan` `GOLD`, un email mal formado, `companyName` de 1 carácter y `taxId` de 33 caracteres (en peticiones separadas y en una combinada)
- Cuando se envía `POST /customers`
- Entonces la respuesta es `400` `VALIDATION_ERROR` con **todos** los errores (`REQUIRED`, `INVALID_ENUM`, `INVALID_FORMAT`, `TOO_SHORT`, `TOO_LONG`) y su `pointer`, y no se guarda nada.

**AC-22 · Campos desconocidos** · Refs: RNF-SEC-01, RNF-SEC-03 · Nivel: I
- Dado un cuerpo válido con un campo extra (`id`, `createdAt`, `isAdmin` o `__proto__`)
- Cuando se envía `POST /customers`
- Entonces la respuesta es `400` con `UNKNOWN_FIELD` en ese campo, y no se guarda nada.

**AC-23 · Tamaño y JSON** · Refs: RNF-SEC-01 · Nivel: I
- Dado un cuerpo de más de 16 KiB, o un JSON mal formado, o un JSON que no es un objeto (`[]`, `"x"`)
- Cuando se envía a cualquier `POST`
- Entonces la respuesta es `413` `PAYLOAD_TOO_LARGE` o `400` `MALFORMED_JSON`, respectivamente.

**AC-24 · Tipo de contenido** · Refs: RNF-SEC-01, CL-59 · Nivel: I
- Dado un `POST` con `Content-Type: text/plain`, `application/x-www-form-urlencoded`, `multipart/form-data` o sin cabecera
- Cuando se envía
- Entonces la respuesta es `415` `UNSUPPORTED_MEDIA_TYPE`.

**AC-25 · Identificador inválido para el país** · Refs: RF-02, RF-03, RNF-05 · Nivel: I · Vectores: TV-ES-04, TV-ES-28, TV-INT-27
- Dado un alta con `taxId` `12345678A` (ES), `K1234567L` (ES) o `00-1234567` (US)
- Cuando se envía `POST /customers`
- Entonces la respuesta es `422` `BUSINESS_RULE_VIOLATION` con `pointer: "/taxId"` y código `TAX_ID_INVALID_CHECK`, `TAX_ID_UNSUPPORTED_TYPE` o `TAX_ID_INVALID_FORMAT`, respectivamente.

**AC-26 · Duplicado** · Refs: RF-01, CL-28, D-17 · Nivel: I
- Dado un cliente con país ES y `taxId` `12345678Z`
- Cuando se da de alta otro con país ES y `taxId` `12.345.678-z`
- Entonces la respuesta es `409` `CUSTOMER_ALREADY_EXISTS` con `existingCustomerId` del primero; y con el mismo identificador en otro país (p. ej. `123456789` en PT y en DE) ambas altas se aceptan.

**AC-27 · Detalle** · Refs: RF-05, CL-49 · Nivel: I
- Dado un cliente existente
- Cuando se pide `GET /customers/{id}` con su id, con un UUID inexistente y con `abc`
- Entonces las respuestas son `200` (cliente completo con email), `404` `NOT_FOUND` y `400` (`location: "path"`), respectivamente.

**AC-28 · Listado completo** · Refs: RF-04, CL-37, CL-41, D-27 · Nivel: I
- Dado 25 clientes de ejemplo
- Cuando se pide `GET /customers` sin `q`, y luego con `q` formado solo por espacios
- Entonces se devuelven 20 elementos ordenados por nombre (sin distinguir mayúsculas ni acentos), con `page.total` = 25; `offset=20` devuelve los 5 restantes.

**AC-29 · Búsqueda sin mayúsculas ni acentos** · Refs: RF-04, CL-38 · Nivel: I
- Dado un cliente «Telefonía Ñandú S.A.»
- Cuando se busca `telefonia`, `ÑANDÚ` o `fonía`
- Entonces aparece en los resultados.

**AC-30 · Búsqueda por identificador** · Refs: RF-04, CL-39 · Nivel: I
- Dado un cliente con `taxId` `B12345674`
- Cuando se busca `b-1234`, `12345674` o `B12345674`
- Entonces aparece en los resultados.

**AC-31 · Comodines literales** · Refs: RF-04, CL-40, RNF-SEC-02 · Nivel: I
- Dado los clientes «100% Digital S.L.» y «Acme S.L.»
- Cuando se busca `%`, `_` o `100%`
- Entonces solo aparece «100% Digital S.L.» con `%` y `100%`, y no aparece ninguno con `_`. En ningún caso se devuelven todos.

**AC-32 · Límites de paginación y búsqueda** · Refs: RNF-SEC-09, CL-41 · Nivel: I
- Dado `GET /customers`
- Cuando `limit` es 0, 101 o `abc`, `offset` es −1, `q` tiene 101 caracteres o hay un parámetro desconocido
- Entonces la respuesta es `400` con el `pointer` del parámetro; sin `limit`, se devuelven 20 como máximo.

**AC-33 · Sin email en el listado** · Refs: RNF-SEC-05, D-42 · Nivel: I
- Dado clientes existentes
- Cuando se pide `GET /customers`
- Entonces ningún elemento contiene `contactEmail`.

**AC-34 · Catálogo** · Refs: RF-20, D-45 · Nivel: I
- Dado el servicio en marcha
- Cuando se pide `GET /catalog`
- Entonces la respuesta es igual al ejemplo de [`04-contrato-api.md`](04-contrato-api.md) §3.1, y con un parámetro de consulta → `400`.

## 4. API de simulaciones

**AC-40 · Simulación válida** · Refs: RF-07, RF-10, CL-05, D-18 · Nivel: I · Vectores: TV-PR-04
- Dado un cliente ES existente
- Cuando se envía `POST /simulations` con 15 usuarios, 250 GB y 1 200 000 llamadas
- Entonces la respuesta es `201` con `Location` y el `pricing` del ejemplo de [`04-contrato-api.md`](04-contrato-api.md) §3.6, y `GET /simulations/{id}` devuelve exactamente lo mismo.

**AC-41 · Usuarios inválidos** · Refs: RF-07, CL-01, CL-12, D-04 · Nivel: I · Vectores: TV-PR-10…15
- Dado cada valor de `activeUsers` del vector
- Cuando se envía `POST /simulations`
- Entonces la respuesta es `400` con el código del vector, y no se guarda nada.

**AC-42 · Importes enviados por el cliente** · Refs: RNF-SEC-03, CL-44, D-43 · Nivel: I
- Dado un cuerpo válido con `totalCents: 1`, `baseCents` o `pricing`
- Cuando se envía `POST /simulations`
- Entonces la respuesta es `400` `UNKNOWN_FIELD` y el número de simulaciones no cambia.

**AC-43 · Cliente inexistente o mal formado** · Refs: RF-07, CL-43 · Nivel: I
- Dado un `customerId` UUID válido que no existe, y otro que no es UUID
- Cuando se envía `POST /simulations`
- Entonces las respuestas son `422` `CUSTOMER_NOT_FOUND` en `/customerId` y `400` `INVALID_FORMAT`, respectivamente.

**AC-44 · Historial** · Refs: RF-11, CL-47 · Nivel: I
- Dado un cliente con 3 simulaciones creadas en orden, otro cliente sin simulaciones y un ID inexistente
- Cuando se pide `GET /customers/{id}/simulations` para cada uno
- Entonces se devuelven las 3 de la más reciente a la más antigua; `items: []` con `total: 0`; y `404`, respectivamente.

**AC-45 · Límites de almacenamiento y llamadas** · Refs: RF-07, CL-46, D-06 · Nivel: I
- Dado `storageGb` y `apiCallsPerMonth` con 0, el máximo, el máximo + 1 y −1
- Cuando se envía `POST /simulations`
- Entonces 0 y el máximo se aceptan, los otros dos valores dan `400` `OUT_OF_RANGE`, y ninguno cambia el precio.

**AC-46 · Instantánea del impuesto y la tarifa** · Refs: RF-10, CL-16, D-18 · Nivel: I
- Dado una simulación guardada con ES al 21 %
- Cuando la configuración cambia ES a 2 200 bps y se reinicia el servicio
- Entonces la simulación antigua sigue con `taxRateBps` 2 100 y sus importes, y una nueva usa 2 200.

**AC-47 · Métricas (Could)** · Refs: RF-19, D-26 · Nivel: I · Vectores: TV-ST-01…03
- Dado las simulaciones de cada vector
- Cuando se pide `GET /stats`
- Entonces los recuentos y `averageBaseCents` coinciden (`null` sin simulaciones).

**AC-48 · Health check (Should)** · Refs: RNF-24 · Nivel: I
- Dado el servicio con la base de datos disponible, y después sin ella
- Cuando se pide `GET /health`
- Entonces la respuesta es `200` `{ "status": "ok" }`, y después `503` sin detalles internos.

## 5. Seguridad transversal

**AC-50 · Error interno genérico** · Refs: RNF-SEC-10 · Nivel: I
- Dado un fallo provocado en la capa de datos durante una petición
- Cuando se procesa
- Entonces la respuesta es `500` `INTERNAL_ERROR`, con `instance` igual a `urn:uuid:` + `X-Request-Id` y sin trazas, SQL, rutas ni valores enviados; y el log contiene ese mismo ID.

**AC-51 · Límite de peticiones** · Refs: RNF-SEC-08 · Nivel: I
- Dado el límite de escrituras configurado en un valor bajo para el test
- Cuando una IP lo supera
- Entonces la siguiente petición recibe `429` `RATE_LIMITED` con `Retry-After`, y otra IP no se ve afectada.

**AC-52 · Cabeceras** · Refs: RNF-SEC-06, RNF-SEC-21 · Nivel: I/E
- Dado cualquier respuesta de la API y la página de la interfaz
- Cuando se inspeccionan sus cabeceras
- Entonces están las de RNF-SEC-06, no hay cabeceras que revelen la tecnología, todas llevan `Cache-Control: no-store` salvo `GET /catalog`, y la CSP de la interfaz no contiene `unsafe-eval` ni `unsafe-inline` en `script-src`.

**AC-53 · CORS** · Refs: RNF-SEC-07, CL-59 · Nivel: I
- Dado un origen permitido y otro no permitido
- Cuando cada uno envía una petición previa `OPTIONS` y un `POST /customers`
- Entonces el permitido recibe `Access-Control-Allow-Origin` con su origen, y el no permitido no recibe cabeceras CORS.

**AC-54 · Logs sin datos personales** · Refs: RNF-SEC-11 · Nivel: I
- Dado los logs capturados durante un alta, una búsqueda con `q=Acme` y una simulación
- Cuando se buscan en ellos el email, el `taxId`, el nombre de empresa, el valor de `q` y la IP completa
- Entonces no aparece ninguno.

**AC-55 · Configuración y secretos** · Refs: RNF-SEC-12 · Nivel: I/CI
- Dado una variable de entorno obligatoria ausente o inválida (p. ej. un origen CORS que no es una URL)
- Cuando arranca el servicio
- Entonces termina con un código distinto de 0 antes de escuchar peticiones; y el CI comprueba que no hay ficheros `.env` versionados (salvo `.env.example`).

**AC-56 · Sin inyección de HTML** · Refs: RNF-SEC-14 · Nivel: CI
- Dado el código del frontend
- Cuando se ejecuta la comprobación del CI
- Entonces falla si aparece un enlace a `innerHTML` / `outerHTML` o una llamada a `bypassSecurityTrust*`.

**AC-57 · Auditoría de dependencias** · Refs: RNF-SEC-15, RNF-21 · Nivel: CI
- Dado el *lockfile*
- Cuando se ejecuta el CI
- Entonces la instalación es reproducible y el pipeline falla si hay vulnerabilidades altas o críticas.

**AC-58 · Inventario cerrado** · Refs: RNF-SEC-17 · Nivel: I
- Dado el servicio
- Cuando se pide una ruta o un método fuera del contrato (p. ej. `DELETE /customers/{id}`, `GET /debug`, `PUT /simulations/{id}`)
- Entonces la respuesta es `404` `NOT_FOUND`, y la lista de rutas registradas coincide con la tabla de [`04-contrato-api.md`](04-contrato-api.md) §3.

**AC-59 · Sin peticiones salientes** · Refs: RNF-SEC-18 · Nivel: I/R
- Dado los tests de integración ejecutados con el acceso de red saliente bloqueado
- Cuando se ejecutan todos
- Entonces pasan; y la revisión confirma que el backend no tiene cliente HTTP saliente.

**AC-60 · Contenedor sin root (Should)** · Refs: RNF-SEC-16, RNF-20 · Nivel: CI
- Dado la imagen de contenedor
- Cuando se inspecciona
- Entonces el usuario no es root y el sistema de ficheros es de solo lectura salvo el volumen de datos.

**AC-61 · Demo protegida (Should)** · Refs: RNF-SEC-20, RNF-22, D-47 · Nivel: E/R
- Dado la demo desplegada
- Cuando se abre
- Entonces se ve el aviso de demo, solo hay datos de ejemplo, responde por HTTPS con HSTS, el límite de escrituras es de 5 por minuto e IP, y el reinicio periódico está programado.

**AC-62 · IDs UUID v7** · Refs: RNF-SEC-04, D-41 · Nivel: I
- Dado dos clientes y dos simulaciones creados en orden
- Cuando se inspeccionan sus `id`
- Entonces todos tienen versión 7 y variante RFC 9562, y no son correlativos.

**AC-63 · XSS en datos** · Refs: RNF-SEC-14, RNF-SEC-06 · Nivel: E
- Dado un cliente cuyo nombre es `<img src=x onerror=alert(1)>`
- Cuando se muestra en el listado y en el detalle
- Entonces aparece como texto literal y no se ejecuta ningún script.

## 6. Interfaz

**AC-70 · Estados del dashboard** · Refs: RF-14, RNF-08, CL-37, CL-41 · Nivel: E
- Dado sin clientes, con 25 clientes y con la API respondiendo `500`
- Cuando se abre `/`
- Entonces se ven, respectivamente, el estado vacío con «Crear el primer cliente»; 20 tarjetas con paginación «1–20 de 25»; y el error con «Reintentar». Mientras carga se ve el esqueleto.

**AC-71 · Búsqueda en vivo** · Refs: RF-14, CL-42 · Nivel: E
- Dado que la respuesta de la búsqueda `ac` tarda más que la de `acme`
- Cuando el usuario escribe `acme` de seguido
- Entonces se lanza como mucho una búsqueda tras 300 ms sin escribir y la lista final corresponde a `acme`. Si no hay coincidencias se ve «No hay clientes que coincidan con «…»».

**AC-72 · Alta correcta** · Refs: RF-06, D-28 · Nivel: E
- Dado el formulario de alta con datos válidos de ES
- Cuando se pulsa «Crear cliente»
- Entonces se navega al detalle del nuevo cliente y se ve «Cliente creado».

**AC-73 · Identificador inválido en el formulario** · Refs: RF-06, RF-03, CL-18 · Nivel: E · Vectores: TV-ES-04
- Dado el formulario con `12345678A` y país España
- Cuando se envía
- Entonces se ve bajo el campo «El carácter de control no es correcto. Revisa el identificador.», el foco va a ese campo y los demás datos se conservan.

**AC-74 · Duplicado en el formulario** · Refs: RF-06, CL-28 · Nivel: E
- Dado un cliente existente
- Cuando se intenta dar de alta otro con el mismo identificador y país
- Entonces se ve «Ya existe un cliente con este identificador fiscal» y el enlace «Ver cliente» lleva al existente.

**AC-75 · Cliente no encontrado** · Refs: RF-15, CL-49 · Nivel: E
- Dado `/customers/{UUID inexistente}` y `/customers/abc`
- Cuando se abren
- Entonces se ve «Cliente no encontrado» con enlace al inicio.

**AC-76 · Proyección de 15 usuarios** · Refs: RF-16, CL-05, CL-13, D-11 · Nivel: E · Vectores: TV-PR-04, TV-FX-06
- Dado el detalle de un cliente ES con la divisa EUR
- Cuando se fija 15 en el campo numérico de usuarios
- Entonces la proyección muestra el tramo 1 (10 × 10,00 € = 100,00 €), el tramo 2 (5 × 8,00 € = 40,00 €), base 140,00 €, impuesto (ES, 21 %) 29,40 € y total 169,40 €.

**AC-77 · Slider y campo sincronizados** · Refs: RF-16, CL-48, D-04, D-05 · Nivel: E
- Dado el simulador
- Cuando se mueve el slider, y después se escribe 37 y luego 10001 o 0 en el campo
- Entonces el campo refleja el slider; con 37 el slider se coloca en su posición; con 10001 o 0 se ve un error de rango, la proyección conserva el último valor válido y «Guardar simulación» queda deshabilitado.

**AC-78 · Guardar y aparecer en el historial** · Refs: RF-17, RF-11, CL-47, RT-02 · Nivel: E
- Dado un cliente sin simulaciones (el historial muestra «Aún no hay simulaciones…»)
- Cuando se proyectan 51 usuarios y se pulsa «Guardar simulación»
- Entonces se ve «Simulación guardada» y la primera tarjeta del historial muestra exactamente la misma base, impuesto y total que la proyección (425,00 €, 89,25 €, 514,25 €).

**AC-79 · Conversión con partidas hoja** · Refs: RF-13, CL-34, CL-35, CL-55, D-20 · Nivel: E · Vectores: TV-FX-01…06
- Dado la proyección de 15 usuarios (ES) con los tipos de referencia
- Cuando se selecciona cada divisa
- Entonces las partidas, la base y el total coinciden con el vector (GBP total 141,61; JPY base 24.812 sin decimales); el precio unitario sigue en EUR; y se ve la nota «Importes orientativos… con tipos del 12/11/2026».

**AC-80 · Estado de error de la API de tipos** · Refs: RF-12, RNF-08, RNF-SEC-13, CL-29, CL-30, CL-31, D-51 · Nivel: E
- Dado que la API simulada devuelve, en cada caso: un error de red; un `500`; un `429`; un `200` con `"result": "error"`; o un `200` con `base_code: "USD"`, y no hay tipos en caché
- Cuando se abre la aplicación **con EUR seleccionado**
- Entonces, sin que el usuario haga nada, el indicador de la cabecera muestra «No se han podido obtener los tipos de cambio» y el botón «Reintentar»; solo EUR está disponible; y los importes en EUR son correctos.
- Y cuando la API pasa a responder bien y se pulsa «Reintentar», el indicador pasa por «Cargando tipos de cambio…» a «Tipos del 12/11/2026» y se habilitan las demás divisas (incluso después de un `429`).
- Y si se recibe un `200` sin `GBP`, el indicador muestra la fecha de los tipos y solo GBP aparece deshabilitada.

**AC-81 · Estado de carga de la API de tipos** · Refs: RF-12, RNF-08, CL-32, D-51 · Nivel: E
- Dado que la API simulada tarda 3 s en responder y no hay tipos en caché
- Cuando se abre el detalle y se mueve el slider
- Entonces, desde el primer momento y hasta que llega la respuesta, el indicador muestra «Cargando tipos de cambio…» con su indicador de actividad; la proyección en EUR se actualiza con normalidad; y al llegar los tipos el indicador muestra su fecha y se habilitan las demás divisas.
- Y con tipos caducados y un refresco en curso, el indicador muestra la fecha anterior más «Actualizando…».

**AC-82 · Caché y estado de tipos desactualizados** · Refs: RF-12, RNF-08, CL-36, CL-60, D-23, D-51 · Nivel: E
- Dado tipos en caché obtenidos hace 30 min
- Cuando se recarga la aplicación
- Entonces no se hace ninguna petición y el indicador muestra «Tipos del 12/11/2026».
- Dado tipos en caché obtenidos hace 2 h, con `time_last_update_unix` de hace 20 h, y que el refresco falla
- Cuando se recarga la aplicación con USD seleccionado
- Entonces el indicador muestra «Tipos desactualizados del {fecha}» y el botón «Reintentar», y los importes siguen en USD con `≈`, usando los tipos guardados.
- Dado tipos en caché de hace 3 días y que el refresco falla
- Cuando se recarga la aplicación
- Entonces se ve el estado de error de AC-80 y solo EUR está disponible.

**AC-83 · Atribución** · Refs: RF-18, D-24 · Nivel: E
- Dado cualquier vista
- Cuando se inspecciona el pie
- Entonces hay un enlace «Rates By Exchange Rate API» a `https://www.exchangerate-api.com`.

**AC-84 · 360 px** · Refs: RNF-07, CL-50 · Nivel: E
- Dado una ventana de 360 × 800 y un cliente con un nombre de 200 caracteres y un email de 254
- Cuando se recorren el dashboard, el alta y el detalle
- Entonces no hay desplazamiento horizontal y todo el texto es visible.

**AC-85 · Backend caído** · Refs: RNF-08, CL-51 · Nivel: E
- Dado que la API no responde
- Cuando se abren el dashboard, el alta y el detalle
- Entonces cada vista muestra su estado de error con «Reintentar», nunca una pantalla en blanco.

**AC-86 · Accesibilidad básica (Should)** · Refs: RNF-13, CL-48 · Nivel: E
- Dado el simulador manejado solo con teclado
- Cuando se usan las flechas, Inicio, Fin, Re Pág y Av Pág sobre el slider, y se recorre el formulario de alta con el tabulador
- Entonces el valor cambia según [`05-frontend.md`](05-frontend.md) §3.4.1, todos los controles tienen etiqueta y el foco es visible (el `aria-valuetext` del slider, que es Must, se comprueba en AC-91); y una auditoría automática de accesibilidad no encuentra infracciones graves.

**AC-87 · Historial convertido** · Refs: RF-15, D-19 · Nivel: E
- Dado un cliente con simulaciones
- Cuando se selecciona USD
- Entonces las tarjetas del historial muestran los importes en USD con la regla de D-20, el tipo impositivo guardado y la nota «Convertido al tipo de cambio actual…».

**AC-88 · Cambio de divisa durante la carga** · Refs: RF-13, CL-33 · Nivel: E
- Dado que los tipos están cargando
- Cuando se selecciona GBP y luego JPY antes de que lleguen
- Entonces, al llegar, los importes se muestran en JPY.

**AC-89 · Doble clic en guardar** · Refs: RF-17, CL-45 · Nivel: E
- Dado el simulador con valores válidos
- Cuando se hace doble clic en «Guardar simulación»
- Entonces se crea una sola simulación.

**AC-90 · Proyección sin latencia** · Refs: RNF-09 · Nivel: E
- Dado el simulador
- Cuando se cambia el número de usuarios
- Entonces el total actualizado es visible en menos de 100 ms (medido en el test e2e en el equipo de CI, con margen documentado).

**AC-91 · Escala del slider y anuncio accesible** · Refs: RF-16, RNF-13, CL-48, CL-58, D-05, D-48, D-49 · Nivel: U/E · Vectores: TV-SL-01…16
- Dado la función de conversión de [`05-frontend.md`](05-frontend.md) §3.4.1
- Cuando se evalúa con cada vector, con todas las posiciones (0–279) y con todos los valores (1–10 000)
- Entonces los resultados coinciden con los vectores y se cumplen las cuatro propiedades: monotonía, ida y vuelta desde la posición, ida y vuelta desde el valor (10, 11, 50 y 51 incluidos) y desviación máxima de medio paso.
- Y en el navegador, al llevar el slider con el teclado a 10, 11, 50 y 51, se alcanzan exactamente esos valores, la proyección cambia de tramo en 11 y en 51, y `aria-valuetext` anuncia «10 usuarios», «11 usuarios», «50 usuarios» y «51 usuarios». Con 105 escrito en el campo numérico, `aria-valuetext` dice «105 usuarios».

**AC-92 · Métricas en el dashboard (Could)** · Refs: RF-19 · Nivel: E
- Dado datos de ejemplo conocidos
- Cuando se abre el dashboard
- Entonces las tres métricas coinciden con `GET /stats`, con el importe medio en la divisa seleccionada; y si `/stats` falla, el listado sigue funcionando.

## 7. Entrega

**AC-93 · Stack y calidad de código** · Refs: RNF-01, RNF-02, RNF-03, RNF-10 · Nivel: R/CI
- Dado el repositorio
- Cuando se revisa y se ejecuta el CI
- Entonces el backend es Node.js + TypeScript con SQLite y expone la API REST de [`04-contrato-api.md`](04-contrato-api.md); el lint y el formato pasan sin errores; y se cumplen las reglas de modularidad y tamaño de fichero que se fijen en la fase de arquitectura.

**AC-94 · Repositorio público y decisión de autenticación documentada** · Refs: RNF-19, RNF-SEC-19, D-30 · Nivel: R
- Dado el repositorio entregado
- Cuando se revisa
- Entonces es público en GitHub, y [`06-seguridad.md`](06-seguridad.md) §3.6 documenta por qué no hay login, sus supuestos y el riesgo residual.

**AC-95 · Arranque en limpio** · Refs: RNF-18, RNF-14, RNF-23, D-53 · Nivel: CI
- Dado un clon limpio del repositorio
- Cuando se ejecutan los comandos del README (instalar, migrar, sembrar, arrancar) en Linux con Node 22, 24 y 26, y en Windows y macOS con la versión de `.nvmrc` (prueba de humo)
- Entonces el backend responde en `GET /health` y la interfaz carga el dashboard con los datos de ejemplo, sin pasos manuales adicionales.

**AC-96 · CI con matriz** · Refs: RNF-21, RNF-12, D-52, D-53 · Nivel: CI
- Dado un *push* o una *pull request*
- Cuando se ejecuta el pipeline
- Entonces lint, tests unitarios, tests de integración y build se ejecutan en Node 22, 24 y 26; los e2e y la auditoría de dependencias, una sola vez, con la versión de `.nvmrc`; y cualquier fallo bloquea la integración.

**AC-97 · Docker Compose (Should)** · Refs: RNF-20 · Nivel: CI
- Dado Docker instalado
- Cuando se ejecuta el comando documentado de Compose
- Entonces la aplicación queda accesible en la URL documentada y `GET /health` devuelve `200`.

**AC-98 · Versiones de Node** · Refs: RNF-23, D-37, D-38 · Nivel: CI
- Dado el `package.json` raíz
- Cuando se inspecciona
- Entonces `engines.node` es `^22.22.3 || ^24.15.0 || >=26.0.0` y existe `.nvmrc` con `26`.

**AC-99 · Espacio de trabajo con IA** · Refs: RNF-15, RNF-16, RNF-17 · Nivel: R
- Dado el repositorio entregado
- Cuando se revisa `/ai-workspace`
- Entonces contiene el enunciado, el análisis, las decisiones, la especificación, la arquitectura y los prompts literales de cada fase.
