# 01 · Análisis de requisitos

| Campo | Valor |
|---|---|
| Estado | **Borrador v0.1, pendiente de revisión** |
| Fecha | 2026-11-12 |
| Fuente | [`00-enunciado.md`](00-enunciado.md) |
| Siguiente paso | Resolver las preguntas abiertas (§8) y redactar `02-especificacion.md` |

> Ninguna de las propuestas de este documento es una decisión cerrada. Todas las ambigüedades
> están en estado **Abierta** hasta que el usuario las valide.

## 0. Convenciones

- **IDs**: `RF-xx` requisito funcional · `RNF-xx` requisito no funcional · `AMB-xx` ambigüedad o hueco ·
  `CL-xx` caso límite · `RT-xx` riesgo técnico · `P-xx` pregunta abierta.
- **Origen** de cada requisito:
  - **E** (explícito): lo dice el enunciado.
  - **I** (implícito): no lo dice, pero sin él no se puede cumplir un requisito explícito.
  - **D** (decisión previa): lo ha decidido el usuario (p. ej. el stack).
  - **P** (propuesto): mejora de calidad que no exige el enunciado. Requiere aprobación.
- **§** hace referencia a las secciones del enunciado (§2.A = Backend, §2.B = Frontend, §3 = Entregables, §4 = Criterios).
- Los IDs son estables: si un requisito se descarta, se marca como tal y su ID no se reutiliza.

## 1. Resumen del problema

Herramienta interna para el equipo comercial. Permite:

1. Dar de alta clientes corporativos con un identificador fiscal validado (con el algoritmo oficial si el país es España).
2. Simular el coste mensual de una suscripción según el número de usuarios, con tarificación por tramos
   acumulativos más el impuesto del país del cliente, y guardar esas simulaciones.
3. Consultar clientes y su historial de simulaciones, y ver todos los importes convertidos a la divisa elegida con
   tipos de cambio de una API pública.

El enunciado da más peso a la planificación (35 %) y al criterio técnico y control de calidad (25 %) que al código (30 %).

## 2. Requisitos funcionales

### 2.1 Clientes

| ID | Requisito | Origen | Ambigüedades |
|---|---|---|---|
| RF-01 | Registrar un cliente corporativo (`POST /customers`) con nombre de empresa, identificador fiscal (DNI/NIF/CIF), email de contacto, país y plan elegido, y guardarlo en SQLite. | E §2.A | AMB-03, AMB-10, AMB-21 |
| RF-02 | Validar de forma estricta el identificador fiscal, sea cual sea el país. | E §2.A | AMB-08, AMB-09 |
| RF-03 | Si el país es España, comprobar obligatoriamente el identificador con el algoritmo oficial de control (DNI/NIF/CIF). | E §2.A | AMB-07, AMB-08 |
| RF-04 | Buscar clientes por nombre de empresa o por identificador fiscal. La vista es explícita; el endpoint que la sirve es implícito. | E §2.B / I | AMB-15 |
| RF-05 | Consultar el detalle de un cliente (endpoint de lectura). | I §2.B | — |
| RF-06 | Dar de alta clientes desde la interfaz. | I | AMB-17 |

### 2.2 Simulaciones y tarificación

| ID | Requisito | Origen | Ambigüedades |
|---|---|---|---|
| RF-07 | Registrar una simulación de consumo (`POST /simulations`) con ID de cliente, número de usuarios activos, almacenamiento contratado y llamadas a la API estimadas. | E §2.A | AMB-01, AMB-02 |
| RF-08 | Calcular el coste mensual base con tarificación **acumulativa por tramos**: usuarios 1–10 a 10 €, 11–50 a 8 €, más de 50 a 5 € por usuario. Ejemplo del enunciado: 15 usuarios = 140 €. | E §2.A | AMB-01, AMB-05 |
| RF-09 | Sumar al coste base el impuesto (Tax/IVA) del país del cliente. | E §2.A | AMB-04, AMB-05 |
| RF-10 | Guardar en base de datos el resultado del cálculo, no solo los datos de entrada. | E §2.A | AMB-11 |
| RF-11 | Listar el historial de simulaciones guardadas de un cliente. La vista es explícita; el endpoint es implícito. | E §2.B / I | AMB-11 |

### 2.3 Frontend

