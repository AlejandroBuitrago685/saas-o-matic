# 04 · Contrato de la API

Contrato REST entre la interfaz y el backend. Decisiones: D-31 a D-33 y D-41 a D-46. En la fase de arquitectura este
documento se traducirá a un contrato legible por máquina (inventario de API, RNF-SEC-17).

## 1. Convenciones

| Aspecto | Regla |
|---|---|
| Rutas | Literales, sin prefijo ni versión (`/customers`, `/simulations`) (D-31). |
| Formato | JSON UTF-8 con nombres en `camelCase`. Las respuestas de error usan `application/problem+json` (RFC 9457). |
| Peticiones con cuerpo | `Content-Type: application/json` obligatorio (si no, `415`). Cuerpo de 16 KiB como máximo (si no, `413`). El cuerpo debe ser un objeto JSON. |
| Campos desconocidos | Cualquier campo de cuerpo o parámetro de consulta que no esté en el contrato → `400` `UNKNOWN_FIELD`. Incluye los importes calculados (D-43) y claves como `__proto__` o `constructor`. |
| IDs | UUID v7 (RFC 9562), en minúsculas y con guiones (D-41). |
| Fechas | ISO 8601 en UTC con milisegundos: `2026-11-12T10:00:00.000Z`. |
| Importes | Enteros en céntimos de EUR, con sufijo `Cents`, siempre acompañados de `currency: "EUR"`. |
| Tipos impositivos | Enteros en puntos básicos, con sufijo `Bps` (2 100 = 21 %). |
| Caché | `Cache-Control: no-store` en todas las respuestas, salvo `GET /catalog`, que no contiene datos personales (`max-age=300`). |
| Correlación | Todas las respuestas llevan `X-Request-Id` (UUID). En los errores, `instance` = `urn:uuid:<X-Request-Id>`. |
| Límite de peticiones | Por IP: 100 peticiones por minuto en total y 20 escrituras (`POST`) por minuto (D-44, configurable). Al superarlo → `429` con `Retry-After` en segundos. |
| Seguridad | Cabeceras, CORS y CSP según [`06-seguridad.md`](06-seguridad.md). |

### 1.1 Paginación

Los listados aceptan `limit` (entero de 1 a 100, por defecto 20) y `offset` (entero de 0 a 1 000 000, por defecto 0).
Fuera de esos rangos → `400`. Formato de la respuesta:

```json
{
  "items": [],
  "page": { "limit": 20, "offset": 0, "total": 0 }
}
```

## 2. Errores (RFC 9457)

### 2.1 Estructura

```json
{
  "type": "/problems/validation-error",
  "title": "Request validation failed",
  "status": 400,
  "detail": "The request body does not match the expected schema.",
  "instance": "urn:uuid:5d1f3c9a-2b7e-4c1d-9a8f-3e6b2c1d0a9f",
  "code": "VALIDATION_ERROR",
  "errors": [
    { "location": "body", "pointer": "/activeUsers", "code": "OUT_OF_RANGE" }
  ]
}
```

- `type`: URI relativa estable. `title` y `detail`: en inglés, sin datos internos (ni trazas, ni SQL, ni rutas de
  fichero) y sin repetir los valores enviados (D-33, RNF-SEC-10).
- `errors[]`: solo en `400` y `422`. `location` puede ser `body`, `query` o `path`, y `pointer` es un JSON Pointer
  (RFC 6901) relativo a esa ubicación. Se devuelven **todos** los errores de esquema a la vez.
- La interfaz traduce cada `code` a un mensaje en español ([`05-frontend.md`](05-frontend.md) §6).

### 2.2 Catálogo de respuestas de error

| Estado | `code` | `type` | Cuándo |
|---|---|---|---|
| 400 | `MALFORMED_JSON` | `/problems/malformed-json` | El cuerpo no es JSON válido o no es un objeto. |
| 400 | `VALIDATION_ERROR` | `/problems/validation-error` | Incumple el esquema: tipos, campos obligatorios, longitudes, rangos, enumerados, formato de email o UUID, campos desconocidos (D-32). |
| 404 | `NOT_FOUND` | `/problems/not-found` | El recurso de la URL no existe, o la ruta o el método no están en el contrato. |
| 409 | `CUSTOMER_ALREADY_EXISTS` | `/problems/customer-already-exists` | Ya existe un cliente con el mismo (`country`, `taxId` normalizado). Incluye `existingCustomerId`. |
| 413 | `PAYLOAD_TOO_LARGE` | `/problems/payload-too-large` | El cuerpo supera 16 KiB. |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | `/problems/unsupported-media-type` | La petición con cuerpo no es `application/json`. |
| 422 | `BUSINESS_RULE_VIOLATION` | `/problems/business-rule-violation` | Cumple el esquema pero viola una regla de negocio (ver códigos por campo). |
| 429 | `RATE_LIMITED` | `/problems/rate-limited` | Se ha superado el límite de peticiones. |
| 500 | `INTERNAL_ERROR` | `/problems/internal-error` | Error no controlado. Respuesta genérica (RNF-SEC-10). |
| 502, 504 | `SERVICE_UNAVAILABLE` | `/problems/service-unavailable` | **Lo emite nginx, no la API** (D-152): la API no responde (`502`) o tarda demasiado (`504`). Sin `instance`, porque la petición no llegó a la API. Con las cabeceras de la API (AC-52). Tipo `GatewayProblem` en `contract`; no está en el OpenAPI. |

