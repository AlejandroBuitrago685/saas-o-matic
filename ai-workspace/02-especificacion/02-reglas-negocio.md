# 02 · Reglas de negocio

Todas las cifras de los vectores de prueba (`TV-…`) se han calculado con un script de verificación independiente con
aritmética decimal exacta. Los importes están en **céntimos de EUR** salvo que se indique otra cosa.

## 1. Datos de negocio

Descripción lógica (no es el esquema de base de datos, que se diseña en arquitectura).

### 1.1 Cliente (RF-01)

| Campo | Regla | Refs |
|---|---|---|
| `id` | UUID v7, lo asigna el servidor. | D-41 |
| `companyName` | Sin espacios en los extremos, espacios internos colapsados, Unicode NFC, 2–200 caracteres, sin caracteres de control. | D-34 |
| `taxId` | Forma normalizada del identificador fiscal (ver [`03-validacion-fiscal.md`](03-validacion-fiscal.md)). | D-14 |
| `taxIdType` | Derivado de la validación: `DNI`, `NIE`, `CIF`, `VAT` o `EIN`. | D-12, D-16 |
| `country` | Uno de `ES`, `PT`, `FR`, `DE`, `IT`, `GB`, `US` (ISO 3166-1 alfa-2). | D-09 |
| `contactEmail` | Formato de email válido, guardado en minúsculas, 254 caracteres como máximo. | D-34 |
| `plan` | `STARTER`, `BUSINESS` o `ENTERPRISE`. | D-07 |
| `createdAt` | Instante de alta en UTC, lo asigna el servidor. | — |

Unicidad: el par (`country`, `taxId` normalizado) es único (D-17). El cliente no se puede modificar ni borrar (D-29).

### 1.2 Simulación (RF-07, RF-10)

| Campo | Regla | Refs |
|---|---|---|
| `id` | UUID v7, lo asigna el servidor. | D-41 |
| `customerId` | Cliente existente. | RF-07 |
| `activeUsers` | Entero, 1–10 000. | D-04 |
| `storageGb` | Entero, 0–100 000 (GB). Informativo. | D-06 |
| `apiCallsPerMonth` | Entero, 0–1 000 000 000. Informativo. | D-06 |
| `pricing` | Resultado del cálculo (§2 y §3), calculado **siempre** por el servidor. | D-18, RNF-SEC-03 |
| `createdAt` | Instante de creación en UTC. | — |

`pricing` incluye: `currency` (`EUR`), `tariffCode`, desglose por tramo (`tier`, `fromUser`, `toUser`, `units`,
`unitPriceCents`, `subtotalCents`), `baseCents`, `taxCountry`, `taxRateBps`, `taxCents` y `totalCents`.
Es una **instantánea**: no cambia aunque después cambien la tarifa o el tipo del país (CL-16).

## 2. Tarifa y tramos (RF-08, RNF-25)

### 2.1 Tarifa

Una tarifa es un conjunto ordenado de tramos `{tier, fromUser, toUser, unitPriceCents}` en EUR. La configuración es
válida solo si se cumplen todas estas condiciones; si no, el servicio no arranca (RNF-SEC-12):

- el primer tramo empieza en 1;
- los tramos son contiguos (`fromUser` = `toUser` del anterior + 1);
- solo el último tramo no tiene límite superior (`toUser` = `null`);
- los precios son enteros **mayores que 0** (D-98; tramos gratuitos, pregunta abierta PN-05).

**Tarifa `STANDARD`** (enunciado §2.A):

| Tramo | Desde | Hasta | Precio por usuario |
|---|---|---|---|
| 1 | 1 | 10 | 1 000 (10,00 €) |
| 2 | 11 | 50 | 800 (8,00 €) |
| 3 | 51 | — | 500 (5,00 €) |

**Asignación de plan a tarifa** (D-08): `STARTER` → `STANDARD`, `BUSINESS` → `STANDARD`, `ENTERPRISE` → `STANDARD`.
El cálculo recibe una tarifa, no un plan. Para que un plan tenga su propio precio basta con añadir una tarifa y
cambiar la asignación: el cálculo no se toca.

### 2.2 Algoritmo del coste base (acumulativo, no por volumen)

Entradas: tarifa `T` y número de usuarios `n` (entero, 1 ≤ n ≤ 10 000).

1. Para cada tramo `i` de `T`, en orden: `units_i = max(0, min(n, toUser_i) − fromUser_i + 1)`
   (si `toUser_i` es `null`, se usa `n`).
2. `subtotal_i = units_i × unitPriceCents_i`.
3. `baseCents = Σ subtotal_i`.
4. El desglose solo incluye los tramos con `units_i > 0`.

Propiedades que se deben cumplir siempre (CL-10):

- `base(n) − base(n − 1)` = precio del tramo al que pertenece el usuario `n`;
- `base` es estrictamente creciente en `n`;
- el resultado **no** es `n × precio del último tramo` (tarificación por volumen, CL-11).