| ID | Requisito | Origen | Ambigüedades |
|---|---|---|---|
| RF-12 | Obtener tipos de cambio de una API pública (`open.er-api.com` o similar). | E §2.B | AMB-14 |
| RF-13 | Selector de divisa de visualización (EUR, USD, GBP…) que convierte al momento todos los importes mostrados. | E §2.B | AMB-12, AMB-13 |
| RF-14 | Vista **Buscador y Dashboard**: buscador por nombre de empresa o identificador fiscal. | E §2.B | AMB-15 |
| RF-15 | Vista **Detalle del cliente**: tarjetas responsive con los datos del cliente y el historial de sus simulaciones. | E §2.B | AMB-12 |
| RF-16 | **Formulario de simulación interactiva**: slider o controles para ajustar el número de usuarios, con la proyección de la factura mensual (tramos) en tiempo real y convertida a la divisa elegida. | E §2.B | AMB-06, AMB-16 |
| RF-17 | Guardar la simulación proyectada desde el formulario (usa RF-07). | I | AMB-16 |

## 3. Requisitos no funcionales

### 3.1 Calidad del software

| ID | Requisito | Origen |
|---|---|---|
| RNF-01 | Backend en Node.js + TypeScript (opción preferida por el enunciado): Fastify + Zod + Drizzle. | E §2.A / D |
| RNF-02 | Persistencia en SQLite. | E §2.A |
| RNF-03 | Frontend y backend se comunican por una API REST. | E §2 |
| RNF-04 | Cálculos monetarios exactos: sin errores de coma flotante y con una única regla de redondeo documentada. | E §4.3 («cálculo preciso de tramos») |
| RNF-05 | El backend valida toda entrada y devuelve errores claros y con un formato consistente. | E §4.3 |
| RNF-06 | Persistencia limpia: esquema con restricciones de integridad, migraciones versionadas y sin datos derivados incoherentes. | E §4.3 |
| RNF-07 | Interfaz responsive, de móvil a escritorio. | E §2.B, §4.3 |
| RNF-08 | Estados de carga, error y vacío explícitos, sobre todo al consumir la API externa. | E §4.3 |
| RNF-09 | Proyección y conversión «en tiempo real»: sin latencia perceptible al mover el slider o cambiar de divisa. | E §2.B |
| RNF-10 | Código limpio y modular, sin ficheros masivos y con patrones consistentes. | E §3.2, §4.2 |
| RNF-11 | Seguridad: validación de entrada, consultas parametrizadas, CORS restringido, sin trazas internas en las respuestas y sin datos personales en los logs. | E §1 (genérico) / I (concreción) |
| RNF-12 | Tests automatizados: unitarios e integración con Vitest, e2e con Playwright. | D |
| RNF-13 | Accesibilidad básica: slider operable con teclado, etiquetas en los formularios y contraste suficiente. | P |
| RNF-14 | Funciona igual en Windows, macOS y Linux (no sabemos qué SO usan los evaluadores). | I §4.4 |

### 3.2 Entregables y proceso

| ID | Requisito | Origen |
|---|---|---|
| RNF-15 | Carpeta `/ai-workspace` en la raíz del repositorio con reglas de negocio, contratos de API y validaciones desglosados antes de programar, más las specs y los planes de acción usados con la IA. | E §3.1 |
| RNF-16 | Documentar la arquitectura: estructura de la base de datos, organización de carpetas y directrices dadas a la IA para que el código sea limpio y modular. | E §3.2 |
| RNF-17 | Evidencias del desarrollo iterativo con la IA: prompts clave, hilos o notas sobre la marcha. | E §3.3 |
| RNF-18 | README con instrucciones para levantar backend y frontend en local, en pocos pasos y sin fricción. | E §4.4 |
| RNF-19 | Entrega en un repositorio público de GitHub (se deduce de «No nos envíes únicamente el código final funcionando en un repositorio público de GitHub»). | I §3 |

## 4. Ambigüedades y huecos

Cada entrada trae la cita o el hueco, el problema que plantea y una propuesta. **Todas están abiertas.**

### AMB-01 · Dominio del número de usuarios
- **Enunciado:** «Tramo 1 (0 a 10 usuarios)». No hay mínimo, máximo ni tipo definidos.
- **Problema:** ¿Una simulación con 0 usuarios es válida? ¿Hay tope? ¿Se admiten decimales?
- **Propuesta:** entero, mínimo 1 y máximo configurable (p. ej. 10 000) para evitar abusos y desbordamientos.
  El «0» del Tramo 1 se lee como el límite inferior del rango, no como un caso de uso.
- **Afecta a:** RF-07, RF-08, RF-16.

### AMB-02 · Almacenamiento contratado y llamadas a la API
- **Enunciado:** se piden como datos de la simulación, pero no tienen precio ni unidad.
- **Problema:** si les ponemos precio, inventamos una regla de negocio. Si no lo tienen, solo son informativos.
- **Propuesta:** se guardan como datos informativos **sin efecto en el precio**. Almacenamiento en GB enteros ≥ 0 y
  llamadas a la API por mes como entero ≥ 0, ambos con un tope razonable.
