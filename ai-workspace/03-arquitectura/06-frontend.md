# 06 · Frontend (`apps/web`)

Angular 22 con componentes standalone, signals y el nuevo control flow (`@if`, `@for`, `@switch`). Las API usadas se
han comprobado como **estables** en los tipos de Angular 22.2.6: `resource` y `httpResource` (estables desde 22.0),
Signal Forms (`form`, estable desde 22.0), `provideZonelessChangeDetection` (desde 20.2) y `linkedSignal` y `effect`
(desde 20.0). Decisión en [ADR-011](adr/ADR-011-frontend-signals.md).

## 1. Arranque

- `provideZonelessChangeDetection()`: sin Zone.js. La detección de cambios la dirigen los signals.
- `provideRouter(routes, withComponentInputBinding())`, con rutas cargadas de forma diferida (`loadComponent`) por feature.
- `provideHttpClient(withFetch(), withInterceptors([apiBaseInterceptor, apiErrorInterceptor]))`. Todas las llamadas a
  la API van a la ruta relativa `/api/…` (ADR-012).
- **Sin estilos de componente**: no se usan `styles` ni `styleUrl`; solo utilidades de Tailwind y una hoja global.
  Así la CSP puede ser `style-src 'self'` sin `unsafe-inline` (RNF-SEC-06, regla de lint en 09-calidad §3).
- **Build de producción con `optimization.styles.inlineCritical: false`** (D-70). Verificado el 2026-11-12 con una
  app nueva de Angular 22.2 compilada en producción:
  - Con el valor por defecto (`true`), el `index.html` lleva un `<style>` con el CSS crítico y la hoja global con
    `media="print"`, más un **`<script>` en línea** al final del `body` que la pasa a `all`. Con
    `script-src 'self'`, ese script se bloquea y la app quedaría **sin estilos**.
  - Con `false`: 0 `<style>`, 0 `<script>` en línea, ningún atributo `on*` y un `<link rel="stylesheet">` normal.
  - AC-64 lo vigila en cada ejecución de los e2e.

## 2. Estructura

```text
src/app/
├── app.config.ts · app.routes.ts · app.component.ts
├── core/                         # servicios globales y estructura de la app (se instancian una vez)
│   ├── api/                      # interceptores, ApiError, parseo de Problem Details
│   ├── catalog/                  # CatalogStore (GET /api/catalog)
│   ├── currency/                 # ExchangeRatesStore, CurrencyStore, parser de la API externa, caché
│   ├── errors/                   # error-messages.ts (diccionario exhaustivo de mensajes en español)
│   └── layout/                   # cabecera (selector de divisa + indicador de tipos), pie (atribución), aviso de demo
├── shared/                       # UI reutilizable sin estado de negocio
│   ├── ui/                       # card, skeleton, empty-state, error-state, field-error, spinner
│   └── format/                   # pipe money (es-ES, ≈ en divisas distintas de EUR), fechas
└── features/
    ├── dashboard/                # página, buscador, listado, paginación, métricas
    ├── customer-create/          # página y formulario de alta (Signal Forms)
    ├── customer-detail/          # página, tarjeta del cliente, historial de simulaciones
    └── simulator/                # componente simulador, slider de usuarios, panel de proyección
```

| Zona | Puede importar | No puede importar |
|---|---|---|
| `features/x` | `core`, `shared`, `@saas-o-matic/domain`, tipos de `@saas-o-matic/contract` | Otra feature (salvo `simulator`, que usa `customer-detail`) |
| `core` | `shared`, `domain`, tipos de `contract` | `features` |
| `shared` | `domain` (para formatear) | `core`, `features` |

`simulator` se monta dentro de `customer-detail` (spec `05` §3.3). Es la única dependencia entre features permitida
y la regla de fronteras la declara de forma explícita.

## 3. Estado con signals

Principios:

1. El estado vive en **signals** privados y se expone como `Signal` de solo lectura (`asReadonly()`), junto con
   métodos de comando (`select(currency)`, `retry()`).
2. Lo derivado siempre con `computed`, nunca copiado a mano.
3. Las lecturas asíncronas, con `httpResource` / `resource` (estados `loading`, `error`, `value` y `reload()`).
   Las escrituras, con `HttpClient`.
4. `linkedSignal` para estado que se reinicia cuando cambia su origen (p. ej. la página vuelve a 1 cuando cambia la búsqueda).
5. `effect` **solo para efectos externos**: guardar en `localStorage` o anunciar a lectores de pantalla. Nunca para
   sincronizar un signal con otro.
6. Los *stores* son servicios inyectables. Los globales se proveen en `root`; los de una feature, en la ruta o el
   componente, para que su estado muera con la vista.

| Store | Ámbito | Estado |
|---|---|---|
| `CatalogStore` | root | `httpResource` de `/api/catalog`; `tariffFor(plan)`, `taxRateFor(country)`, `limits` |
| `ExchangeRatesStore` | root | Máquina de estados de los tipos (§4) |
| `CurrencyStore` | root | Divisa seleccionada (EUR por defecto) y divisas disponibles (`computed` a partir de los tipos) |
| `CustomerSearchStore` | ruta `/` | `q` (sincronizado con la URL), página, resultado y métricas |
| `CustomerDetailStore` | ruta `/customers/:id` | Cliente e historial paginado (`Cargar más`) |
| `SimulatorStore` | componente | `users`, texto en bruto del campo, almacenamiento, llamadas, proyección (`computed`) y estado del guardado |

