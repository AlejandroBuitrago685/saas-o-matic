# 03 · Validación del identificador fiscal

Cubre RF-02, RF-03 y RNF-26. Decisiones: D-12 a D-17.

## 1. Modelo de validación

Hay dos niveles:

1. **Normalización común** (§2): igual para todos los países.
2. **Validador por país** (§3 y §4): uno por cada país de la lista cerrada, todos con la misma interfaz (RNF-26):
   - **Entrada:** el valor normalizado (solo `[A-Z0-9]`, sin prefijo de país).
   - **Salida:** *válido* con su tipo (`DNI`, `NIE`, `CIF`, `VAT`, `EIN`), o *inválido* con un motivo
     (`INVALID_FORMAT`, `INVALID_CHECK`, `UNSUPPORTED_TYPE`).
   - Cada país declara su **prefijo opcional** (`ES`, `PT`, `FR`, `DE`, `IT`, `GB`; EE. UU. no tiene).
   - Los países del catálogo y los países con validador deben coincidir exactamente (AC-16). Para añadir un país basta
     con añadir su validador y su entrada en el catálogo; no hay que tocar los demás validadores.

Motivos y su respuesta en la API (ver [`04-contrato-api.md`](04-contrato-api.md)):

| Motivo | Cuándo | Respuesta |
|---|---|---|
| — | `taxId` ausente, que no sea una cadena o con longitud bruta fuera de 1–32 | `400`, `REQUIRED` / `INVALID_TYPE` / `TOO_SHORT` / `TOO_LONG` |
| `INVALID_FORMAT` | No tiene la estructura del país, o contiene caracteres no admitidos | `422`, `TAX_ID_INVALID_FORMAT` |
| `INVALID_CHECK` | Tiene la estructura correcta pero el carácter de control no coincide | `422`, `TAX_ID_INVALID_CHECK` |
| `UNSUPPORTED_TYPE` | Tiene una estructura reconocida pero no admitida (NIF K, L, M) | `422`, `TAX_ID_UNSUPPORTED_TYPE` |

## 2. Normalización común (D-14)

1. Eliminar todos los caracteres de espacio en blanco Unicode (incluido el espacio duro U+00A0), los guiones
   `-` (U+002D) y los puntos `.`. Cualquier otro carácter se conserva y fallará en el paso 2.
2. Comprobar que el resultado **solo contiene `[A-Za-z0-9]` ASCII**. Si no → `INVALID_FORMAT`. Este paso va **antes**
   de pasar a mayúsculas: algunas mayúsculas Unicode generan letras ASCII (`ſ` → `S`) y permitirían colar homóglifos
   (TV-NO-09).
3. Pasar a mayúsculas.
4. Si queda vacío → `INVALID_FORMAT`.
5. Validar el valor **tal cual** con el validador del país. Si es válido, ese es el valor normalizado.
6. Si no es válido y el valor empieza por el prefijo del país, validar el resto. Si es válido, el valor normalizado es
   el resto (sin prefijo).
7. Si ningún intento es válido, se devuelve el motivo del último intento.

El valor normalizado es el que se guarda, el que se usa para la unicidad (D-17) y el que se devuelve en la API.

## 3. España (RF-03)

### 3.1 Clasificación por estructura

Se aplica sobre el valor normalizado. Se comprueba la primera estructura que encaje, en este orden:

| Orden | Estructura | Tipo | Siguiente paso |
|---|---|---|---|
| 1 | 8 dígitos + 1 letra | DNI | §3.2 |
| 2 | `X`, `Y` o `Z` + 7 dígitos + 1 letra | NIE | §3.3 |
| 3 | `K`, `L` o `M` + 7 dígitos + 1 letra | NIF especial | `UNSUPPORTED_TYPE` (D-12) |
| 4 | Una clave de `A B C D E F G H J N P Q R S U V W` + 7 dígitos + 1 carácter de `0-9` o `A-J` | CIF | §3.4 |
| — | Cualquier otra | — | `INVALID_FORMAT` |

### 3.2 DNI

**Fuente:** Ministerio del Interior, *Cálculo del dígito de control del NIF/NIE*
(`https://www.interior.gob.es/opencms/es/servicios-al-ciudadano/tramites-y-gestiones/dni/calculo-del-digito-de-control-del-nif-nie/`),
consultada el 2026-11-12. La página cita el art. 12 del Real Decreto 255/2025, de 1 de abril, como base legal del
número y del carácter de verificación del DNI.