- **Afecta a:** RF-07, RF-08, RF-16.

### AMB-03 · «Plan elegido»
- **Enunciado:** el cliente guarda un «Plan Elegido», pero no se dice qué planes hay ni si cambian el precio.
  La tabla de tramos es única.
- **Problema:** si el plan cambiara los tramos o los precios, el modelo de precios sería otro.
- **Propuesta:** catálogo cerrado de planes **definido por el usuario**. El plan es un dato descriptivo y no cambia
  el cálculo. No propongo nombres para no inventar el catálogo.
- **Afecta a:** RF-01, RF-08.

### AMB-04 · Impuesto por país
- **Enunciado:** «Al total resultante se le debe sumar el impuesto (Tax/IVA) correspondiente al país del cliente.»
- **Huecos:**
  1. No se dice qué países se admiten ni qué tipo se aplica a cada uno.
  2. En la realidad, una venta B2B dentro de la UE a una empresa con NIF-IVA suele ir con *inversión del sujeto
     pasivo* (sin IVA en factura), y las exportaciones fuera de la UE están exentas. El enunciado pide aplicar el
     impuesto del país del cliente sin más.
  3. Dentro de España hay territorios con otro impuesto (Canarias: IGIC; Ceuta y Melilla: IPSI).
  4. Si un tipo cambia, las simulaciones antiguas tienen que conservar el tipo que se aplicó.
- **Propuesta:**
  - Lista cerrada de países con su tipo general, para validar. Por ejemplo: ES 21 %, PT 23 %, FR 20 %, DE 19 %,
    IT 22 %, GB 20 %, US 0 % (EE. UU. no tiene IVA federal; el *sales tax* es estatal y queda fuera).
  - Aplicar literalmente el tipo del país del cliente, **sin** inversión del sujeto pasivo ni territorios especiales,
    y documentarlo como simplificación aceptada por negocio.
  - Los tipos se guardan como datos configurables, no repartidos por el código.
  - Cada simulación guarda el tipo aplicado (*snapshot*).
- **Afecta a:** RF-01, RF-09, RF-10.

### AMB-05 · Redondeo y precisión
- **Hueco:** no hay regla de redondeo. Con precios enteros en euros la base nunca tiene céntimos, pero el impuesto
  sí puede tener más de dos decimales con tipos decimales (p. ej. 425 € × 8,1 % = 34,425 €).
- **Propuesta:** calcular en **céntimos enteros**. El impuesto se redondea una vez, al céntimo, con redondeo
  comercial (mitad hacia arriba), y total = base + impuesto redondeado. La conversión de divisa no toca los importes
  guardados (ver AMB-12).
- **Afecta a:** RF-08, RF-09, RNF-04.

### AMB-06 · Qué muestra la «proyección de la factura mensual»
- **Enunciado:** «proyección de la factura mensual calculada en base a los tramos y convertida a la divisa seleccionada».
- **Problema:** «factura» hace pensar en un importe con impuesto, pero el texto solo menciona los tramos.
- **Propuesta:** mostrar el desglose por tramos (usuarios × precio por tramo), la base, el impuesto (con su tipo) y el total.
- **Afecta a:** RF-16.

### AMB-07 · Identificadores españoles admitidos y qué significa «verdadero»
- **Enunciado:** «comprobar obligatoriamente que el DNI/NIF/CIF es verdadero utilizando el algoritmo oficial de control».
- **Huecos:**
  1. El NIF abarca más formatos que DNI y CIF: NIE de extranjeros (X/Y/Z) y NIF especiales de personas físicas (K, L, M).
  2. El algoritmo de control solo garantiza que el identificador está **bien formado**, no que **exista**.
     Comprobar la existencia exige servicios de la AEAT con certificado, o VIES para operadores intracomunitarios.
  3. En el CIF, según la letra inicial (tipo de entidad), el carácter de control tiene que ser un dígito, una letra o
     puede ser cualquiera de los dos. Las fuentes no coinciden en algunas letras.
- **Propuesta:**
  - Admitir **DNI** (8 dígitos + letra, módulo 23), **NIE** (X/Y/Z + 7 dígitos + letra; X→0, Y→1, Z→2) y **CIF**
    (letra + 7 dígitos + control). Los NIF especiales K/L/M quedan fuera.
  - «Verdadero» = estructura correcta y carácter de control correcto. Sin consulta a la AEAT.
  - Para el CIF, aplicar la regla habitual (A, B, E, H → dígito; N, P, Q, R, S, W → letra, también cuando los dos
    primeros dígitos son `00`; C, D, F, G, J, U, V → cualquiera) y **contrastarla con la Orden EHA/451/2008** al
    escribir la especificación.
