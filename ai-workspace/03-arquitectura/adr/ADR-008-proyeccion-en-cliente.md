# ADR-008 · Proyección calculada en el navegador con el dominio compartido

- **Estado:** propuesta (D-61) · **Fecha:** 2026-11-12

## Contexto

El simulador debe proyectar la factura en tiempo real (RNF-09: < 100 ms) y coincidir al céntimo con lo que guarda el
servidor (RT-02). La spec dejaba abierta la opción de un endpoint `POST /simulations/preview` (spec `04` §3).

## Decisión

- La web calcula la proyección con `calculatePricing` y `convertPricing` de `domain`, usando la tarifa del plan y el
  tipo del país que da `GET /catalog`. Son `computed` sobre signals: no hay red al mover el slider.
- El servidor **siempre recalcula** al guardar con la misma función (RNF-SEC-03), y el historial muestra el
  `pricing` de la respuesta.
- **No se añade `POST /simulations/preview`.**

## Alternativas

- **Endpoint de previsualización con *debounce*:** una sola implementación en el servidor, pero añade latencia de red
  en cada movimiento, depende de que la API esté disponible para algo tan visual como el slider, hace muchas más
  peticiones (y choca con el límite de peticiones) y añade otro endpoint al inventario.
- **Implementación duplicada en la web:** es exactamente el riesgo de RT-02.

## Consecuencias

- La proyección es instantánea y funciona aunque la API tarde.
- La coincidencia entre proyección y servidor se garantiza por construcción (mismo código) y se comprueba en AC-78
  y con un test de contrato (vectores TV-PR contra `POST /simulations`).
- Si en el futuro el precio dependiera de datos que el navegador no debe conocer, habría que revisar esta decisión.