1. `n` = los 8 dígitos como número entero.
2. `r = n mod 23`.
3. Letra esperada = posición `r` de la tabla oficial:

| Resto | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Letra | T | R | W | A | G | M | Y | F | P | D | X | B | N | J | Z | S | Q | V | H | L | C | K | E |

4. Válido si la letra introducida es la esperada; si no → `INVALID_CHECK`. La I, Ñ, O y U nunca aparecen.

Ejemplo de la fuente oficial: 12345678 mod 23 = 14 → `Z` → `12345678Z`.

### 3.3 NIE

**Fuente:** la misma página del Ministerio del Interior.

1. Sustituir la letra inicial: `X` → `0`, `Y` → `1`, `Z` → `2`.
2. Con el número de 8 dígitos resultante, aplicar el algoritmo del DNI (§3.2).

### 3.4 CIF (NIF de personas jurídicas y entidades sin personalidad jurídica)

**Estructura y claves — fuente oficial:** Orden EHA/451/2008, de 20 de febrero (BOE núm. 49, de 26/02/2008,
`BOE-A-2008-3580`), en vigor desde el 01/07/2008; art. 3 modificado por la Orden HAP/5/2016. Texto consolidado:
`https://www.boe.es/buscar/act.php?id=BOE-A-2008-3580`. Según el art. 2, se compone de nueve caracteres: una letra
(forma jurídica), un número aleatorio de siete dígitos y un carácter de control.

**Algoritmo del carácter de control — sin fuente normativa publicada.** La Orden no describe el algoritmo ni dice
cuándo el control es letra o dígito (verificado en el texto consolidado). Se usa el algoritmo de uso general,
**contrastado con un NIF real publicado por la AEAT**: `Q2826000H`, que figura en la página *Estructura y funciones* de
su sede electrónica (`https://sede.agenciatributaria.gob.es/Sede/gobierno-abierto/transparencia/informacion-institucional-organizativa-planificacion/estructura-funciones.html`).
Riesgo residual documentado en RT-03 y D-13.

Sean `d1 … d7` los siete dígitos:

1. `A = d2 + d4 + d6` (posiciones pares).
2. Para cada dígito en posición impar (`d1`, `d3`, `d5`, `d7`): multiplicar por 2 y sumar las cifras del resultado
   (p. ej. 7 × 2 = 14 → 1 + 4 = 5). `B` = suma de esos cuatro valores.
3. `C = A + B`.
4. `e = (10 − (C mod 10)) mod 10`.
5. El control en dígito es `e`; el control en letra es la posición `e` de `J A B C D E F G H I` (0 → J, 1 → A, …, 9 → I).
6. Comprobar el tipo de control según la clave (D-13):

| Claves | Control admitido |
|---|---|
| A, B, E, H | Solo dígito |
| N, P, Q, R, S, W | Solo letra |
| C, D, F, G, J, U, V | Dígito o letra |

7. Válido si el carácter introducido es el control calculado y del tipo admitido para la clave; si no → `INVALID_CHECK`.

**Ejemplo con un caso real:** `Q2826000` → `A = 8 + 6 + 0 = 14`; impares 2, 2, 0, 0 → 4, 4, 0, 0 → `B = 8`;
`C = 22`; `e = (10 − 2) mod 10 = 8` → letra `H` → `Q2826000H` ✓. Q exige letra ✓.

**Claves (Orden EHA/451/2008, arts. 3–5, texto consolidado):**

| Clave | Forma jurídica | Clave | Forma jurídica |
|---|---|---|---|
| A | Sociedades anónimas | N | Entidades extranjeras |
| B | Sociedades de responsabilidad limitada | P | Corporaciones locales |
| C | Sociedades colectivas | Q | Organismos públicos |
| D | Sociedades comanditarias | R | Congregaciones e instituciones religiosas |
| E | Comunidades de bienes, herencias yacentes y otras entidades sin personalidad jurídica | S | Órganos de la Administración del Estado y de las CC. AA. |
| F | Sociedades cooperativas | U | Uniones temporales de empresas |
| G | Asociaciones | V | Otros tipos no definidos |
| H | Comunidades de propietarios en régimen de propiedad horizontal | W | Establecimientos permanentes de entidades no residentes |
| J | Sociedades civiles | | |

## 4. Otros países (RF-02, D-15, D-16)

Solo se valida el formato (el algoritmo de control no es obligatorio fuera de España). Formatos tras la normalización
y **sin** prefijo:

