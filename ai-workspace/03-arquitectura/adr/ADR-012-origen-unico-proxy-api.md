# ADR-012 · Origen único: la SPA llama a `/api` y un proxy quita el prefijo

- **Estado:** aceptada (D-65, validada el 2026-11-12) · **Fecha:** 2026-11-12

## Contexto

La API tiene rutas literales sin prefijo (D-31): `/customers/{id}`. La SPA también tiene la ruta `/customers/:id`.
Servidas en el mismo origen, chocarían. Servidas en orígenes distintos, hace falta CORS en todo momento, la CSP
necesita el origen de la API y se complica la configuración por entorno.

## Decisión

- La SPA siempre llama a rutas relativas `/api/…`.
- Un proxy reenvía `/api/*` a la API **quitando el prefijo**: `ng serve` con un *proxy config* en desarrollo, y nginx
  en Docker y en la demo. La API conserva sus rutas literales.
- CORS sigue configurado con lista cerrada (RNF-SEC-07) para usos directos, pero el flujo normal es del mismo origen.

## Alternativas

- **Prefijar las rutas de la API con `/api`:** contradice D-31 y el enunciado.
- **API en otro dominio o puerto, con CORS:** más configuración, CSP con dos orígenes y peticiones previas en cada
  escritura.
- **Hash routing en la SPA** (`/#/customers/…`): evita el choque, pero empeora las URL y la accesibilidad.

## Consecuencias

- `connect-src 'self'` (más `https://open.er-api.com`) en la CSP.
- La misma topología en desarrollo, en Docker y en la demo, así que no hay sorpresas por entorno.
- El proxy es el lugar natural para las cabeceras de la SPA y el límite de tamaño del cuerpo como defensa adicional.