- **Afecta a:** RF-03.

### AMB-08 · Normalización del identificador fiscal
- **Hueco:** no se dice cómo tratar mayúsculas, separadores o prefijos.
- **Problema:** `12345678-z`, `12.345.678 Z` y `ES12345678Z` pueden ser el mismo identificador. Si no se normaliza,
  la búsqueda y la unicidad fallan.
- **Propuesta:** antes de validar, quitar espacios, guiones y puntos y pasar a mayúsculas. Solo se admiten caracteres
  ASCII (se rechazan homóglifos Unicode). Aceptar el prefijo de país `ES` y eliminarlo. **No** rellenar con ceros a la
  izquierda (un DNI de 7 dígitos se rechaza). Se guarda la forma normalizada.
- **Afecta a:** RF-02, RF-03, RF-04.

### AMB-09 · Validación «estricta» fuera de España
- **Enunciado:** la validación es estricta para todos, pero el algoritmo oficial solo es obligatorio para España.
- **Problema:** validar identificadores de cada país es un proyecto en sí mismo.
- **Propuesta:** fuera de España, validación genérica tras normalizar: alfanumérico ASCII de 2 a 20 caracteres.
  Se deja un punto de extensión para añadir validadores por país.
  Alternativa: validar el formato de cada país de la lista cerrada (AMB-04).
- **Afecta a:** RF-02.

### AMB-10 · Unicidad de clientes
- **Hueco:** no se dice si pueden existir dos clientes con el mismo identificador fiscal o el mismo email.
- **Propuesta:** el par (país, identificador normalizado) es único; un duplicado devuelve `409 Conflict`.
  El email no es único (un mismo contacto puede gestionar varias empresas).
- **Afecta a:** RF-01.

### AMB-11 · Qué se guarda de una simulación
- **Enunciado:** «Este cálculo debe persistirse en la base de datos.»
- **Propuesta:** guardar las entradas, el desglose por tramo, la base, el tipo impositivo aplicado, el impuesto y el
  total en céntimos de EUR, con fecha en UTC. El backend **siempre recalcula**: no acepta importes enviados por el cliente.
- **Afecta a:** RF-07, RF-10, RF-11.

### AMB-12 · La divisa solo afecta a la visualización
- **Enunciado:** «cambiar dinámicamente la divisa de visualización».
- **Huecos:**
  1. ¿Se guarda con la simulación la divisa o el tipo de cambio del momento?
  2. Al convertir base, impuesto y total por separado, el redondeo puede hacer que base + impuesto ≠ total.
- **Propuesta:** la fuente de verdad es siempre EUR y no se guarda la divisa. El historial se muestra al tipo de cambio
  **actual**, con un aviso de importe orientativo y la fecha de los tipos. Para que el desglose cuadre, se convierten
  base e impuesto y el total mostrado es la suma de ambos ya redondeados.
- **Afecta a:** RF-13, RF-15, RF-16.

### AMB-13 · Divisas que se ofrecen
- **Enunciado:** «(EUR, USD, GBP, etc.)». La API devuelve 166 divisas.
- **Propuesta:** una lista corta de divisas habituales (p. ej. EUR, USD, GBP, CHF, JPY, MXN), para validar.
  El formato se adapta a los decimales de cada divisa (JPY no tiene decimales).
- **Afecta a:** RF-13.

### AMB-14 · Desde dónde se llama a la API de tipos de cambio y qué es «tiempo real»
- **Enunciado:** «La interfaz debe conectar con una API pública de tipos de cambio».
- **Datos comprobados (§9):** la API permite CORS (`*`), actualiza los tipos una vez al día y declara caché de 1 hora.
- **Problema:** llamarla desde el navegador cumple el enunciado al pie de la letra. Pasar por el backend daría caché
  compartida y más resiliencia, pero se aparta del texto. «Tiempo real» no puede significar tipos al segundo.
- **Propuesta:** llamada desde el frontend, con caché en sesión, validación del esquema de la respuesta y vuelta a EUR
  si falla. «Tiempo real» = la conversión se recalcula al instante al cambiar la divisa o mover el slider. La decisión
  técnica final se toma en la fase de arquitectura.
- **Afecta a:** RF-12, RF-13, RNF-08, RNF-09.

### AMB-15 · Contenido del «Dashboard» y comportamiento del buscador
- **Enunciado:** «Buscador y Dashboard: Un buscador por nombre de empresa o identificador fiscal.»
- **Huecos:** no se dice qué más incluye el «Dashboard», ni si la búsqueda es parcial, distingue mayúsculas o acentos,
  ni qué pasa con la búsqueda vacía o con muchos resultados.