| País | Identificador | `taxIdType` | Formato admitido | Prefijo opcional | Fuente |
|---|---|---|---|---|---|
| PT | NIF-IVA (NIF/NIPC) | `VAT` | 9 dígitos | `PT` | VIES FAQ Q11 |
| DE | NIF-IVA (USt-IdNr.) | `VAT` | 9 dígitos | `DE` | VIES FAQ Q11 |
| IT | NIF-IVA (Partita IVA) | `VAT` | 11 dígitos | `IT` | VIES FAQ Q11 |
| FR | NIF-IVA (n° TVA intracommunautaire) | `VAT` | 2 caracteres (dígito o letra salvo `I` y `O`) + 9 dígitos | `FR` | VIES FAQ Q11; HMRC (excluye I y O) |
| GB | UK VAT registration number | `VAT` | 9 dígitos; o 12 dígitos (sucursales); o `GD` + 3 dígitos (departamentos del Gobierno); o `HA` + 3 dígitos (autoridades sanitarias) | `GB` | HMRC VATREG03700 (9 dígitos); estructura VIES de `XI`, notas 5–7 (12 dígitos, GD, HA) |
| US | Employer Identification Number (EIN) | `EIN` | 9 dígitos cuyos dos primeros forman un prefijo válido del IRS (lista abajo) | ninguno | IRS, *Instructions for Form SS-4 (12/2025)*; IRS, *Valid EINs* |

Fuentes (consultadas el 2026-11-12):

- VIES FAQ, pregunta Q11 «Is it possible to know the algorithms…?», tabla *VAT identification number structure*:
  `https://ec.europa.eu/taxation_customs/vies/#/faq`.
- HMRC, *VAT EU country codes, VAT numbers and VAT in other languages*:
  `https://www.gov.uk/guidance/vat-eu-country-codes-vat-numbers-and-vat-in-other-languages`.
- HMRC, *VAT Registration Manual* VATREG03700 («a nine-digit registration number»):
  `https://www.gov.uk/hmrc-internal-manuals/vat-registration-manual/vatreg03700`.
- IRS, *Instructions for Form SS-4 (12/2025)* («An EIN is a 9-digit number (for example, 12-3456789)»):
  `https://www.irs.gov/instructions/iss4`.
- IRS, *Valid EINs* (actualizada el 04-Nov-2026):
  `https://www.irs.gov/businesses/small-businesses-self-employed/valid-eins`.

**Prefijos EIN válidos** (83, dato configurable porque el IRS lo puede cambiar):
`01 02 03 04 05 06 10 11 12 13 14 15 16 20 21 22 23 24 25 26 27 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 50 51 52 53 54 55 56 57 58 59 60 61 62 63 64 65 66 67 68 71 72 73 74 75 76 77 80 81 82 83 84 85 86 87 88 90 91 92 93 94 95 98 99`.
No válidos: `00 07 08 09 17 18 19 28 29 49 69 70 78 79 89 96 97`.

Irlanda del Norte (`XI`) queda fuera de alcance: con país `GB`, un valor que empiece por `XI` es `INVALID_FORMAT` (CL-54).

## 5. Vectores de prueba

Todos los caracteres de control se han calculado con un script independiente. `TV-ES-13` es un caso real publicado
por la AEAT. Los demás son identificadores sintéticos: no se usan identificadores de empresas o personas reales.

### 5.1 España