## 3. Impuestos (RF-09)

### 3.1 Tipos por país

Tipo general del país del cliente, aplicado tal cual (D-09). Son datos configurables y se validan al arrancar: entero
de 0 a 10 000 puntos básicos (0–100 %).

| País | Tipo | Puntos básicos | Fuente (consultada el 2026-11-12) |
|---|---|---|---|
| ES | 21 % | 2 100 | Comisión Europea, Your Europe, *VAT rules and rates* (revisada el 13/07/2026) |
| PT | 23 % | 2 300 | Ídem |
| FR | 20 % | 2 000 | Ídem |
| DE | 19 % | 1 900 | Ídem |
| IT | 22 % | 2 200 | Ídem |
| GB | 20 % | 2 000 | GOV.UK, *VAT rates* (`https://www.gov.uk/vat-rates`) |
| US | 0 % | 0 | Simplificación: EE. UU. no tiene IVA federal; el *sales tax* estatal queda fuera (PN-03). |

Fuente UE: `https://europa.eu/youreurope/business/finance-and-tax/vat/vat-rules-rates/index_en.htm`.

### 3.2 Cálculo y redondeo (RNF-04, D-10)

1. `taxCents = redondeo_mitad_arriba(baseCents × taxRateBps / 10 000)`, con aritmética entera o decimal exacta, nunca
   en coma flotante.
2. `totalCents = baseCents + taxCents`.
3. El impuesto se calcula **una sola vez** sobre la base total, no por tramo.

Con los tipos vigentes (porcentajes enteros) y precios en euros enteros el redondeo nunca se activa: `baseCents`
siempre es múltiplo de 100. Aun así se especifica y se prueba con tipos hipotéticos (TV-RD) porque los tipos son
configurables.

Cota de seguridad: base máxima 5 017 000 × tipo máximo 10 000 bps = 5,017 × 10¹⁰, muy por debajo de 2⁵³.

## 4. Conversión de divisas (solo visualización)

- EUR es la fuente de verdad; la conversión no altera nada de lo guardado (D-19).
- Divisas: EUR, USD, GBP, CHF, JPY, MXN (D-21). Decimales según ISO 4217: 2 en todas salvo JPY (0).
- **Regla de conversión** (D-20), igual en todas las vistas:
  1. Partidas hoja: el subtotal de cada tramo y el impuesto.
  2. `convertida = redondeo_mitad_arriba(partida_EUR × tipo_EUR→X)`, a los decimales de la divisa X.
  3. Base mostrada = suma de los tramos convertidos; total mostrado = base mostrada + impuesto convertido.
  4. En EUR no hay conversión.
- Cualquier importe en una divisa distinta de EUR se marca como orientativo e indica la fecha de los tipos (D-19).

### 4.1 Tipos de referencia para tests

Respuesta real de `open.er-api.com/v6/latest/EUR` del 2026-11-12, `time_last_update_utc` =
`Thu, 12 Nov 2026 00:02:31 +0000`. Los tests usan estos tipos como datos fijos, nunca la API real.

| USD | GBP | CHF | JPY | MXN |
|---|---|---|---|---|
| 1.111287 | 0.835919 | 0.923315 | 177.234212 | 20.687802 |

## 5. Métricas del dashboard (RF-19, Could)

- `customersCount`: número de clientes.
- `simulationsCount`: número de simulaciones.
- `averageBaseCents`: `redondeo_mitad_arriba(Σ baseCents / simulationsCount)`; `null` si no hay simulaciones (D-26).
  En pantalla se convierte como una partida hoja.

## 6. Vectores de prueba

### 6.1 Coste base por tramos e impuesto ES 21 %

| ID | Usuarios | Unidades T1/T2/T3 | Base | Impuesto (2 100 bps) | Total | Refs |
|---|---|---|---|---|---|---|
| TV-PR-01 | 1 | 1 / 0 / 0 | 1 000 | 210 | 1 210 | RF-08, CL-02 |
| TV-PR-02 | 10 | 10 / 0 / 0 | 10 000 | 2 100 | 12 100 | RF-08, CL-03 |
| TV-PR-03 | 11 | 10 / 1 / 0 | 10 800 | 2 268 | 13 068 | RF-08, CL-04 |
| TV-PR-04 | 15 | 10 / 5 / 0 | **14 000** | 2 940 | 16 940 | RF-08, CL-05, CL-11, CL-13 |
| TV-PR-05 | 50 | 10 / 40 / 0 | 42 000 | 8 820 | 50 820 | RF-08, CL-06 |
| TV-PR-06 | 51 | 10 / 40 / 1 | 42 500 | 8 925 | 51 425 | RF-08, CL-07 |
| TV-PR-07 | 100 | 10 / 40 / 50 | 67 000 | 14 070 | 81 070 | RF-08, CL-08 |
| TV-PR-08 | 1 000 | 10 / 40 / 950 | 517 000 | 108 570 | 625 570 | RF-08, CL-09 |
| TV-PR-09 | 10 000 | 10 / 40 / 9 950 | 5 017 000 | 1 053 570 | 6 070 570 | RF-08, CL-09, D-04 |