**Códigos por campo** (`errors[].code`):

| Origen | Códigos |
|---|---|
| Esquema (400) | `REQUIRED`, `INVALID_TYPE`, `TOO_SHORT`, `TOO_LONG`, `OUT_OF_RANGE`, `INVALID_FORMAT` (email, UUID), `INVALID_ENUM`, `UNKNOWN_FIELD` |
| Negocio (422) | `TAX_ID_INVALID_FORMAT`, `TAX_ID_INVALID_CHECK`, `TAX_ID_UNSUPPORTED_TYPE`, `CUSTOMER_NOT_FOUND` |

### 2.3 Orden de evaluación

1. Ruta y método → `404`.
2. Límite de peticiones → `429`.
3. Peticiones con cuerpo: `Content-Type` → `415`; tamaño → `413`; JSON → `400 MALFORMED_JSON`.
4. Esquema de la ruta, el cuerpo y la consulta → `400 VALIDATION_ERROR`. Se devuelven **todos** los errores de la
   misma parte a la vez; si fallan varias partes, se responde con la primera que falla, en el orden ruta → cuerpo →
   consulta (D-117). Solo afecta a `GET /customers/{id}/simulations`, la única ruta con parámetros de ruta y de consulta.
5. Normalización y reglas de negocio → `422`.
6. Unicidad → `409`.
7. Recursos de la URL → `404`.
8. Éxito.

## 3. Endpoints

| Método y ruta | Propósito | Requisito | Prioridad |
|---|---|---|---|
| `GET /catalog` | Países, planes, tarifas y límites | RF-20 | Must |
| `POST /customers` | Alta de cliente | RF-01, RF-02, RF-03 | Must |
| `GET /customers` | Listado y búsqueda paginados | RF-04, RF-14 | Must |
| `GET /customers/{id}` | Detalle de cliente | RF-05, RF-15 | Must |
| `GET /customers/{id}/simulations` | Historial de simulaciones | RF-11, RF-15 | Must |
| `POST /simulations` | Registrar una simulación | RF-07, RF-08, RF-09, RF-10 | Must |
| `GET /simulations/{id}` | Detalle de simulación | RF-10 | Should |
| `GET /stats` | Métricas del dashboard | RF-19 | Could |
| `GET /health` | Comprobación de estado | RNF-24 | Should |

**Resuelto en arquitectura:** la proyección se calcula en el navegador con el dominio compartido, así que **no** se
añade `POST /simulations/preview` (D-61, [ADR-008](../03-arquitectura/adr/ADR-008-proyeccion-en-cliente.md)).

### 3.1 `GET /catalog`

Respuesta `200`:

