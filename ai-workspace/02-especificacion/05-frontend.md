# 05 · Frontend

Cubre RF-06, RF-12…RF-19, RNF-07…RNF-09 y RNF-13. Decisiones: D-05, D-19…D-28, D-35, D-48, D-49 y D-51.

## 1. Principios

- Interfaz en español, con formato `es-ES` (D-35).
- Los datos de negocio (países y tipos, planes, tarifas y límites) se leen de `GET /catalog` (RF-20). La interfaz no
  incluye ninguno en su código, salvo los textos visibles.
- Toda vista tiene definidos sus estados de **carga**, **vacío**, **error** y **éxito** (RNF-08). Nunca se queda una
  pantalla en blanco (CL-51).
- Lo que la interfaz proyecta y lo que el servidor guarda deben coincidir al céntimo (RT-02, AC-78).

## 2. Estructura y navegación

| Ruta | Vista | Requisitos |
|---|---|---|
| `/` | V1 · Dashboard (buscador y listado) | RF-14, RF-19 |
| `/customers/new` | V2 · Alta de cliente | RF-06 |
| `/customers/:id` | V3 · Detalle del cliente, con V4 · Simulador y el historial | RF-15, RF-16, RF-17 |
| cualquier otra | V5 · No encontrado | CL-49 |

Elementos comunes a todas las vistas:

- **Cabecera:** nombre de la aplicación (enlace a `/`), selector de divisa e indicador del estado de los tipos (§4).
- **Pie:** atribución obligatoria «Rates By Exchange Rate API» con enlace a `https://www.exchangerate-api.com` (RF-18).
- **Aviso de demo** (solo en el entorno de demo, RNF-SEC-20): banner fijo con el texto «Entorno de demostración: los
  datos son ficticios y se borran periódicamente. No introduzcas datos reales.»
- **Notificaciones:** mensajes breves de éxito («Cliente creado», «Simulación guardada»).

## 3. Vistas

### 3.1 V1 · Dashboard (`/`)

- **Métricas** (RF-19, Could): tres tarjetas, «Clientes», «Simulaciones» e «Importe medio simulado (sin impuestos)»,
  esta última en la divisa seleccionada. Si fallan, muestran «—» con un aviso discreto; no bloquean el listado.
- **Buscador:** campo de búsqueda con etiqueta «Buscar por empresa o identificador fiscal», 100 caracteres como máximo.
  - Busca 300 ms después de la última pulsación, o al momento con Intro. Tiene un botón para borrar la búsqueda.
  - **Should:** la búsqueda y la página se reflejan en la URL (`?q=…&page=…`), de modo que recargar o volver atrás conserva el estado.
  - Si llegan respuestas fuera de orden, solo se muestra la de la última búsqueda (CL-42).
- **Listado:** tarjetas con nombre de empresa, identificador y tipo, país (nombre en español), plan y fecha de alta.
  Cada tarjeta es un enlace accesible con teclado al detalle.
- **Paginación:** 20 por página, botones «Anterior» y «Siguiente» y texto del tipo «21–40 de 57».
- **Acción principal:** botón «Nuevo cliente».

| Estado | Qué se ve |
|---|---|
| Carga inicial | Esqueleto de tarjetas. |
| Carga tras cambiar la búsqueda | Los resultados anteriores atenuados y un indicador de actividad, sin saltos de maquetación. |
| Vacío (no hay ningún cliente) | «Todavía no hay clientes» y botón «Crear el primer cliente». |
| Sin resultados | «No hay clientes que coincidan con «{q}»» y botón «Limpiar búsqueda». |
| Error | «No se ha podido cargar el listado.» y botón «Reintentar». El buscador sigue operativo. |

### 3.2 V2 · Alta de cliente (`/customers/new`)

Campos, en este orden:

1. **País:** selector con los países del catálogo; España preseleccionada.
2. **Nombre de empresa.**
3. **Identificador fiscal:** la etiqueta y el ejemplo de ayuda cambian con el país:

   | País | Etiqueta | Ejemplo de ayuda |
   |---|---|---|
   | ES | DNI, NIE o CIF | `B12345674` |
   | PT | NIF (NIPC) | `123456789` |
   | FR | Número de IVA intracomunitario | `AB123456789` |
   | DE | USt-IdNr. | `123456789` |
   | IT | Partita IVA | `12345678901` |
   | GB | VAT registration number | `123456789` |
   | US | EIN | `12-3456789` |