| ID | Entrada (país ES) | Resultado | Tipo / motivo | Refs |
|---|---|---|---|---|
| TV-ES-01 | `12345678Z` | Válido | DNI (ejemplo oficial del Ministerio del Interior) | RF-03, CL-18 |
| TV-ES-02 | `87654321X` | Válido | DNI | RF-03, CL-18 |
| TV-ES-03 | `00000000T` | Válido | DNI | RF-03, CL-19 |
| TV-ES-04 | `12345678A` | Inválido | `INVALID_CHECK` | RF-03, CL-18 |
| TV-ES-05 | `12345678I` | Inválido | `INVALID_CHECK` (la I no está en la tabla) | RF-03, CL-18 |
| TV-ES-06 | `1234567L` | Inválido | `INVALID_FORMAT` (7 dígitos, sin relleno) | RF-03, CL-18, D-14 |
| TV-ES-07 | `123456789` | Inválido | `INVALID_FORMAT` | RF-03, CL-18 |
| TV-ES-08 | `X1234567L` | Válido | NIE | RF-03, CL-20 |
| TV-ES-09 | `Y1234567X` | Válido | NIE | RF-03, CL-20 |
| TV-ES-10 | `Z1234567R` | Válido | NIE | RF-03, CL-20 |
| TV-ES-11 | `X0000000T` | Válido | NIE | RF-03, CL-20 |
| TV-ES-12 | `X1234567A` | Inválido | `INVALID_CHECK` | RF-03, CL-20 |
| TV-ES-13 | `Q2826000H` | Válido | CIF (NIF real de la AEAT) | RF-03, CL-22 |
| TV-ES-14 | `W1234567D` | Válido | CIF (W → letra) | RF-03, CL-56 |
| TV-ES-15 | `W1234567L` | Inválido | `INVALID_FORMAT` (no es un NIE, porque W no es X/Y/Z; y como CIF de clave W, la L no es un carácter de control posible) | RF-03, CL-20, CL-56 |
| TV-ES-16 | `B12345674` | Válido | CIF (control dígito) | RF-03, CL-21 |
| TV-ES-17 | `B1234567D` | Inválido | `INVALID_CHECK` (B exige dígito) | RF-03, CL-21 |
| TV-ES-18 | `B12345675` | Inválido | `INVALID_CHECK` | RF-03, CL-21 |
| TV-ES-19 | `Q1234567D` | Válido | CIF (control letra) | RF-03, CL-22 |
| TV-ES-20 | `Q12345674` | Inválido | `INVALID_CHECK` (Q exige letra) | RF-03, CL-22 |
| TV-ES-21 | `C12345674` | Válido | CIF (control indistinto, en dígito) | RF-03, CL-23 |
| TV-ES-22 | `C1234567D` | Válido | CIF (control indistinto, en letra) | RF-03, CL-23 |
| TV-ES-23 | `J00000000` | Válido | CIF (dígitos `00`, control dígito) | RF-03, CL-57, D-13 |
| TV-ES-24 | `J0000000J` | Válido | CIF (dígitos `00`, control letra) | RF-03, CL-57, D-13 |
| TV-ES-25 | `N1234567D` | Válido | CIF (N → letra) | RF-03, CL-22 |
| TV-ES-26 | `N12345674` | Inválido | `INVALID_CHECK` (N exige letra) | RF-03, CL-22 |
| TV-ES-27 | `I1234567D`, `O1234567D`, `T1234567D` | Inválido | `INVALID_FORMAT` (no son claves) | RF-03, CL-24 |
| TV-ES-28 | `K1234567L`, `L1234567L`, `M1234567L` | Inválido | `UNSUPPORTED_TYPE` | RF-03, D-12 |
| TV-ES-29 | `B1234567` | Inválido | `INVALID_FORMAT` (8 caracteres) | RF-03 |
| TV-ES-30 | `AB123456789` (NIF-IVA francés con país ES) | Inválido | `INVALID_FORMAT` | RF-02, CL-27 |

### 5.2 Normalización

| ID | Entrada (país) | Resultado | Valor normalizado / motivo | Refs |
|---|---|---|---|---|
| TV-NO-01 | ` 12.345.678-z ` (ES) | Válido | `12345678Z` | RF-02, CL-18, D-14 |
| TV-NO-02 | `12345678` + espacio duro U+00A0 + `Z` (ES) | Válido | `12345678Z` | RF-02, D-14 |
| TV-NO-03 | `ES12345678Z` (ES) | Válido | `12345678Z` | RF-02, CL-25 |
| TV-NO-04 | `esb12345674` (ES) | Válido | `B12345674` | RF-02, CL-25 |
| TV-NO-05 | `ES B-1234567-4` (ES) | Válido | `B12345674` | RF-02, CL-25 |
| TV-NO-06 | `ESB12345675` (ES) | Inválido | `INVALID_CHECK` (motivo del intento sin prefijo) | RF-02, CL-25 |
| TV-NO-07 | `В12345674` con `В` cirílica U+0412 (ES) | Inválido | `INVALID_FORMAT` | RF-02, CL-26 |
| TV-NO-08 | `１２３４５６７８Z` con dígitos de ancho completo (ES) | Inválido | `INVALID_FORMAT` | RF-02, CL-26 |
| TV-NO-09 | `eſB12345674` con `ſ` U+017F (ES) | Inválido | `INVALID_FORMAT` (si se pasara a mayúsculas antes, `ſ` → `S` daría `ESB…`) | RF-02, CL-26 |
| TV-NO-10 | `12345678–Z` con raya U+2013 (ES) | Inválido | `INVALID_FORMAT` | RF-02, CL-26 |
| TV-NO-11 | ` -. ` (ES) | Inválido | `INVALID_FORMAT` (vacío tras normalizar) | RF-02 |
| TV-NO-12 | Cadena de 33 caracteres (cualquier país) | `400` | `TOO_LONG` (esquema) | RF-02, RNF-SEC-01 |