## 4. Divisas y estado de la API externa (D-22, D-23, D-51)

- **Divisa seleccionada:** `CurrencyStore.selected` (signal). Se mantiene al navegar. Recordarla tras recargar es
  Could (`localStorage` con `try/catch`).
- **Tipos de cambio:** `ExchangeRatesStore`, una máquina de estados con un signal de tipo unión discriminada:

  ```text
  RatesState =
    | { status: 'loading' }
    | { status: 'fresh';      rates; updatedAt; fetchedAt }
    | { status: 'refreshing'; rates; updatedAt; fetchedAt }
    | { status: 'stale';      rates; updatedAt; fetchedAt; failure }
    | { status: 'error';      failure }
  ```

  - Petición con `fetch` y `AbortSignal.timeout(5000)` a `https://open.er-api.com/v6/latest/EUR`, sin pasar por la API propia.
  - La respuesta se valida con un **parser propio** (`core/currency/exchange-rates.parser.ts`): las cuatro reglas de
    spec `05` §4.3 más la validación por divisa, sin Zod en el bundle. Su resultado es un `Result`.
  - Caché en `localStorage` (`{ fetchedAt, payload }`) con `try/catch`. Se considera vigente durante 1 h desde
    `fetchedAt`; si el refresco falla, se usa durante un máximo de 48 h desde `updatedAt`.
  - Tras un `429`, no hay intentos automáticos durante 20 min. `retry()` (el botón «Reintentar») siempre lanza la petición.
  - Las transiciones son funciones puras (`nextRatesState(estado, evento, ahora)`), así que la máquina se prueba sin
    Angular, con un reloj inyectado.
- **Indicador:** `RatesStatusComponent` en `core/layout/header`, siempre presente en la cabecera. Lee
  `ExchangeRatesStore.state` y muestra el texto, el indicador de actividad o el botón «Reintentar» de cada estado
  (spec `05` §4.4). Tiene `role="status"` con `aria-live="polite"`. No depende de la divisa seleccionada, así que el
  error se ve también en EUR (D-51).
- **Conversión:** el pipe `money` y `convertPricing` de `domain` aplican la regla de partidas hoja (D-20) con los
  decimales ISO 4217. El formato usa `Intl.NumberFormat('es-ES', { style: 'currency', currency })`, con `≈` delante
  cuando la divisa no es EUR.

## 5. Errores de la API → mensajes en español

1. `apiErrorInterceptor` convierte cualquier respuesta de error en un `ApiError`:
   `{ status, code, errors[], reference }`, con los tipos de `contract`. `reference` son los 8 primeros caracteres de `instance`.
   Un fallo de red o un cuerpo que no es Problem Details se convierte en `code: 'NETWORK_ERROR'` o `'UNKNOWN_ERROR'`.
2. `core/errors/error-messages.ts` es un diccionario
   `satisfies Record<ProblemCode | FieldErrorCode | ClientErrorCode, MessageFn>`. Si se añade un código al contrato y
   no tiene mensaje, **no compila**. Los mensajes reciben parámetros (`{min}`, `{max}`, `{país}`, `{tipos}`,
   `{Retry-After}`) del catálogo o de la respuesta (spec `05` §6).
3. Los formularios asignan `errors[].pointer` (`/taxId`) a su campo y muestran el mensaje con `field-error`. Los errores
   sin campo se muestran en un aviso del formulario o de la vista.

## 6. Proyección en tiempo real (ADR-008)

```text
users (signal, el último valor válido) ─┐
CatalogStore.tariffFor(customer.plan) ──┼─► pricing   = computed(calculatePricing(tarifa, users, bps del país))   [EUR]
CatalogStore.taxRateFor(customer.country)┘
CurrencyStore.selected + ExchangeRatesStore.rates ─► display = computed(convertPricing(pricing, divisa, tipos))   [D-20]
users ─► sliderPosition = computed(aPosición(users))      ;  evento del slider ─► users.set(aUsuarios(posición))
texto del campo ─► validación (entero, 1–10 000) ─► si es válido: users.set(n); si no: error en el campo y se conserva el último valor
```

- Todo es `computed` sobre funciones puras de `domain`: no hay llamada a la red al mover el slider (RNF-09), y
  `calculatePricing` es **el mismo código** que ejecuta la API al guardar.
- `aria-valuetext` del slider = «{users} usuarios», con el valor real del campo (D-48).
- El total se anuncia a los lectores de pantalla como mucho cada 500 ms, con un `effect` que solo escribe en la región `aria-live`.
- Al guardar, la tarjeta nueva del historial usa el `pricing` **de la respuesta**. AC-78 comprueba que coincide con la proyección.

## 7. Formularios

- **Alta de cliente:** Signal Forms (`form()` de `@angular/forms`, estable en 22). Los límites vienen de
  `CatalogStore.limits`, y la etiqueta y el ejemplo del identificador cambian con el país (spec `05` §3.2).
- **Simulador:** controles enlazados directamente a signals del store, sin formulario. Son tres campos con reglas
  simples.
- Botones de envío deshabilitados mientras hay una petición en curso (CL-45).