4. **Email de contacto.**
5. **Plan:** `STARTER`, `BUSINESS` o `ENTERPRISE`.

Comportamiento:

- La interfaz valida en el propio navegador lo que pertenece al esquema (obligatorios, longitudes del catálogo y
  formato de email), tras salir del campo y al enviar. La validación del identificador fiscal es siempre la del
  servidor (`422`); si en arquitectura se decide compartir los validadores, el formulario podrá además validar mientras se escribe.
- «Crear cliente» se deshabilita y muestra actividad mientras se envía, para evitar duplicados.
- Al enviar con errores, el foco va al primer campo inválido.

| Resultado | Qué se ve |
|---|---|
| `201` | Navega a `/customers/{id}` y muestra «Cliente creado». |
| `422` | Mensaje bajo el campo identificador según su `code` (§6). |
| `409` | «Ya existe un cliente con este identificador fiscal» y enlace «Ver cliente» (`existingCustomerId`). |
| `400` | Errores asignados a cada campo según su `pointer`. |
| `429` | Aviso «Demasiadas peticiones. Espera {Retry-After} s y vuelve a intentarlo.» |
| Error de red o `500` | «No se ha podido crear el cliente. Inténtalo de nuevo.», con un código de referencia. El formulario conserva los datos. |
| Catálogo cargando o con error | Esqueleto del formulario, o error con «Reintentar»: sin catálogo no se puede dar de alta. |

### 3.3 V3 · Detalle del cliente (`/customers/:id`)

- **Tarjeta del cliente:** nombre (título de la página), identificador y tipo, país, email (enlace `mailto:`), plan y
  fecha de alta.
- **Simulador** (V4, §3.4).
- **Historial** (§3.5).
- **Maquetación:** en móvil, una columna (cliente, simulador, historial). Desde 1 024 px, cliente y simulador en dos
  columnas y el historial debajo, a todo el ancho.

| Estado | Qué se ve |
|---|---|
| Carga | Esqueleto de las tres secciones. |
| `404` o `400` | V5 con «Cliente no encontrado» y enlace al dashboard (CL-49). |
| Error | Mensaje y «Reintentar». |

### 3.4 V4 · Simulador

**Controles:**

| Control | Regla |
|---|---|
| Usuarios activos | Slider y campo numérico sincronizados (D-04), de 1 a 10 000, valor inicial 1. El slider usa la escala de §3.4.1; el campo numérico admite cualquier entero del rango y, si el valor no cae en una posición del slider, este se coloca en la más cercana sin cambiar el valor. |
| Almacenamiento (GB) | Campo numérico, de 0 a 100 000, valor inicial 0. Etiqueta «informativo, no afecta al precio». |
| Llamadas a la API al mes | Campo numérico, de 0 a 1 000 000 000, valor inicial 0. La misma etiqueta. |

Si un valor está fuera de rango o no es entero: error en el propio campo, la proyección mantiene el último valor
válido y «Guardar simulación» queda deshabilitado. El valor nunca se corrige en silencio.

#### 3.4.1 Escala del slider (D-05, D-48, D-49)

La conversión entre posición y número de usuarios es una **función pura**, sin estado y sin dependencias de la vista,
con dos operaciones:

- `aUsuarios(p)`, para posiciones enteras `p` de 0 a 279:

  | Posiciones | Usuarios | Paso | Parte del recorrido |
  |---|---|---|---|
  | 0–99 | `p + 1` → 1…100 | 1 | 35,7 % |
  | 100–189 | `100 + (p − 99) × 10` → 110…1 000 | 10 | 32,1 % |
  | 190–279 | `1 000 + (p − 189) × 100` → 1 100…10 000 | 100 | 32,1 % |

- `aPosición(n)`, para cualquier entero `n` de 1 a 10 000: la posición cuyo valor está más cerca de `n`. En caso de
  empate, la menor.