- **Propuesta:** el dashboard es el listado paginado de clientes (todos si no hay búsqueda) con el buscador encima.
  Sin KPIs, para no inventar métricas. Búsqueda parcial que no distingue mayúsculas ni acentos en el nombre, y por
  identificador normalizado (AMB-08).
- **Afecta a:** RF-04, RF-14.

### AMB-16 · Contexto del simulador
- **Problema:** el impuesto depende del país del cliente, así que la proyección necesita un cliente. ¿Se puede simular
  sin cliente («presupuesto rápido»)? ¿El simulador vive dentro del detalle del cliente?
- **Propuesta:** el simulador siempre trabaja sobre un cliente y está dentro de su detalle o se abre desde él.
  Dónde se calcula la proyección (frontend, backend o lógica compartida) se decide en arquitectura (ver RT-02).
- **Afecta a:** RF-16, RF-17.

### AMB-17 · Alta de cliente desde la interfaz
- **Hueco:** el enunciado exige `POST /customers`, pero no incluye un formulario de alta entre las vistas obligatorias.
- **Problema:** sin formulario, los clientes solo podrían crearse con datos de ejemplo o llamando a la API a mano.
- **Propuesta:** añadir un formulario de alta sencillo que muestre los errores de validación fiscal que devuelva el backend.
- **Afecta a:** RF-06.

### AMB-18 · Edición y borrado
- **Hueco:** solo se piden altas y consultas.
- **Propuesta:** sin edición ni borrado. Las simulaciones son inmutables (son presupuestos históricos).
- **Afecta a:** RF-01, RF-07.

### AMB-19 · Autenticación y autorización
- **Hueco:** es una «herramienta interna» y no se menciona el control de acceso.
- **Propuesta:** fuera de alcance, documentado como riesgo (RT-09) y con un punto de extensión.
- **Afecta a:** RNF-11.

### AMB-20 · Rutas y contrato de errores de la API
- **Huecos:** solo se definen dos rutas de escritura. No hay códigos de estado, formato de error ni paginación.
- **Propuesta:** respetar literalmente `POST /customers` y `POST /simulations` (sin prefijo de versión) y definir el
  resto en la especificación: errores en formato *Problem Details* (RFC 9457) con `400`, `404`, `409` y `422`, y
  paginación por `limit`/`offset`.
- **Afecta a:** RF-01, RF-04, RF-05, RF-07, RF-11, RNF-05.

### AMB-21 · Validación de email y nombre de empresa
- **Propuesta:** email con formato válido según el validador estándar de Zod, guardado en minúsculas, de 254 caracteres
  como máximo. Nombre de empresa sin espacios al principio ni al final, de 2 a 200 caracteres.
- **Afecta a:** RF-01.

### AMB-22 · Idioma y formato de la interfaz
- **Propuesta:** interfaz en español, con números y fechas en formato `es-ES` y la divisa según la selección.
- **Afecta a:** RF-13 a RF-16.

### AMB-23 · Entrega y arranque en local
- **Huecos:** no se dice si hay que usar Docker ni si debe haber datos de ejemplo.
- **Propuesta:** arranque solo con npm (instalar, migrar y sembrar, levantar todo con un comando), sin depender de
  Docker. Datos de ejemplo con empresas ficticias e identificadores generados con un carácter de control válido.
- **Afecta a:** RNF-18.

## 5. Casos límite

Lo que aparece como «esperado» depende de cómo se resuelvan las ambigüedades indicadas.

### 5.1 Tarificación por tramos

Valores calculados y comprobados con un script durante el análisis:

| ID | Usuarios | Cálculo | Base esperada | Qué cubre |
|---|---|---|---|---|
| CL-01 | 0 | — | 0 € o error | AMB-01 |
| CL-02 | 1 | 1 × 10 | 10 € | Mínimo |
| CL-03 | 10 | 10 × 10 | 100 € | Último usuario del Tramo 1 |
| CL-04 | 11 | 100 + 1 × 8 | 108 € | Primer usuario del Tramo 2 |
| CL-05 | 15 | 100 + 5 × 8 | **140 €** | Ejemplo del enunciado (*golden test*) |
| CL-06 | 50 | 100 + 40 × 8 | 420 € | Último usuario del Tramo 2 |
| CL-07 | 51 | 420 + 1 × 5 | 425 € | Primer usuario del Tramo 3 |
| CL-08 | 100 | 420 + 50 × 5 | 670 € | Tramo 3 |
| CL-09 | 1 000 | 420 + 950 × 5 | 5 170 € | Volumen alto |

