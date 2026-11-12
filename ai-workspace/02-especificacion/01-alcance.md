# 01 · Alcance y priorización

Prioridad **MoSCoW**:
- **Must**: sin esto la entrega no cumple el enunciado o una decisión firme del usuario.
- **Should**: importante; se hace después de todos los Must.
- **Could**: deseable si sobra tiempo.
- **Won't**: fuera de alcance en esta entrega.

Los textos completos de RF-01…17 y RNF-01…19 están en [`../01-analisis.md`](../01-analisis.md); aquí se resumen.
RF-18 en adelante y RNF-20 en adelante son **nuevos en esta fase**.

## 1. Requisitos funcionales

| ID | Requisito (resumen) | Prioridad | Decisiones |
|---|---|---|---|
| RF-01 | Alta de cliente corporativo (`POST /customers`). | Must | D-07, D-17, D-34 |
| RF-02 | Validación estricta del identificador fiscal para cualquier país de la lista. | Must | D-14, D-15, D-16 |
| RF-03 | España: algoritmo oficial de control para DNI, NIE y CIF. | Must | D-12, D-13, D-50 |
| RF-04 | Búsqueda de clientes por nombre o identificador fiscal (`GET /customers?q=`). | Must | D-27 |
| RF-05 | Detalle de cliente (`GET /customers/{id}`). | Must | — |
| RF-06 | Formulario de alta de cliente en la interfaz. | Must | D-28 |
| RF-07 | Registro de simulación (`POST /simulations`). | Must | D-04, D-06 |
| RF-08 | Coste base mensual por tramos acumulativos. | Must | D-08, D-10 |
| RF-09 | Impuesto del país del cliente sobre la base. | Must | D-09, D-10 |
| RF-10 | Guardar el cálculo completo de la simulación. | Must | D-18, D-46 |
| RF-11 | Historial de simulaciones de un cliente. | Must | — |
| RF-12 | Tipos de cambio desde una API pública (`open.er-api.com`), con los estados de carga, error y tipos desactualizados siempre visibles. | Must | D-22, D-23, D-51 |
| RF-13 | Selector de divisa que convierte al momento todos los importes. | Must | D-19, D-20, D-21 |
| RF-14 | Vista Buscador y Dashboard. | Must | D-25, D-27 |
| RF-15 | Vista Detalle del cliente (tarjetas responsive + historial). | Must | D-19 |
| RF-16 | Simulador interactivo con proyección en tiempo real. | Must | D-04, D-05, D-11, D-28, D-48, D-49 |
| RF-17 | Guardar la simulación proyectada desde el simulador. | Must | — |
| RF-18 | **(nuevo)** Mostrar la atribución del proveedor de tipos de cambio, como exigen sus términos de uso. | Must | D-24 |
| RF-19 | **(nuevo)** Métricas agregadas en el dashboard: número de clientes, número de simulaciones e importe medio simulado (`GET /stats`). | Could | D-25, D-26 |
| RF-20 | **(nuevo)** Catálogo de referencia para formularios y cálculo: países con su tipo impositivo, planes, tarifas y límites (`GET /catalog`). | Must | D-45 |

## 2. Requisitos no funcionales

