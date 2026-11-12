<!--
Transcripción del enunciado original para tenerlo versionado.

- Fuente: "Prueba Devs con IA (1).docx" (recibido por el candidato).
- Fecha de transcripción: 2026-11-12.
- Método: extracción del XML del .docx (texto, negritas, cursivas, niveles de lista) y paso a Markdown.
  El texto no se ha modificado: se conservan redacción, mayúsculas y puntuación del original.
- Notas de transcripción:
  1. En el original, el ejemplo de cálculo y la frase "Al total resultante se le debe sumar el impuesto..."
     están dentro de la viñeta del "Tramo 3" mediante saltos de línea. Se conserva esa estructura,
     aunque por contexto aplican a todo el algoritmo de tramos.
  2. La URL de la API de tipos de cambio aparece en el original escrita literalmente con sintaxis
     Markdown de enlace; se mantiene tal cual.
  3. Las viñetas del original son "●" (nivel 1) y "○" (nivel 2); la lista de criterios de evaluación es numerada.
-->

# RETO TÉCNICO: SaaS-O-Matic (Dynamic Billing & Subscription Optimizer)

## 1. Introducción y Filosofía del Reto

En nuestra compañía el desarrollo de software ha evolucionado. Ya no evaluamos únicamente tu velocidad para picar código repetitivo, ya que hoy en día contamos con Inteligencias Artificiales generativas que nos sirven de copilotos.

Lo que realmente nos importa es tu **criterio de ingeniería, tu capacidad para diseñar sistemas, tu destreza para estructurar planes de desarrollo (Spec-Driven Development) y tu habilidad para guiar a la IA en caliente (Vibe Coding)**, manteniendo en todo momento el control de la arquitectura, la calidad del código y la seguridad.

Para demostrar estas habilidades, vas a construir **SaaS-O-Matic**: una herramienta interna para que nuestro equipo comercial pueda simular, optimizar y presupuestar suscripciones SaaS multi-divisa para clientes corporativos.

## 2. Requisitos Técnicos del Sistema

La solución debe constar de un frontend interactivo y un backend conectado a una base de datos que se comuniquen entre sí.

### A. El Backend (API REST & Base de Datos)

- **Tecnología:** Libre elección, preferiblemente **Node.js (TypeScript)** o **Python**.
- **Base de Datos:** **SQLite**.
- **Endpoints requeridos:**
  - POST /customers: Registrar un cliente corporativo guardando Nombre de empresa, Identificador Fiscal (DNI/NIF/CIF), Email de contacto, País y Plan Elegido.
  - **Validación Algorítmica:** Debes implementar una validación estricta del Identificador Fiscal introducido. Si el país seleccionado es España, el sistema debe comprobar obligatoriamente que el DNI/NIF/CIF es verdadero utilizando el algoritmo oficial de control.
  - POST /simulations: Registrar una simulación de consumo para un cliente (ID de cliente, número de usuarios activos, almacenamiento contratado y llamadas a la API estimadas). Este cálculo debe persistirse en la base de datos.
- **Lógica de Negocio (Algoritmo de Facturación Gradual por Tramos):**  
  Para calcular el coste mensual base del cliente, debes implementar un algoritmo de tarificación acumulativo por tramos (Tiered Pricing):
  - **Tramo 1 (0 a 10 usuarios):** 10 € / usuario.
  - **Tramo 2 (11 a 50 usuarios):** 8 € / usuario.
  - **Tramo 3 (Más de 50 usuarios):** 5 € / usuario.  
    *(Ejemplo: Si un comercial simula 15 usuarios, los primeros 10 se cobran a 10 € cada uno, y los 5 restantes a 8 € cada uno. Total coste base = 100 € + 40 € = 140 €)*.  
    Al total resultante se le debe sumar el impuesto (Tax/IVA) correspondiente al país del cliente.

### B. El Frontend (Dashboard Comercial)

- **Tecnología:** Libre elección (Angular, React, Vue, Svelte, Next.js, etc.).
- **Integración con API Externa:**
  - La interfaz debe conectar con una API pública de tipos de cambio (como [https://open.er-api.com/v6/latest/EUR](https://open.er-api.com/v6/latest/EUR) o similar) para que el usuario pueda cambiar dinámicamente la divisa de visualización en la pantalla (EUR, USD, GBP, etc.) y ver los costes convertidos en tiempo real.
- **Vistas obligatorias:**
  - **Buscador y Dashboard:** Un buscador por nombre de empresa o identificador fiscal.
  - **Detalle del Cliente (Cards):** Tarjetas responsive que muestren los datos del cliente corporativo y un listado/historial con sus simulaciones de coste guardadas.
  - **Formulario de Simulación Interactiva:** Un slider o controles dinámicos para ajustar la cantidad de usuarios y ver, en tiempo real, la proyección de la factura mensual calculada en base a los tramos y convertida a la divisa seleccionada.

## 3. Entregables: Tu espacio de trabajo con IA

No nos envíes únicamente el código final funcionando en un repositorio público de GitHub. Para nosotros, **el valor real reside en el proceso de ingeniería**. Queremos ver cómo diseñas, planificas e interactúas con los modelos de IA.

Junto con el código del proyecto, debes incluir en la raíz de tu repositorio una carpeta llamada /ai-workspace (o el nombre que prefieras). **La estructura es 100% libre**.

La carpeta debe servirnos para entender cómo has gestionado estas tres dimensiones:

### 1. Planificación de Funcionalidades y Specs (Spec-Driven Development)

- Queremos ver cómo desglosaste las reglas de negocio, los contratos de la API y las validaciones antes de empezar a programar.
- Compártenos las especificaciones, prompts estructurados o "planes de acción" que diseñaste para guiar a la IA en la creación de las diferentes features del sistema.

### 2. Definición de la Arquitectura

- Muestra cómo planteaste la estructura de la base de datos y la organización de carpetas del proyecto.
- Explícanos qué directrices le diste a la IA (o cómo configuraste tu entorno) para asegurar que el código final siguiera patrones limpios y modulares, evitando que generara código desorganizado o archivos masivos difíciles de mantener.

### 3. El Proceso de "Vibe Coding" y Control de Calidad

- **Interacción real:** Déjanos ver cómo fue el desarrollo iterativo con la IA (Internamente utilizamos claude, pero puedes utilizar el que prefieras.). Puedes adjuntar capturas de prompts clave, hilos de conversación o notas sobre la marcha.

## 4. Criterios de Evaluación

1. **Capacidad de Planificación y Diseño (35%):** Evaluamos cómo estructuras las especificaciones y diseñas los pasos lógicos del sistema. Un buen ingeniero define con precisión el problema antes de delegar la escritura de código a la máquina.
2. **Criterio Técnico y Control de Calidad (25%):** Valoramos tu rol como "director de orquesta". Buscamos profesionales que entiendan el código generado por la IA, que sepan auditarlo y que no acepten soluciones subóptimas o con deuda técnica.
3. **Calidad del Software Entregado (30%):** Robustez del backend (validaciones correctas, cálculo preciso de tramos, persistencia limpia en base de datos) y fluidez del frontend (interfaz responsive, manejo de estados de carga/error al consumir la API externa).
4. **README y Despliegue (10%):** Instrucciones claras en tu repositorio para poder levantar tanto el backend como el frontend en local en pocos pasos y sin fricciones.