- **CL-10 (invariantes):** el coste crece siempre con los usuarios, y el coste del usuario *n* es igual al precio
  del tramo de *n*: `f(n) − f(n−1) ∈ {10, 8, 5}`. Esto se puede comprobar con tests de propiedades.
- **CL-11 (interpretación errónea típica):** la tarificación por volumen (todos los usuarios al precio del último
  tramo) daría 15 × 8 = 120 €. Un test tiene que impedirlo.
- **CL-12 (entradas inválidas):** usuarios negativos, decimales (`10.5`), cadenas (`"15"`), `null`, campo ausente,
  valores por encima del máximo, notación exponencial (`1e3`) y campos extra con importes calculados por el cliente.

### 5.2 Impuestos y redondeo

- **CL-13:** 140 € con el 21 % → impuesto 29,40 € → total 169,40 €.
- **CL-14:** país con tipo 0 % → total = base.
- **CL-15:** tipo con decimales (hipotético 8,1 %) sobre 425 € → 34,425 € → hay que redondear según la regla de AMB-05.
- **CL-16:** cambia el tipo de un país después de guardar una simulación → la simulación antigua conserva su tipo.
- **CL-17:** país sin tipo definido → se rechaza al dar de alta el cliente (lista cerrada).

### 5.3 Validación fiscal (España)

Caracteres de control calculados con script; se volverán a verificar contra fuentes oficiales en la especificación.

- **CL-18 (DNI):** `12345678Z` es válido. `12345678A` es inválido (letra incorrecta). `12345678z` y `12.345.678-Z`
  son válidos tras normalizar (AMB-08). `1234567L` (7 dígitos) depende de AMB-08. `123456789` (sin letra) es inválido.
  Las letras I, Ñ, O y U no aparecen en la tabla de control, así que nunca son válidas.
- **CL-19 (DNI con todo ceros):** `00000000T` cumple el algoritmo. Hay que decidir si se acepta. Propuesta: sí, porque
  es lo que dice el algoritmo.
- **CL-20 (NIE):** `X1234567L`, `Y1234567X` y `Z1234567R` son válidos. Un prefijo que no sea X/Y/Z
  (`W1234567L`) es inválido.
- **CL-21 (CIF con control numérico):** `B12345674` es válido. `B1234567D` es inválido (la B exige dígito).
- **CL-22 (CIF con control letra):** `Q1234567D` es válido. `Q12345674` es inválido (la Q exige letra).
- **CL-23 (CIF con control indistinto):** `C12345674` y `C1234567D` son válidos los dos.
- **CL-24 (CIF con letra no admitida):** `I1234567…`, `O1234567…` → inválido.
- **CL-25 (prefijo de país):** `ESB12345674` → se normaliza o se rechaza según AMB-08.
- **CL-26 (homóglifos):** una «В» cirílica en lugar de la «B» latina, o dígitos de ancho completo → inválido.
- **CL-27 (país y formato incoherentes):** país ES con un NIF-IVA francés → inválido. País FR con un DNI español →
  se aplica la validación genérica (AMB-09).
- **CL-28 (duplicado con distinto formato):** dar de alta `12345678-Z` cuando ya existe `12345678Z` → `409` (AMB-10).

### 5.4 Divisas y API externa

- **CL-29:** la API responde HTTP 200 con `"result": "error"` → se trata como error. Hay que validar el cuerpo, no solo el código de estado.
- **CL-30:** error de red, *timeout*, `429` o `5xx` → estado de error, botón de reintento y vuelta a EUR. EUR siempre
  funciona sin la API.
- **CL-31:** la respuesta no trae la divisa seleccionada, o cambia su esquema → se descarta y se muestra un error controlado.
- **CL-32:** respuesta lenta → estado de carga. El slider sigue funcionando en EUR mientras tanto.
- **CL-33:** se cambia de divisa mientras hay una petición en curso, o llegan respuestas fuera de orden → solo cuenta la última.
- **CL-34:** divisas con distintos decimales (JPY 0, KWD 3) → formato con `Intl.NumberFormat`.
- **CL-35:** desglose convertido que no cuadra (base + impuesto ≠ total convertido) → regla de AMB-12.
- **CL-36:** tipos con un día de antigüedad (la API se actualiza a diario) → se muestra la fecha de actualización.

### 5.5 Búsqueda

- **CL-37:** búsqueda vacía o solo con espacios → listado completo paginado (AMB-15).
- **CL-38:** mayúsculas y acentos (`telefonica` debe encontrar `Telefónica`). El `LIKE` de SQLite solo ignora
  mayúsculas en ASCII (RT-08).
