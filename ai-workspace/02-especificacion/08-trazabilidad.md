# 08 · Matriz de trazabilidad

Generada a partir de las referencias (`Refs` y `Vectores`) de [`07-criterios-aceptacion.md`](07-criterios-aceptacion.md)
con un script de verificación. Se regenera cada vez que cambian los criterios. En la fase de implementación se
añadirá una columna con el test que verifica cada criterio.

Comprobaciones hechas al generarla (2026-11-12, con AC-64 añadido en la fase 4):

- Todos los RF-01…20, RNF-01…26 (salvo RNF-11, sustituido), RNF-SEC-01…21 y CL-01…60 tienen al menos un criterio.
- Los 129 vectores definidos (`TV-…`) están referenciados por algún criterio, y todos los referenciados existen.
- Las decisiones (`D-01…53`), los supuestos (`S-xx`) y las preguntas para negocio (`PN-xx`) citados existen en
  [`../decisiones.md`](../decisiones.md).
- Los 82 vectores fiscales (`TV-ES`, `TV-NO`, `TV-INT`, incluidos los CIF reales `TV-ES-31…34`) se han ejecutado contra
  una implementación independiente de [`03-validacion-fiscal.md`](03-validacion-fiscal.md) y todos dan el resultado esperado.
- Los 16 vectores del slider (`TV-SL`) se han leído de [`05-frontend.md`](05-frontend.md) §3.4.1 y se han ejecutado
  contra una implementación independiente, que además cumple las cuatro propiedades para las 280 posiciones y los
  10 000 valores.

La columna «Especificación» indica `fichero §sección`: 02 = reglas de negocio, 03 = validación fiscal,
04 = contrato de la API, 05 = frontend.

## 1. Requisitos funcionales

| Requisito | Especificación | Criterios | Vectores |
|---|---|---|---|
| RF-01 | 02 §1.1 · 04 §3.2 · 05 §3.2 | AC-20, AC-21, AC-26 | TV-NO-12 |
| RF-02 | 03 §2, §4 | AC-14, AC-15, AC-25 | TV-ES-04, TV-ES-28, TV-ES-30, TV-INT-01…31, TV-NO-01…11 |
| RF-03 | 03 §3 | AC-10, AC-11, AC-12, AC-13, AC-25, AC-73 | TV-ES-01…29, TV-ES-31…34, TV-INT-27 |
| RF-04 | 04 §3.3 · 05 §3.1 | AC-28, AC-29, AC-30, AC-31 | — |
| RF-05 | 04 §3.4 | AC-27 | — |
| RF-06 | 05 §3.2 | AC-72, AC-73, AC-74 | TV-ES-04 |
| RF-07 | 02 §1.2 · 04 §3.6 | AC-40, AC-41, AC-43, AC-45 | TV-PR-04, TV-PR-10…15 |
| RF-08 | 02 §2 | AC-01, AC-02, AC-03 | TV-PR-01…09 |
| RF-09 | 02 §3 | AC-01, AC-04 | TV-PR-01…09, TV-TX-01…07 |
| RF-10 | 02 §1.2 · 04 §3.6, §3.7 | AC-40, AC-46 | TV-PR-04 |
| RF-11 | 04 §3.5 · 05 §3.5 | AC-44, AC-78 | — |
| RF-12 | 05 §4.2–4.4 | AC-80, AC-81, AC-82 | — |
| RF-13 | 02 §4 · 05 §4.1, §4.5 | AC-79, AC-88 | TV-FX-01…06 |
| RF-14 | 05 §3.1 | AC-70, AC-71 | — |
| RF-15 | 05 §3.3, §3.5 | AC-75, AC-87 | — |
| RF-16 | 05 §3.4 | AC-76, AC-77, AC-91 | TV-FX-06, TV-PR-04, TV-SL-01…16 |
| RF-17 | 05 §3.4 | AC-78, AC-89 | — |
| RF-18 | 05 §2 | AC-83 | — |
| RF-19 | 02 §5 · 04 §3.8 · 05 §3.1 | AC-47, AC-92 | TV-ST-01…03 |
| RF-20 | 04 §3.1 | AC-34 | — |

## 2. Requisitos no funcionales

| Requisito | Criterios | Vectores |
|---|---|---|
| RNF-01 | AC-93 | — |
| RNF-02 | AC-93 | — |
| RNF-03 | AC-93 | — |
| RNF-04 | AC-05 | TV-RD-01…05 |
| RNF-05 | AC-21, AC-25 | TV-ES-04, TV-ES-28, TV-INT-27, TV-NO-12 |
| RNF-06 | AC-20 | — |
| RNF-07 | AC-84 | — |
| RNF-08 | AC-70, AC-80, AC-81, AC-82, AC-85 | — |
| RNF-09 | AC-90 | — |
| RNF-10 | AC-93 | — |
| RNF-11 | Sustituido por RNF-SEC-01…21 | — |
| RNF-12 | AC-96 | — |
| RNF-13 | AC-86, AC-91 | TV-SL-01…16 |
| RNF-14 | AC-95 | — |
| RNF-15 | AC-99 | — |
| RNF-16 | AC-99 | — |
| RNF-17 | AC-99 | — |
| RNF-18 | AC-95 | — |
| RNF-19 | AC-94 | — |
| RNF-20 | AC-60, AC-97 | — |
| RNF-21 | AC-57, AC-96 | — |
| RNF-22 | AC-61 | — |
| RNF-23 | AC-95, AC-98 | — |
| RNF-24 | AC-48 | — |
| RNF-25 | AC-06, AC-07 | — |
| RNF-26 | AC-16 | — |

