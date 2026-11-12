# ADR-011 · Frontend con stores de signals, `httpResource`, Signal Forms, sin Zone.js y sin estilos de componente

- **Estado:** propuesta (D-64) · **Fecha:** 2026-11-12

## Contexto

El stack pide Angular en su última versión estable, con signals. En Angular 22.2.6 son estables (comprobado en sus
tipos): `resource`/`httpResource` (desde 22.0), Signal Forms (desde 22.0) y `provideZonelessChangeDetection` (desde
20.2). La CSP de RNF-SEC-06 no admite `unsafe-inline` en scripts y prefiere evitarlo en estilos.

## Decisión

- **Estado:** servicios inyectables con signals privados expuestos de solo lectura, `computed` para lo derivado,
  `httpResource` para las lecturas y `effect` solo para efectos externos ([`../06-frontend.md`](../06-frontend.md) §3).
- **Sin Zone.js** (`provideZonelessChangeDetection`).
- **Formularios:** Signal Forms en el alta. Controles enlazados a signals en el simulador.
- **Sin estilos de componente:** solo Tailwind y una hoja global, para que la CSP use `style-src 'self'`.
- Tipos de cambio con una máquina de estados de transiciones puras ([`../06-frontend.md`](../06-frontend.md) §4).

## Alternativas

- **NgRx Signal Store:** estructura y herramientas, a cambio de una dependencia y conceptos extra para un estado
  pequeño. Se puede adoptar más adelante sin cambiar el modelo.
- **Reactive Forms:** muy probadas, pero basadas en observables. Signal Forms es estable en esta versión y encaja con
  el resto, aunque tiene menos recorrido; el formulario es pequeño, así que el riesgo está acotado.
- **Zone.js:** innecesario con signals; añade peso y ciclos de detección de cambios.
- **CSP con `unsafe-inline` en estilos:** más simple, pero más débil.

## Consecuencias

- Menos dependencias y un modelo único (signals) en toda la interfaz.
- Signal Forms tiene menos ejemplos en la comunidad. Si aparece un bloqueo, la salida es Reactive Forms en ese
  formulario, sin afectar al resto.
- Una regla de lint prohíbe `styles` y `styleUrl` en los componentes.