- **CL-39:** identificador buscado con otro formato (`12345678-z`) → se normaliza antes de buscar.
- **CL-40:** comodines de `LIKE` (`%`, `_`) dentro del texto buscado → se escapan.
- **CL-41:** sin resultados → estado vacío. Muchos resultados → paginación.
- **CL-42:** escritura rápida → *debounce* y cancelación de la petición anterior para que una respuesta vieja no pise a una nueva.

### 5.6 Simulaciones y persistencia

- **CL-43:** `customerId` inexistente o mal formado → `404` o `422` (se fija en la especificación).
- **CL-44:** el cliente envía importes calculados → se ignoran o se rechazan; el servidor siempre recalcula.
- **CL-45:** doble clic en «Guardar» → no deben crearse duplicados por accidente (botón deshabilitado mientras se envía).
- **CL-46:** almacenamiento o llamadas a la API iguales a 0, o valores enormes (por encima de 2⁵³ o del entero de 64 bits de SQLite) → límites explícitos.
- **CL-47:** cliente sin simulaciones → estado vacío. Historial ordenado de la más reciente a la más antigua.

### 5.7 Interfaz

- **CL-48:** slider en los extremos, manejo con teclado, y sincronización con un campo numérico cuando se escribe un valor fuera de rango.
- **CL-49:** ruta de detalle con un ID inexistente → vista de «no encontrado».
- **CL-50:** pantallas de 360 px de ancho con nombres de empresa o emails muy largos → sin desbordes.
- **CL-51:** backend caído → estado de error en todas las vistas, sin pantallas en blanco.

## 6. Riesgos técnicos

Probabilidad (P) e impacto (I): A = alto, M = medio, B = bajo.

| ID | Riesgo | P | I | Mitigación propuesta |
|---|---|---|---|---|
| RT-01 | Errores de precisión monetaria con coma flotante. | M | A | Céntimos enteros, una única regla de redondeo y tests en los límites de los tramos. |
| RT-02 | Que la lógica de tarificación del frontend (proyección) y la del backend (guardado) acaben dando resultados distintos. | A | A | Una sola implementación o el backend como única fuente de verdad. Se decide en arquitectura y se cubre con tests de contrato. |
| RT-03 | Implementar mal el CIF (reglas de letra o dígito según el tipo de entidad, en las que las fuentes no coinciden). | M | A | Basar la especificación en la norma oficial, usar vectores de prueba verificados y tests parametrizados. |
| RT-04 | Depender de la API externa (caídas, límite de peticiones, cambios de contrato, términos de uso que pueden exigir atribución). | M | M | Validar la respuesta con un esquema, caché, vuelta a EUR, mostrar la fecha de los tipos y revisar los términos de uso. |
| RT-05 | Tests e2e poco fiables por depender de la API externa y del estado de la base de datos. | A | M | Interceptar la API en Playwright y usar una base de datos efímera con datos de ejemplo en cada ejecución. |
| RT-06 | Que el driver nativo de SQLite exija compilar en la máquina del evaluador si no hay binarios para su plataforma. Esto afecta directamente al 10 % de README y despliegue. | M | A | Evaluar en arquitectura drivers con binarios precompilados o el módulo `node:sqlite`, probar una instalación limpia y fijar la versión de Node (`engines`, `.nvmrc`). |
| RT-07 | Versiones de TypeScript o dependencias incompatibles entre Angular y el backend dentro de los workspaces de npm. | M | M | Una versión de TS compatible con Angular fijada en la raíz, *lockfile* versionado e instalación con `npm ci`. |
| RT-08 | La búsqueda que no distingue mayúsculas ni acentos no es trivial en SQLite (`LIKE` solo ignora mayúsculas en ASCII). | A | M | Columna de búsqueda normalizada y escape de comodines. |
| RT-09 | Datos personales (emails y DNI/NIE de autónomos) en una herramienta sin autenticación. | M | M | Declarar el alcance, no registrar datos personales en los logs, CORS restringido y punto de extensión para autenticación. |
| RT-10 | Que la simplificación fiscal (sin inversión del sujeto pasivo ni territorios especiales) se interprete como un error de dominio. | M | M | Documentarla como regla validada por negocio y mantener los tipos configurables. |
| RT-11 | Código generado por la IA desordenado: ficheros enormes, duplicación, patrones inconsistentes. Es justo lo que se evalúa. | A | A | Reglas de código en `CLAUDE.md`, lint y formato automáticos, límites de tamaño, revisión fase a fase y checklist de revisión. |
| RT-12 | Que el alcance crezca más que el tiempo disponible. | A | M | Priorizar con MoSCoW en la especificación y dejar explícito lo que queda fuera. |
| RT-13 | Node 22, la versión instalada, ya está en mantenimiento y deja de tener soporte el 2027-04-30. | B | B | Ver la pregunta P-19. |
| RT-14 | Diferencias entre sistemas operativos: fin de línea, rutas, scripts de shell no portables. | M | M | `.gitattributes` con LF (ya añadido) y scripts de npm multiplataforma. |
| RT-15 | Respuestas de búsqueda o de tipos de cambio que llegan fuera de orden. | M | B | Cancelar la petición anterior (`switchMap` / `AbortController`). |