Propiedades que deben cumplir los tests:

1. `aUsuarios` es estrictamente creciente, con `aUsuarios(0) = 1` y `aUsuarios(279) = 10 000`.
2. **Ida y vuelta desde la posición:** `aPosición(aUsuarios(p)) = p` para toda `p`.
3. **Ida y vuelta desde el valor:** `aUsuarios(aPosición(n)) = n` para todo valor `n` que corresponda a una posición.
   En particular, **10, 11, 50 y 51 se alcanzan exactamente**.
4. Para cualquier `n`, la diferencia entre `n` y el valor de su posición no supera medio paso de su segmento (0, 5 o 50).

Teclado: las flechas mueven una posición; Inicio y Fin van a las posiciones 0 y 279; Re Pág y Av Pág mueven diez
posiciones.

**Lectores de pantalla (Must, D-48):** el slider tiene la etiqueta «Usuarios activos» y `aria-valuetext` =
«{n} usuarios», donde `n` es el valor real del campo numérico, aunque no corresponda a ninguna posición. Sin ese
texto, un lector de pantalla anunciaría el número de posición (por ejemplo, «14»), que no significa nada para el usuario.

Vectores de prueba (calculados y comprobados de forma exhaustiva para las 280 posiciones y los 10 000 valores):

| ID | Entrada | Resultado | Refs |
|---|---|---|---|
| TV-SL-01 | `aUsuarios(0)` | 1 | RF-16, CL-48 |
| TV-SL-02 | `aUsuarios(9)` | 10 | RF-16, CL-58 |
| TV-SL-03 | `aUsuarios(10)` | 11 | RF-16, CL-58 |
| TV-SL-04 | `aUsuarios(49)` | 50 | RF-16, CL-58 |
| TV-SL-05 | `aUsuarios(50)` | 51 | RF-16, CL-58 |
| TV-SL-06 | `aUsuarios(99)` | 100 | RF-16, D-49 |
| TV-SL-07 | `aUsuarios(100)` | 110 | RF-16, D-49 |
| TV-SL-08 | `aUsuarios(189)` | 1 000 | RF-16, D-49 |
| TV-SL-09 | `aUsuarios(190)` | 1 100 | RF-16, D-49 |
| TV-SL-10 | `aUsuarios(279)` | 10 000 | RF-16, CL-48 |
| TV-SL-11 | `aPosición(105)` | 99 (valor 100; empate, se elige la menor) | RF-16, D-49 |
| TV-SL-12 | `aPosición(106)` | 100 (valor 110) | RF-16, D-49 |
| TV-SL-13 | `aPosición(995)` | 188 (valor 990; empate) | RF-16, D-49 |
| TV-SL-14 | `aPosición(1049)` | 189 (valor 1 000) | RF-16, D-49 |
| TV-SL-15 | `aPosición(1051)` | 190 (valor 1 100) | RF-16, D-49 |
| TV-SL-16 | `aPosición(9999)` | 279 (valor 10 000) | RF-16, CL-48 |

**Proyección** (RF-16, D-11), siempre visible junto a los controles:

| Línea | Ejemplo con 15 usuarios, ES y EUR |
|---|---|
| Tramo 1 · usuarios 1–10 · 10 × 10,00 € | 100,00 € |
| Tramo 2 · usuarios 11–50 · 5 × 8,00 € | 40,00 € |
| Base mensual | 140,00 € |
| Impuesto (ES, 21 %) | 29,40 € |
| **Total mensual** | **169,40 €** |

- Solo aparecen los tramos con usuarios.
- El precio unitario se muestra siempre en EUR, porque es el precio de la tarifa. Subtotales, base, impuesto y total
  aparecen en la divisa seleccionada, con la regla de conversión de §4.4.
- Se actualiza con cada cambio de los controles, en menos de 100 ms (RNF-09).
- **Guardar simulación:** se deshabilita mientras se envía. Con `201`: notificación «Simulación guardada», la
  simulación aparece la primera del historial con los importes **que devuelve el servidor**, y el simulador conserva
  sus valores. Con un error: aviso y los valores se conservan.