## 3. Requisitos de seguridad

El detalle de cada uno está en [`06-seguridad.md`](06-seguridad.md) §2.

| Requisito | Criterios |
|---|---|
| RNF-SEC-01 | AC-21, AC-22, AC-23, AC-24 |
| RNF-SEC-02 | AC-31 |
| RNF-SEC-03 | AC-22, AC-42 |
| RNF-SEC-04 | AC-62 |
| RNF-SEC-05 | AC-33 |
| RNF-SEC-06 | AC-52, AC-63, AC-64 |
| RNF-SEC-07 | AC-53 |
| RNF-SEC-08 | AC-51 |
| RNF-SEC-09 | AC-32 |
| RNF-SEC-10 | AC-50 |
| RNF-SEC-11 | AC-54 |
| RNF-SEC-12 | AC-07, AC-55 |
| RNF-SEC-13 | AC-80 |
| RNF-SEC-14 | AC-56, AC-63 |
| RNF-SEC-15 | AC-57 |
| RNF-SEC-16 | AC-60 |
| RNF-SEC-17 | AC-58 |
| RNF-SEC-18 | AC-59 |
| RNF-SEC-19 | AC-94 |
| RNF-SEC-20 | AC-61 |
| RNF-SEC-21 | AC-52 |

## 4. Casos límite

CL-01…51 están definidos en [`../01-analisis.md`](../01-analisis.md) §5 y CL-52…60 en [`07-criterios-aceptacion.md`](07-criterios-aceptacion.md) §0.

| Caso límite | Criterios | Caso límite | Criterios | Caso límite | Criterios |
|---|---|---|---|---|---|
| CL-01 | AC-41 | CL-21 | AC-12 | CL-41 | AC-28, AC-32, AC-70 |
| CL-02 | AC-01 | CL-22 | AC-12 | CL-42 | AC-71 |
| CL-03 | AC-01 | CL-23 | AC-12 | CL-43 | AC-43 |
| CL-04 | AC-01 | CL-24 | AC-12 | CL-44 | AC-42 |
| CL-05 | AC-01, AC-02, AC-40, AC-76 | CL-25 | AC-14 | CL-45 | AC-89 |
| CL-06 | AC-01 | CL-26 | AC-14 | CL-46 | AC-45 |
| CL-07 | AC-01 | CL-27 | AC-15 | CL-47 | AC-44, AC-78 |
| CL-08 | AC-01 | CL-28 | AC-26, AC-74 | CL-48 | AC-77, AC-86, AC-91 |
| CL-09 | AC-01 | CL-29 | AC-80 | CL-49 | AC-27, AC-75 |
| CL-10 | AC-03 | CL-30 | AC-80 | CL-50 | AC-84 |
| CL-11 | AC-02 | CL-31 | AC-80 | CL-51 | AC-85 |
| CL-12 | AC-41 | CL-32 | AC-81 | CL-52 | AC-15 |
| CL-13 | AC-01, AC-04, AC-76 | CL-33 | AC-88 | CL-53 | AC-15 |
| CL-14 | AC-04 | CL-34 | AC-79 | CL-54 | AC-15 |
| CL-15 | AC-05 | CL-35 | AC-79 | CL-55 | AC-79 |
| CL-16 | AC-46 | CL-36 | AC-82 | CL-56 | AC-12 |
| CL-17 | AC-21 | CL-37 | AC-28, AC-70 | CL-57 | AC-12 |
| CL-18 | AC-10, AC-73 | CL-38 | AC-29 | CL-58 | AC-91 |
| CL-19 | AC-10 | CL-39 | AC-30 | CL-59 | AC-24, AC-53 |
| CL-20 | AC-11, AC-12 | CL-40 | AC-31 | CL-60 | AC-82 |

## 5. Criterios por nivel de test

Un criterio puede tener más de un nivel (p. ej. `I/CI`).

| Nivel | Criterios | Número |
|---|---|---|
| Unitario (`U`) | AC-01, AC-02, AC-03, AC-04, AC-05, AC-06, AC-07, AC-10, AC-11, AC-12, AC-13, AC-14, AC-15, AC-16, AC-91 | 15 |
| Integración (`I`) | AC-07, AC-20, AC-21, AC-22, AC-23, AC-24, AC-25, AC-26, AC-27, AC-28, AC-29, AC-30, AC-31, AC-32, AC-33, AC-34, AC-40, AC-41, AC-42, AC-43, AC-44, AC-45, AC-46, AC-47, AC-48, AC-50, AC-51, AC-52, AC-53, AC-54, AC-55, AC-58, AC-59, AC-62 | 34 |
| E2E (`E`) | AC-52, AC-61, AC-63, AC-64, AC-70, AC-71, AC-72, AC-73, AC-74, AC-75, AC-76, AC-77, AC-78, AC-79, AC-80, AC-81, AC-82, AC-83, AC-84, AC-85, AC-86, AC-87, AC-88, AC-89, AC-90, AC-91, AC-92 | 27 |
| Pipeline (CI) (`CI`) | AC-55, AC-56, AC-57, AC-60, AC-93, AC-95, AC-96, AC-97, AC-98 | 9 |
| Revisión (`R`) | AC-59, AC-61, AC-93, AC-94, AC-99 | 5 |