### 5.3 Otros países

| ID | País | Entrada | Resultado | Valor normalizado / motivo | Refs |
|---|---|---|---|---|---|
| TV-INT-01 | PT | `123456789` | Válido | `123456789` (VAT) | RF-02 |
| TV-INT-02 | PT | `PT 123 456 789` | Válido | `123456789` | RF-02, D-14 |
| TV-INT-03 | PT | `12345678` | Inválido | `INVALID_FORMAT` | RF-02 |
| TV-INT-04 | PT | `1234567890` | Inválido | `INVALID_FORMAT` | RF-02 |
| TV-INT-05 | DE | `123456789` | Válido | `123456789` (VAT) | RF-02 |
| TV-INT-06 | DE | `DE123456789` | Válido | `123456789` | RF-02 |
| TV-INT-07 | DE | `12345678X` | Inválido | `INVALID_FORMAT` | RF-02 |
| TV-INT-08 | IT | `12345678901` | Válido | `12345678901` (VAT) | RF-02 |
| TV-INT-09 | IT | `IT12345678901` | Válido | `12345678901` | RF-02 |
| TV-INT-10 | IT | `1234567890` | Inválido | `INVALID_FORMAT` | RF-02 |
| TV-INT-11 | FR | `12345678901` | Válido | `12345678901` (VAT) | RF-02 |
| TV-INT-12 | FR | `AB123456789` | Válido | `AB123456789` | RF-02 |
| TV-INT-13 | FR | `1A123456789` | Válido | `1A123456789` | RF-02 |
| TV-INT-14 | FR | `FRAB123456789` | Válido | `AB123456789` (sin prefijo) | RF-02, D-14 |
| TV-INT-15 | FR | `FR123456789` | Válido | `FR123456789` (válido tal cual: no se quita el prefijo) | RF-02, CL-52 |
| TV-INT-16 | FR | `IA123456789`, `OA123456789` | Inválido | `INVALID_FORMAT` (I y O excluidas) | RF-02 |
| TV-INT-17 | FR | `1234567890` | Inválido | `INVALID_FORMAT` | RF-02 |
| TV-INT-18 | GB | `123456789` | Válido | `123456789` (VAT) | RF-02 |
| TV-INT-19 | GB | `GB 123 4567 89` | Válido | `123456789` | RF-02, D-14 |
| TV-INT-20 | GB | `123456789012` | Válido | `123456789012` (sucursal) | RF-02 |
| TV-INT-21 | GB | `GD123`, `HA567` | Válido | `GD123`, `HA567` | RF-02 |
| TV-INT-22 | GB | `12345678` | Inválido | `INVALID_FORMAT` | RF-02 |
| TV-INT-23 | GB | `GD1234` | Inválido | `INVALID_FORMAT` | RF-02 |
| TV-INT-24 | GB | `XI123456789` | Inválido | `INVALID_FORMAT` (Irlanda del Norte fuera de alcance) | RF-02, CL-54 |
| TV-INT-25 | US | `12-3456789` | Válido | `123456789` (EIN, prefijo 12) | RF-02 |
| TV-INT-26 | US | `98-7654321` | Válido | `987654321` (prefijo 98) | RF-02 |
| TV-INT-27 | US | `00-1234567` | Inválido | `INVALID_FORMAT` (prefijo no válido) | RF-02, CL-53 |
| TV-INT-28 | US | `07-1234567` | Inválido | `INVALID_FORMAT` (prefijo no válido) | RF-02, CL-53 |
| TV-INT-29 | US | `12345678` | Inválido | `INVALID_FORMAT` | RF-02 |
| TV-INT-30 | US | `US123456789` | Inválido | `INVALID_FORMAT` (EE. UU. no tiene prefijo de país) | RF-02 |
| TV-INT-31 | FR | `12345678Z` (DNI español) | Inválido | `INVALID_FORMAT` | RF-02, CL-27 |