### 3.5 Historial

- Tarjetas de la más reciente a la más antigua, con fecha y hora (en la zona horaria del navegador), usuarios,
  almacenamiento, llamadas a la API, base, impuesto (con el tipo **guardado**) y total en la divisa seleccionada.
- **Should:** el desglose por tramo se puede desplegar en cada tarjeta.
- En una divisa distinta de EUR, la nota «Convertido al tipo de cambio actual, no al de la fecha de la simulación» (D-19).
- Paginación con «Cargar más», de 20 en 20.

| Estado | Qué se ve |
|---|---|
| Carga | Esqueleto. |
| Vacío | «Aún no hay simulaciones. Usa el simulador para crear la primera.» (CL-47) |
| Error | Mensaje y «Reintentar». No afecta al simulador. |

### 3.6 V5 · No encontrado

Título «Página no encontrada» (o «Cliente no encontrado» si viene del detalle) y enlace «Volver al inicio».

## 4. Divisas (RF-12, RF-13)

### 4.1 Selector

- Opciones: EUR, USD, GBP, CHF, JPY y MXN (D-21). EUR por defecto.
- La selección se mantiene al navegar entre vistas. **Could:** se recuerda también tras recargar la página.
- EUR funciona siempre, sin depender de la API externa.

### 4.2 Obtención y caché de los tipos (D-22, D-23)

- La petición sale del navegador a `https://open.er-api.com/v6/latest/EUR`, con 5 s de tiempo máximo.
- Se lanza al arrancar la aplicación si no hay tipos en caché vigentes. EUR está disponible desde el primer momento.
- Los tipos se consideran **vigentes** durante 1 h desde que se obtienen, también tras recargar la página.
- No hay sondeo periódico. Tras un `429` no se hacen intentos automáticos durante 20 min (el proveedor bloquea ese tiempo).

### 4.3 Validación de la respuesta (RNF-SEC-13)

La respuesta solo se acepta si se cumplen todas estas condiciones:

1. `result` vale `"success"` (el proveedor puede devolver errores con estado HTTP 200, CL-29).
2. `base_code` vale `"EUR"`.
3. `time_last_update_unix` es un entero positivo.
4. `rates` es un objeto y `rates.EUR` vale `1`.

Además, para cada divisa ofrecida, el valor debe ser un número finito mayor que 0. Si falta o no lo es, solo se
deshabilita esa divisa (CL-31). Si falla cualquiera de las condiciones 1 a 4, la respuesta entera se descarta. Los
campos que no se usan se ignoran.

### 4.4 Estados de los tipos de cambio (D-23, D-51)

**El fallback nunca oculta el error.** El estado de los tipos se muestra siempre en un **indicador fijo de la
cabecera**, junto al selector de divisa. Se ve **sea cual sea la divisa seleccionada**, también en EUR, y no es una
notificación que desaparece. Cada cambio de estado se anuncia a los lectores de pantalla sin interrumpir.

| Estado | Cuándo | Indicador (siempre visible) | Efecto en importes y selector |
|---|---|---|---|
| Cargando | Aún no hay tipos válidos y hay una petición en curso. | «Cargando tipos de cambio…» con un indicador de actividad. | Las divisas distintas de EUR están deshabilitadas; todo funciona en EUR (CL-32). |
| Vigentes | Tipos válidos de hace menos de 1 h. | «Tipos del {fecha de `time_last_update_utc`}». | Todas las divisas válidas, disponibles. |
| Refrescando | Tipos caducados y petición en curso. | «Tipos del {fecha}» + «Actualizando…» con indicador de actividad. | Se siguen usando los anteriores, sin bloquear nada. |
| Desactualizados | Falla el refresco y los tipos guardados tienen menos de 48 h. | Aviso «Tipos desactualizados del {fecha}» y botón **«Reintentar»** (CL-60). | Se usan los tipos guardados, con `≈` y la nota de importes orientativos. |
| Error | No hay tipos válidos (fallo de red, *timeout*, `4xx`/`5xx` incluido `429`, o respuesta que no supera §4.3). | Aviso «No se han podido obtener los tipos de cambio» y botón **«Reintentar»** (CL-30). | Solo EUR. Si había otra divisa seleccionada, se pasa a EUR y el aviso lo dice: «…; importes en EUR». |