## 7. Fuera de alcance propuesto (por validar)

- Autenticación y roles (AMB-19).
- Emitir facturas reales, cobros o integración con pasarelas de pago.
- Comprobar que el identificador existe en la AEAT o en VIES (AMB-07).
- Que el plan, el almacenamiento o las llamadas a la API influyan en el precio, mientras no se definan (AMB-02, AMB-03).
- Edición y borrado de clientes y simulaciones (AMB-18).
- Fiscalidad avanzada: inversión del sujeto pasivo, OSS, IGIC o IPSI, *sales tax* de EE. UU. (AMB-04).
- Interfaz en varios idiomas (AMB-22).

## 8. Preguntas abiertas

| ID | Pregunta | Ambigüedad |
|---|---|---|
| P-01 | ¿Rango válido de usuarios? | AMB-01 |
| P-02 | ¿El almacenamiento y las llamadas a la API afectan al precio? ¿En qué unidades? | AMB-02 |
| P-03 | ¿Qué planes existen? ¿Afectan al precio? | AMB-03 |
| P-04 | ¿Qué países y tipos impositivos admitimos? ¿Aceptas la simplificación fiscal? | AMB-04 |
| P-05 | ¿Regla de redondeo? ¿Qué muestra la proyección? | AMB-05, AMB-06 |
| P-06 | ¿Qué identificadores españoles se admiten? ¿«Verdadero» = carácter de control correcto? | AMB-07 |
| P-07 | ¿Cómo se normaliza el identificador (prefijo `ES`, separadores, ceros a la izquierda)? | AMB-08 |
| P-08 | ¿Qué validación se aplica fuera de España? | AMB-09 |
| P-09 | ¿Qué debe ser único? | AMB-10 |
| P-10 | ¿Qué se guarda de cada simulación? ¿Cómo se muestra el historial en otra divisa? | AMB-11, AMB-12 |
| P-11 | ¿Solo altas y consultas, sin edición ni borrado? | AMB-18 |
| P-12 | ¿Qué incluye el dashboard y cómo se comporta la búsqueda? | AMB-15 |
| P-13 | ¿Hay formulario de alta en la interfaz? ¿El simulador siempre va ligado a un cliente? | AMB-16, AMB-17 |
| P-14 | ¿Qué divisas se ofrecen? ¿La llamada a la API sale del navegador o del backend? | AMB-13, AMB-14 |
| P-15 | ¿La autenticación queda fuera de alcance? | AMB-19 |
| P-16 | ¿Rutas literales sin prefijo? ¿Errores con RFC 9457? | AMB-20 |
| P-17 | ¿Interfaz en español con formato `es-ES`? | AMB-22 |
| P-18 | ¿Arranque solo con npm? ¿Datos de ejemplo? ¿Repositorio público en GitHub? | AMB-23, RNF-19 |
| P-19 | ¿Actualizamos Node? | RT-13, §9 |
| P-20 | ¿Guardamos los prompts de cada fase en `ai-workspace/` como evidencia? | RNF-17 |

## 9. Datos comprobados durante el análisis (2026-11-12)

| Dato | Valor |
|---|---|
| Entorno local | Node `v22.23.4`, npm `10.9.9`, git `2.42.0` |
| Calendario de Node | 22 (Jod): mantenimiento hasta 2027-04-30 · 24 (Krypton): mantenimiento hasta 2028-04-30 · 26 (Lithium): LTS activa desde 2026-10-28 hasta 2029-04-30 |
| `@angular/cli` | `latest` = 22.2.6 · `engines.node`: `^22.22.3 \|\| ^24.15.0 \|\| >=26.0.0` |
| `vitest` | 5.1.0 · `engines.node`: `^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0` |
| `better-sqlite3` (candidato, sin decidir) | 13.1.1 · `engines.node`: `>=22` |
| `GET https://open.er-api.com/v6/latest/EUR` | HTTP 200 · `access-control-allow-origin: *` · `Cache-Control: public, max-age=3600` · campos `result`, `base_code`, `time_last_update_utc`, `time_next_update_utc`, `rates` (166 divisas) · actualización diaria |
| Script de verificación | Tramos (CL-01…CL-09) y caracteres de control DNI/NIE/CIF (CL-18…CL-23) recalculados con un script aparte; el script no forma parte del repositorio |