```json
{
  "countries": [
    { "code": "ES", "taxRateBps": 2100, "taxIdTypes": ["DNI", "NIE", "CIF"], "taxIdPrefix": "ES" },
    { "code": "PT", "taxRateBps": 2300, "taxIdTypes": ["VAT"], "taxIdPrefix": "PT" },
    { "code": "FR", "taxRateBps": 2000, "taxIdTypes": ["VAT"], "taxIdPrefix": "FR" },
    { "code": "DE", "taxRateBps": 1900, "taxIdTypes": ["VAT"], "taxIdPrefix": "DE" },
    { "code": "IT", "taxRateBps": 2200, "taxIdTypes": ["VAT"], "taxIdPrefix": "IT" },
    { "code": "GB", "taxRateBps": 2000, "taxIdTypes": ["VAT"], "taxIdPrefix": "GB" },
    { "code": "US", "taxRateBps": 0, "taxIdTypes": ["EIN"], "taxIdPrefix": null }
  ],
  "plans": [
    { "code": "STARTER", "tariffCode": "STANDARD" },
    { "code": "BUSINESS", "tariffCode": "STANDARD" },
    { "code": "ENTERPRISE", "tariffCode": "STANDARD" }
  ],
  "tariffs": [
    {
      "code": "STANDARD",
      "currency": "EUR",
      "tiers": [
        { "tier": 1, "fromUser": 1, "toUser": 10, "unitPriceCents": 1000 },
        { "tier": 2, "fromUser": 11, "toUser": 50, "unitPriceCents": 800 },
        { "tier": 3, "fromUser": 51, "toUser": null, "unitPriceCents": 500 }
      ]
    }
  ],
  "limits": {
    "activeUsers": { "min": 1, "max": 10000 },
    "storageGb": { "min": 0, "max": 100000 },
    "apiCallsPerMonth": { "min": 0, "max": 1000000000 },
    "companyName": { "min": 2, "max": 200 },
    "contactEmail": { "max": 254 },
    "taxId": { "min": 1, "max": 32 },
    "searchQuery": { "max": 100 },
    "pageSize": { "default": 20, "max": 100 }
  }
}
```

No admite parámetros de consulta (si llega alguno → `400`).

### 3.2 `POST /customers`

Petición:

```json
{
  "companyName": "  Acme   Ibérica S.L. ",
  "taxId": "esb-1234567-4",
  "country": "ES",
  "contactEmail": "Compras@Acme-Iberica.example",
  "plan": "BUSINESS"
}
```

| Campo | Esquema (400 si no se cumple) | Negocio (422) |
|---|---|---|
| `companyName` | Cadena obligatoria; tras normalizar (D-34), 2–200 caracteres y sin caracteres de control. | — |
| `taxId` | Cadena obligatoria, de 1 a 32 caracteres tal como llega. | Validador del país ([`03-validacion-fiscal.md`](03-validacion-fiscal.md)). |
| `country` | Obligatorio, uno de `ES PT FR DE IT GB US`. | — |
| `contactEmail` | Obligatorio, formato de email válido, 254 caracteres como máximo. | — |
| `plan` | Obligatorio, uno de `STARTER BUSINESS ENTERPRISE`. | — |

Respuesta `201`, con la cabecera `Location: /customers/01a1cf33-2d00-7a3e-9c41-5b7d2e8f1a60`:

```json
{
  "id": "01a1cf33-2d00-7a3e-9c41-5b7d2e8f1a60",
  "companyName": "Acme Ibérica S.L.",
  "taxId": "B12345674",
  "taxIdType": "CIF",
  "country": "ES",
  "contactEmail": "compras@acme-iberica.example",
  "plan": "BUSINESS",
  "createdAt": "2026-11-12T10:00:00.000Z"
}
```

Respuesta `422` (carácter de control incorrecto):

```json
{
  "type": "/problems/business-rule-violation",
  "title": "Business rule violation",
  "status": 422,
  "detail": "The tax identifier is not valid for the selected country.",
  "instance": "urn:uuid:7f3e2a1b-4c5d-4e6f-8a9b-0c1d2e3f4a5b",
  "code": "BUSINESS_RULE_VIOLATION",
  "errors": [ { "location": "body", "pointer": "/taxId", "code": "TAX_ID_INVALID_CHECK" } ]
}
```

Respuesta `409`:

```json
{
  "type": "/problems/customer-already-exists",
  "title": "Customer already exists",
  "status": 409,
  "detail": "A customer with this tax identifier already exists for this country.",
  "instance": "urn:uuid:2c4e6a8b-1d3f-4a5c-9e7b-6f8a0b2c4d6e",
  "code": "CUSTOMER_ALREADY_EXISTS",
  "existingCustomerId": "01a1cf33-2d00-7a3e-9c41-5b7d2e8f1a60"
}
```

Otras respuestas posibles: `400`, `413`, `415`, `429`.

### 3.3 `GET /customers`

| Parámetro | Regla |
|---|---|
| `q` | Opcional. Se eliminan los espacios de los extremos; 100 caracteres como máximo. Si queda vacío, devuelve todos los clientes. |
| `limit`, `offset` | Paginación (§1.1). |

Comportamiento (D-27):

- Un cliente coincide si `q` está contenido en `companyName` sin distinguir mayúsculas ni acentos, **o** si `q`
  normalizado (sin espacios, guiones ni puntos, en mayúsculas) está contenido en `taxId`.