Reglas de transición:

- «Reintentar» lanza una petición al momento, aunque se haya recibido un `429` (la restricción de 20 min solo afecta
  a los intentos automáticos). Mientras dura, el indicador pasa a «Cargando…» o «Actualizando…». Si va bien → Vigentes;
  si falla → vuelve a Error o a Desactualizados con el mismo aviso.
- Si se cambia de divisa con una petición en curso, se muestra la última divisa elegida en cuanto haya tipos (CL-33).
- Cada estado (Cargando, Error y Desactualizados) tiene su propio test e2e con la API simulada (AC-80, AC-81, AC-82).

### 4.5 Conversión y formato (D-20)

- Regla única, igual en todas las vistas: se convierten las partidas hoja (subtotales de tramo e impuesto)
  redondeando a los decimales de la divisa; la base y el total son sumas de partidas ya convertidas
  ([`02-reglas-negocio.md`](02-reglas-negocio.md) §4).
- Formato `es-ES` con la divisa. EUR: `169,40 €`. En `es-ES`, los números de cuatro cifras no llevan separador de
  miles (`1000`) y a partir de cinco sí (`10.000`). Los tests comparan sin distinguir el tipo de espacio.
- En una divisa distinta de EUR, los importes llevan delante el signo `≈` y la proyección añade la nota «Importes
  orientativos en {divisa} con tipos del {fecha}».

## 5. Responsive y accesibilidad (RNF-07, RNF-13)

- Ancho mínimo de 360 px sin desplazamiento horizontal (CL-50). Los nombres largos se parten en varias líneas y los
  emails pueden cortarse en cualquier punto.
- Listados: una columna por debajo de 640 px, dos desde 640 px y tres desde 1 024 px en el dashboard.
- Zonas táctiles de al menos 44 × 44 px.
- Todos los controles tienen etiqueta. Los errores están asociados a su campo y el foco va al primer error al enviar.
- **Slider** (§3.4.1):
  - Operable con teclado: flechas (una posición), Inicio y Fin (mínimo y máximo), Re Pág y Av Pág (diez posiciones).
  - `aria-valuetext` = «{n} usuarios». Esto es **Must** (D-48), aunque el resto de este apartado sea Should.
- El total de la proyección está en una región que los lectores de pantalla anuncian sin interrumpir, como mucho cada 500 ms.
- Contraste WCAG 2.1 AA (4,5:1 en texto normal), foco siempre visible, ninguna información solo por color, y se
  respeta `prefers-reduced-motion`.

## 6. Mensajes de error

| `code` | Mensaje |
|---|---|
| `REQUIRED` | Este campo es obligatorio. |
| `TOO_SHORT` / `TOO_LONG` | Debe tener entre {min} y {max} caracteres. |
| `OUT_OF_RANGE` | Introduce un valor entre {min} y {max}. |
| `INVALID_TYPE` | Introduce un número entero. |
| `INVALID_FORMAT` (email) | Introduce un email válido. |
| `INVALID_ENUM` | Selecciona una opción de la lista. |
| `TAX_ID_INVALID_FORMAT` | El formato no es válido para {país} ({tipos admitidos}). |
| `TAX_ID_INVALID_CHECK` | El carácter de control no es correcto. Revisa el identificador. |
| `TAX_ID_UNSUPPORTED_TYPE` | Los NIF que empiezan por K, L o M no están admitidos. |
| `CUSTOMER_ALREADY_EXISTS` | Ya existe un cliente con este identificador fiscal. |
| `CUSTOMER_NOT_FOUND` | El cliente ya no existe. |
| `RATE_LIMITED` | Demasiadas peticiones. Espera {Retry-After} s y vuelve a intentarlo. |
| `INTERNAL_ERROR`, error de red u otro | Algo ha fallado. Inténtalo de nuevo. (Referencia: {8 últimos caracteres del UUID de `instance`}, D-127) |