TV-PR-04 es el ejemplo del enunciado (140 €). Con tarificación por volumen saldría 12 000 (CL-11).

### 6.2 Entradas inválidas de usuarios (esquema → 400)

| ID | `activeUsers` | Resultado | Refs |
|---|---|---|---|
| TV-PR-10 | `0` | 400 `OUT_OF_RANGE` | CL-01, D-04 |
| TV-PR-11 | `10001` | 400 `OUT_OF_RANGE` | CL-12, D-04 |
| TV-PR-12 | `-1` | 400 `OUT_OF_RANGE` | CL-12 |
| TV-PR-13 | `10.5` | 400 `INVALID_TYPE` | CL-12 |
| TV-PR-14 | `"15"` | 400 `INVALID_TYPE` | CL-12 |
| TV-PR-15 | `null` o ausente | 400 `REQUIRED` | CL-12 |

### 6.3 Impuesto por país sobre 14 000 (15 usuarios)

| ID | País | bps | Impuesto | Total | Refs |
|---|---|---|---|---|---|
| TV-TX-01 | ES | 2 100 | 2 940 | 16 940 | RF-09, CL-13 |
| TV-TX-02 | PT | 2 300 | 3 220 | 17 220 | RF-09 |
| TV-TX-03 | FR | 2 000 | 2 800 | 16 800 | RF-09 |
| TV-TX-04 | DE | 1 900 | 2 660 | 16 660 | RF-09 |
| TV-TX-05 | IT | 2 200 | 3 080 | 17 080 | RF-09 |
| TV-TX-06 | GB | 2 000 | 2 800 | 16 800 | RF-09 |
| TV-TX-07 | US | 0 | 0 | 14 000 | RF-09, CL-14 |

### 6.4 Redondeo con tipos hipotéticos (prueba de la función de impuesto)

| ID | Base | bps | Valor exacto | `taxCents` | Refs |
|---|---|---|---|---|---|
| TV-RD-01 | 42 500 | 810 | 3 442,5 | **3 443** (con redondeo bancario saldría 3 442) | RNF-04, CL-15 |
| TV-RD-02 | 42 400 | 810 | 3 434,4 | 3 434 | RNF-04, CL-15 |
| TV-RD-03 | 1 000 | 810 | 81 | 81 | RNF-04 |
| TV-RD-04 | 42 500 | 815 | 3 463,75 | 3 464 | RNF-04, CL-15 |
| TV-RD-05 | 50 | 1 | 0,005 | 0 | RNF-04 |

### 6.5 Conversión de 15 usuarios con impuesto ES (tipos de §4.1)

Partidas hoja en EUR: tramo 1 = 100,00 €, tramo 2 = 40,00 €, impuesto = 29,40 €.

| ID | Divisa | Tramo 1 | Tramo 2 | Base (suma) | Impuesto | Total (suma) | Convertir directamente (no se usa) | Refs |
|---|---|---|---|---|---|---|---|---|
| TV-FX-01 | USD | 111,13 | 44,45 | 155,58 | 32,67 | 188,25 | 188,25 | RF-13, CL-34 |
| TV-FX-02 | GBP | 83,59 | 33,44 | 117,03 | 24,58 | **141,61** | total 141,60 ≠ | RF-13, CL-35, CL-55 |
| TV-FX-03 | CHF | 92,33 | 36,93 | 129,26 | 27,15 | 156,41 | 156,41 | RF-13 |
| TV-FX-04 | JPY | 17 723 | 7 089 | **24 812** | 5 211 | 30 023 | base 24 813 ≠ | RF-13, CL-34, CL-35, CL-55 |
| TV-FX-05 | MXN | 2 068,78 | 827,51 | 2 896,29 | 608,22 | 3 504,51 | 3 504,51 | RF-13 |
| TV-FX-06 | EUR | 100,00 | 40,00 | 140,00 | 29,40 | 169,40 | — | RF-13 |

TV-FX-02 y TV-FX-04 justifican la regla de D-20: convertir cada importe por separado haría que el desglose no cuadrara.

### 6.6 Métricas

| ID | Bases de las simulaciones | `averageBaseCents` | Refs |
|---|---|---|---|
| TV-ST-01 | 14 000, 10 800 | 12 400 | RF-19 |
| TV-ST-02 | 1 000, 1 000, 10 800 | 4 267 (4 266,67 redondeado) | RF-19, D-26 |
| TV-ST-03 | (ninguna) | `null` | RF-19 |