| ID | Requisito (resumen) | Prioridad | Decisiones |
|---|---|---|---|
| RNF-01 | Backend Node.js + TypeScript. | Must | D-01 |
| RNF-02 | SQLite. | Must | D-01 |
| RNF-03 | Comunicación por API REST. | Must | D-31 |
| RNF-04 | Cálculos monetarios exactos y un único redondeo documentado. | Must | D-10 |
| RNF-05 | Validación de entrada y errores consistentes. | Must | D-31, D-32, D-33 |
| RNF-06 | Persistencia limpia (restricciones, migraciones versionadas). | Must | — |
| RNF-07 | Interfaz responsive desde 360 px. | Must | — |
| RNF-08 | Estados de carga, error y vacío explícitos. | Must | — |
| RNF-09 | Proyección y conversión sin latencia perceptible (objetivo: < 100 ms desde el cambio hasta que se ve). | Must | — |
| RNF-10 | Código limpio y modular. | Must | — |
| RNF-11 | ~~Seguridad genérica~~ **Sustituido** por RNF-SEC-01…21 ([`06-seguridad.md`](06-seguridad.md)). | — | D-40 |
| RNF-12 | Tests unitarios, de integración y e2e. | Must | D-01 |
| RNF-13 | Accesibilidad básica (WCAG 2.1 AA en contraste, teclado y etiquetas). El `aria-valuetext` del slider es **Must** (D-48). | Should | D-48 |
| RNF-14 | Funciona en Windows, macOS y Linux. | Must | D-03 |
| RNF-15 | `/ai-workspace` con specs y planes. | Must | D-02 |
| RNF-16 | Documentación de arquitectura y directrices para la IA. | Must | — |
| RNF-17 | Evidencias del proceso con IA (prompts literales). | Must | D-39 |
| RNF-18 | README para levantar todo en local en pocos pasos. | Must | D-36 |
| RNF-19 | Repositorio público en GitHub. | Must | D-36 |
| RNF-20 | **(nuevo)** Docker Compose como alternativa de arranque. | Should | D-36 |
| RNF-21 | **(nuevo)** CI en GitHub Actions: lint, tests unitarios, tests de integración y build en una matriz con Node 22, 24 y 26 (en Linux); e2e y auditoría de dependencias una sola vez, con la versión de `.nvmrc`; prueba de humo en Windows y macOS. | Must | D-36, D-37, D-52, D-53 |
| RNF-22 | **(nuevo)** Demo desplegada con URL pública, sujeta a RNF-SEC-20. | Should | D-36, D-47 |
| RNF-23 | **(nuevo)** `engines` con el rango de Node que admite Angular y `.nvmrc`. | Must | D-37, D-38 |
| RNF-24 | **(nuevo)** Health check (`GET /health`) para Docker, CI y la demo. | Should | D-46 |
| RNF-25 | **(nuevo)** Que el plan pueda llegar a influir en el precio cambiando solo datos (tarifas), sin tocar el núcleo del cálculo. | Must | D-08 |
| RNF-26 | **(nuevo)** Un validador fiscal por país detrás de una interfaz común; añadir un país no obliga a cambiar los demás. | Must | D-15 |

Los requisitos de seguridad RNF-SEC-01…21 tienen su prioridad en [`06-seguridad.md`](06-seguridad.md):
todos son Must salvo RNF-SEC-16 y RNF-SEC-20, que son Should (dependen de Docker y de la demo).

## 3. Orden de entrega propuesto

Primero una **porción vertical** (alta → simulación → historial en EUR) y después se completa a lo ancho.
El orden concreto se fija en el plan de implementación.

1. Must del backend: catálogo, clientes, validación fiscal, simulaciones, errores y seguridad.
2. Must del frontend: dashboard, alta, detalle, simulador y divisas.
3. Must de entrega: README, CI con matriz, e2e, `engines` y `.nvmrc`.
4. Should: Docker Compose, health check, accesibilidad, demo pública.
5. Could: métricas del dashboard y recordar la divisa elegida entre sesiones.

## 4. Fuera de alcance (Won't)

| Elemento | Motivo | Refs |
|---|---|---|
| Autenticación, roles y auditoría por usuario | Herramienta interna con un solo rol; justificado en el modelo de amenazas. | D-30, S-02 |
| Edición y borrado de clientes y simulaciones | Solo altas y consultas; las simulaciones son inmutables. | D-29 |
| Comprobar la existencia del identificador (AEAT, VIES, HMRC, IRS) | Exige servicios externos con credenciales. | D-12 |
| Algoritmos de control fuera de España | No obligatorios; el diseño permite añadirlos (RNF-26). | D-15 |
| NIF especiales K, L, M | Se reconocen y se rechazan con un código propio. | D-12 |
| Irlanda del Norte (`XI`) y otros territorios con régimen propio | Fuera de la lista cerrada. | D-09 |
| Precio por almacenamiento, llamadas a la API o plan | Pendiente de negocio. | PN-01, PN-02 |
| Fiscalidad avanzada (inversión del sujeto pasivo, OSS, IGIC, IPSI, *sales tax*) | Pendiente de negocio. | PN-03 |
| Emisión de facturas reales y cobros | No forma parte de un simulador. | — |
| Guardar la divisa o el tipo de cambio en la simulación | EUR es la fuente de verdad. | D-19 |
| Interfaz en varios idiomas | Interfaz en español. | D-35 |
| Divisas fuera de la lista de seis | Lista cerrada. | D-21 |
