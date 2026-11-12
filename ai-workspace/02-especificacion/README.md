# 02 · Especificación

| Campo | Valor |
|---|---|
| Estado | **v1.0, aprobada por el usuario (2026-11-12).** No quedan decisiones pendientes. |
| Fecha | 2026-11-12 |
| Entradas | [`../01-analisis.md`](../01-analisis.md) (ambigüedades cerradas) · [`../decisiones.md`](../decisiones.md) |
| Siguiente fase | `03-arquitectura` (tablas, carpetas, librerías y dónde se calcula la proyección) |

Este documento define **qué** debe hacer el sistema y **cómo se comprueba**. No define **cómo se construye**:
esquema de base de datos, estructura de carpetas y librerías concretas quedan para la fase de arquitectura.

## Ficheros

| Fichero | Responsabilidad |
|---|---|
| [`01-alcance.md`](01-alcance.md) | Catálogo completo de requisitos (RF, RNF) con prioridad MoSCoW, y lo que queda fuera de alcance. |
| [`02-reglas-negocio.md`](02-reglas-negocio.md) | Datos de negocio, tramos, tarifas, impuestos, redondeo y conversión de divisas, con vectores de prueba. |
| [`03-validacion-fiscal.md`](03-validacion-fiscal.md) | Normalización y validación del identificador fiscal por país: algoritmos, fuentes y vectores de prueba. |
| [`04-contrato-api.md`](04-contrato-api.md) | Contrato REST: convenciones, endpoints, ejemplos, errores y paginación. |
| [`05-frontend.md`](05-frontend.md) | Vistas, estados (carga, vacío, error), divisas, responsive y accesibilidad. |
| [`06-seguridad.md`](06-seguridad.md) | Requisitos RNF-SEC (OWASP API Security Top 10 2023) y modelo de amenazas STRIDE. |
| [`07-criterios-aceptacion.md`](07-criterios-aceptacion.md) | Criterios de aceptación Given/When/Then, base de los tests. |
| [`08-trazabilidad.md`](08-trazabilidad.md) | Matriz requisito → criterio de aceptación → vector de prueba, y casos límite → criterio. |

## Convenciones de ID

| Prefijo | Qué es | Dónde se define |
|---|---|---|
| `RF-xx`, `RNF-xx` | Requisito funcional / no funcional | `01-analisis.md` (RF-01…17, RNF-01…19) y `01-alcance.md` (nuevos a partir de RF-18 y RNF-20) |
| `RNF-SEC-xx` | Requisito de seguridad (sustituye a RNF-11) | `06-seguridad.md` |
| `CL-xx` | Caso límite | `01-analisis.md` (CL-01…51) y `07-criterios-aceptacion.md` §0 (CL-52…60, nuevos) |
| `D-xx`, `S-xx`, `PN-xx` | Decisión, supuesto, pregunta abierta para negocio | `decisiones.md` |
| `TV-<área>-xx` | Vector de prueba (entrada y salida esperada) | `02-reglas-negocio.md`, `03-validacion-fiscal.md`, `05-frontend.md` (slider) |
| `AC-xx` | Criterio de aceptación | `07-criterios-aceptacion.md` |
| `T-xx` | Amenaza del modelo STRIDE | `06-seguridad.md` |

Todos los criterios de aceptación y vectores de prueba citan al menos un `RF`, `RNF` o `CL`.

## Cambios respecto al análisis

Lo que se ha corregido o concretado al verificar fuentes durante esta fase:

1. **CIF (AMB-07 → D-13).** La Orden EHA/451/2008 define la estructura (letra + 7 dígitos aleatorios + carácter de
   control) y las claves, pero **no el algoritmo ni la regla letra/dígito**. El algoritmo se ha contrastado con un
   NIF real publicado por la AEAT (`Q2826000H`). Se descarta la regla «dígitos `00` ⇒ letra» que proponía el análisis.
2. **Base legal del DNI.** La página del Ministerio del Interior cita el art. 12 del **Real Decreto 255/2025**, que es
   la norma vigente del DNI. El algoritmo y la tabla coinciden con los del análisis.
3. **CL-20 matizado.** `W1234567L` es inválido, pero no por ser un NIE con prefijo incorrecto: `W` es una clave de CIF
   (establecimiento permanente) y la `L` no es un carácter de control de CIF posible, así que el motivo es
   `INVALID_FORMAT` (TV-ES-15). El CIF válido con esos dígitos es `W1234567D` (TV-ES-14). Lo detectó la verificación
   de los vectores con una implementación independiente.
4. **Fuera de España (AMB-09 → D-15, D-16).** En lugar de una validación genérica, cada país tiene el formato oficial de
   su identificador (VIES, HMRC, IRS).
5. **Atribución obligatoria** del proveedor de tipos de cambio según sus términos (nuevo RF-18, D-24).
6. **Recomendación de Node corregida:** la LTS activa es la 26, no la 24 (D-38).
7. **RNF-11 sustituido** por RNF-SEC-01…21 (D-40).
8. **Requisitos nuevos:** RF-18…20 y RNF-20…26 (ver `01-alcance.md`).
9. **Casos límite nuevos:** CL-52…60.

## Cambios tras la validación (2026-11-12)

El usuario aprobó las decisiones pendientes con condiciones
([`../prompts/03-validacion-especificacion.md`](../prompts/03-validacion-especificacion.md); registro en
[`../decisiones.md`](../decisiones.md) «Validaciones del usuario»):

1. **Escala del slider como función pura** (D-48, D-49): definición exacta, propiedades que deben cumplir los tests,
   16 vectores `TV-SL` y `aria-valuetext` como Must ([`05-frontend.md`](05-frontend.md) §3.4.1, AC-91). Al
   concretarla se vio que, con los pasos aprobados, los segmentos ocupan el 35,7/32,1/32,1 % del recorrido, no el
   50/30/20 % que decía D-05: corregido en D-49 (validada).
2. **CIF reales** (D-50): Telefónica, Inditex, Mercadona y Banco Santander como `TV-ES-31…34`
   ([`03-validacion-fiscal.md`](03-validacion-fiscal.md) §5.1, AC-12).
3. **Estados de la API de tipos siempre visibles** (D-51): indicador fijo en la cabecera, visible también con EUR
   seleccionado, con «Reintentar» en el error y en los tipos desactualizados, y un e2e por estado
   ([`05-frontend.md`](05-frontend.md) §4.4, AC-80…82).
4. **CI** (D-52, D-53): matriz de Node solo para lint, tests unitarios, de integración y build; e2e y auditoría una
   vez. Se añade una prueba de humo en Windows y macOS (D-53, validada) (RNF-21, AC-95, AC-96).