- `%`, `_` y `\` de `q` se tratan como caracteres literales (RNF-SEC-02).
- Orden: `companyName` (alfabético, sin distinguir mayúsculas ni acentos) y, a igualdad, `id`.
- Cada elemento es un **resumen sin `contactEmail`** (D-42).

Respuesta `200`:

```json
{
  "items": [
    {
      "id": "01a1cf33-2d00-7a3e-9c41-5b7d2e8f1a60",
      "companyName": "Acme Ibérica S.L.",
      "taxId": "B12345674",
      "taxIdType": "CIF",
      "country": "ES",
      "plan": "BUSINESS",
      "createdAt": "2026-11-12T10:00:00.000Z"
    }
  ],
  "page": { "limit": 20, "offset": 0, "total": 1 }
}
```

Sin resultados → `200` con `items: []` y `total: 0`. Otras respuestas posibles: `400`, `429`.

### 3.4 `GET /customers/{id}`

- `200`: cliente completo, con el mismo formato que la respuesta `201` de §3.2.
- `400`: `id` no es un UUID (`location: "path"`, `pointer: "/id"`, `code: "INVALID_FORMAT"`).
- `404`: no existe.

### 3.5 `GET /customers/{id}/simulations`

- Parámetros: `limit` y `offset` (§1.1).
- Orden: `createdAt` descendente y, a igualdad, `id` descendente.
- `200`: `{ "items": [Simulation…], "page": {…} }`. Si el cliente no tiene simulaciones → `items: []`.
- `400`: `id` o paginación inválidos. `404`: el cliente no existe (es el recurso de la URL).

### 3.6 `POST /simulations`

Petición:

```json
{
  "customerId": "01a1cf33-2d00-7a3e-9c41-5b7d2e8f1a60",
  "activeUsers": 15,
  "storageGb": 250,
  "apiCallsPerMonth": 1200000
}
```

| Campo | Esquema (400) | Negocio (422) |
|---|---|---|
| `customerId` | Obligatorio, UUID. | `CUSTOMER_NOT_FOUND` si no existe. |
| `activeUsers` | Obligatorio, entero de 1 a 10 000. | — |
| `storageGb` | Obligatorio, entero de 0 a 100 000. | — |
| `apiCallsPerMonth` | Obligatorio, entero de 0 a 1 000 000 000. | — |
| Cualquier otro (`baseCents`, `totalCents`, `pricing`…) | `UNKNOWN_FIELD` (D-43). | — |

En JSON, «entero» significa un número sin parte fraccionaria: `15` y `15.0` son válidos; `"15"` y `15.5` no.

Respuesta `201`, con la cabecera `Location: /simulations/01a1cf45-7c80-7f21-a6b3-0d4e5f6a7b8c`
(cliente con país ES, tarifa `STANDARD`):

```json
{
  "id": "01a1cf45-7c80-7f21-a6b3-0d4e5f6a7b8c",
  "customerId": "01a1cf33-2d00-7a3e-9c41-5b7d2e8f1a60",
  "activeUsers": 15,
  "storageGb": 250,
  "apiCallsPerMonth": 1200000,
  "pricing": {
    "currency": "EUR",
    "tariffCode": "STANDARD",
    "tiers": [
      { "tier": 1, "fromUser": 1, "toUser": 10, "units": 10, "unitPriceCents": 1000, "subtotalCents": 10000 },
      { "tier": 2, "fromUser": 11, "toUser": 50, "units": 5, "unitPriceCents": 800, "subtotalCents": 4000 }
    ],
    "baseCents": 14000,
    "taxCountry": "ES",
    "taxRateBps": 2100,
    "taxCents": 2940,
    "totalCents": 16940
  },
  "createdAt": "2026-11-12T10:20:00.000Z"
}
```

`pricing.tiers` solo incluye los tramos con `units > 0`. Respuesta `422` si el cliente no existe:
`errors: [{ "location": "body", "pointer": "/customerId", "code": "CUSTOMER_NOT_FOUND" }]`.
Otras respuestas posibles: `400`, `413`, `415`, `429`.

### 3.7 `GET /simulations/{id}`

- `200`: la simulación, con el mismo formato que la respuesta `201` de §3.6.
- `400`: `id` no es un UUID. `404`: no existe.

### 3.8 `GET /stats` (Could)

Respuesta `200`:

```json
{ "customersCount": 2, "simulationsCount": 2, "averageBaseCents": 12400, "currency": "EUR" }
```

`averageBaseCents` es `null` si no hay simulaciones (TV-ST-01…03). No admite parámetros.

### 3.9 `GET /health` (Should)

- `200` con `{ "status": "ok" }` si la base de datos responde.
- `503` con `{ "status": "unavailable" }` si no responde.
- No da detalles internos.
