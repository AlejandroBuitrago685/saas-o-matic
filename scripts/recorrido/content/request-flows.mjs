// @ts-check
/**
 * Three requests followed through the system map (D-192), step by step: which pieces and lines each step lights, the
 * request on the line, what happens, a worked example, its references and its tests. The example numbers are the
 * ones of the specification (TV-PR-07, the DNI rule of 03-validacion-fiscal); `tools/recorrido.test.ts` checks that
 * every piece, line, reference and path exists.
 */

/**
 * @typedef {object} FlowStep
 * @property {string} title
 * @property {string} text
 * @property {string} [example] a worked example, in monospace
 * @property {string[]} lit the pieces taking part
 * @property {string[]} edges the lines it travels, in order; `<` runs a line backwards (a response)
 * @property {string} [label] the request on the line
 * @property {string[]} refs
 * @property {string[]} tests
 */

/** @typedef {{ id: string, name: string, summary: string, steps: FlowStep[] }} RequestFlow */

const REQUEST = ['web-cloudflare', 'cloudflare-nginx', 'nginx-api'];
const RESPONSE = ['<nginx-api', '<cloudflare-nginx', '<web-cloudflare'];
const ROUND_TRIP = ['web', 'cloudflare', 'nginx', 'api'];

/** @type {readonly RequestFlow[]} */
export const REQUEST_FLOWS = [
  {
    id: 'alta',
    name: 'Alta con NIF',
    summary: 'Un cliente con un DNI mal escrito, del formulario a la base de datos.',
    steps: [
      {
        title: 'Rellenas el alta',
        text: 'Empresa, identificador fiscal, email, país y plan. La web solo comprueba que estén, su longitud y el formato del email: la regla fiscal vive en un único sitio.',
        example: 'país ES · identificador 12345678A',
        lit: ['web'],
        edges: [],
        refs: ['RF-01', 'AC-72'],
        tests: ['e2e/specs/customer-create.spec.ts'],
      },
      {
        title: 'Viaja a la API',
        text: 'nginx reenvía /api a la API desde el mismo origen. En la demo pasa antes por Cloudflare, y el límite de escrituras cuenta por cliente.',
        lit: ROUND_TRIP,
        edges: REQUEST,
        label: 'POST /api/customers',
        refs: ['ADR-012', 'RNF-SEC-08'],
        tests: ['apps/api/src/http/rate-limit.test.ts'],
      },
      {
        title: 'El contrato filtra la forma',
        text: 'El esquema Zod estricto rechaza con un 400 un campo que falta, uno desconocido o un tipo erróneo, antes de que llegue al caso de uso.',
        lit: ['api', 'contrato'],
        edges: ['api-contrato'],
        refs: ['ADR-002', 'RNF-SEC-01'],
        tests: ['apps/api/src/modules/customers/create-customer.routes.test.ts'],
      },
      {
        title: 'El dominio aplica el algoritmo oficial',
        text: 'La letra de un DNI es la que corresponde al resto de dividir el número entre 23. Si no coincide, la API responde 422 con el código del error.',
        example: '12345678 mod 23 = 14 → Z ≠ A → 422 TAX_ID_INVALID_CHECK',
        lit: ['api', 'dominio'],
        edges: ['api-dominio'],
        refs: ['RF-03', 'AC-10', 'AC-11'],
        tests: ['packages/domain/src/tax-id/validate-tax-id.test.ts'],
      },
      {
        title: 'Se guarda sin carreras',
        text: 'Con un identificador válido se inserta con un UUID v7. El índice único de país e identificador convierte un duplicado en un 409, sin «comprobar y luego insertar».',
        lit: ['api', 'sqlite'],
        edges: ['api-sqlite'],
        label: 'INSERT',
        refs: ['D-120', 'AC-20'],
        tests: ['apps/api/src/modules/customers/customers.repository.test.ts'],
      },
      {
        title: 'La respuesta vuelve a la pantalla',
        text: 'Un 201 lleva al detalle del cliente. Un error llega en formato RFC 9457 y la web lo pinta junto al campo que lo causó.',
        lit: ROUND_TRIP,
        edges: RESPONSE,
        label: '201 · 409 · 422',
        refs: ['ADR-009', 'AC-73'],
        tests: ['e2e/specs/customer-create.spec.ts'],
      },
    ],
  },
  {
    id: 'simular',
    name: 'Simular y guardar',
    summary: 'Una proyección de 100 usuarios en España, del slider al historial.',
    steps: [
      {
        title: 'La web carga el catálogo',
        text: 'Tramos e impuestos por país vienen de la API y se validan con el mismo código del dominio. Un catálogo que no valida es un error, nunca una suposición.',
        lit: ROUND_TRIP,
        edges: REQUEST,
        label: 'GET /api/catalog',
        refs: ['D-95', 'ADR-005'],
        tests: ['apps/api/src/modules/catalog/catalog.routes.test.ts'],
      },
      {
        title: 'Mueves el slider: el cálculo, en el navegador',
        text: 'calculatePricing corre en el navegador, sin esperar a la red: tramos acumulativos y un único redondeo del impuesto sobre la base.',
        example: '10 × 10 € + 40 × 8 € + 50 × 5 € = 670 € · + 21 % = 810,70 €',
        lit: ['web', 'dominio'],
        edges: ['web-dominio'],
        refs: ['ADR-008', 'AC-01', 'TV-PR-07'],
        tests: ['packages/domain/src/pricing/calculate-pricing.test.ts', 'e2e/specs/simulator.spec.ts'],
      },
      {
        title: 'Guardar envía solo cantidades',
        text: 'Cliente, usuarios, almacenamiento y llamadas a la API. Si el cuerpo trae un importe, el contrato lo rechaza con un 400.',
        lit: [...ROUND_TRIP, 'contrato'],
        edges: [...REQUEST, 'api-contrato'],
        label: 'POST /api/simulations',
        refs: ['D-43', 'RNF-SEC-03'],
        tests: ['apps/api/src/modules/simulations/create-simulation.validation.test.ts'],
      },
      {
        title: 'La API recalcula',
        text: 'El caso de uso toma la tarifa del plan del cliente y el impuesto de su país, y recalcula con la misma función. El precio que cuenta es el de la API.',
        lit: ['api', 'dominio'],
        edges: ['api-dominio'],
        refs: ['RF-10', 'ADR-008'],
        tests: ['apps/api/src/modules/simulations/create-simulation.routes.test.ts'],
      },
      {
        title: 'Se guarda como instantánea',
        text: 'La simulación y su desglose por tramos, en una tabla hija. Si mañana cambia la tarifa, el historial no cambia.',
        lit: ['api', 'sqlite'],
        edges: ['api-sqlite'],
        label: 'INSERT × 2',
        refs: ['ADR-004', 'D-18'],
        tests: ['apps/api/src/modules/simulations/simulation-snapshot.test.ts'],
      },
      {
        title: 'Aparece arriba del historial',
        text: 'La simulación guardada entra la primera del historial del cliente, convertida a la divisa que tengas elegida.',
        lit: ROUND_TRIP,
        edges: RESPONSE,
        label: '201 Created',
        refs: ['AC-44', 'AC-78'],
        tests: ['e2e/specs/simulation-save.spec.ts'],
      },
    ],
  },
  {
    id: 'divisa',
    name: 'Cambiar divisa',
    summary: 'Los importes en libras, con la caché, la API externa y sus fallos.',
    steps: [
      {
        title: 'Eliges GBP en la cabecera',
        text: 'La divisa elegida se recuerda en el navegador. Los importes se siguen calculando en euros: solo cambia cómo se muestran.',
        lit: ['web', 'divisas'],
        edges: [],
        refs: ['RF-13', 'AC-79'],
        tests: ['e2e/specs/currency-conversion.spec.ts'],
      },
      {
        title: 'Primero, la caché',
        text: 'Si hay tipos de hace menos de una hora, se usan. Al leerlos se validan otra vez, porque el almacenamiento del navegador lo puede tocar cualquiera.',
        lit: ['divisas'],
        edges: [],
        refs: ['D-23', 'D-146'],
        tests: ['apps/web/src/app/core/currency/exchange-rates.cache.test.ts'],
      },
      {
        title: 'Si no, a la API de tipos',
        text: 'Una petición desde el navegador, con 5 s de límite y sin cookies ni referrer. La API nunca sale a Internet.',
        lit: ['divisas', 'tipos'],
        edges: ['divisas-tipos'],
        label: 'GET /v6/latest/EUR',
        refs: ['D-22', 'D-148', 'RNF-SEC-18'],
        tests: ['apps/web/src/app/core/currency/exchange-rates.store.test.ts'],
      },
      {
        title: 'La respuesta se valida',
        text: 'Un parser comprueba su forma y sus tipos antes de que nada llegue a la pantalla.',
        lit: ['divisas', 'tipos'],
        edges: ['<divisas-tipos'],
        refs: ['RNF-SEC-13'],
        tests: ['apps/web/src/app/core/currency/exchange-rates.parser.test.ts'],
      },
      {
        title: 'Conversión exacta, partida a partida',
        text: 'Cada tramo, la base y el impuesto se convierten por separado con aritmética entera, y el total es su suma: las cifras siempre cuadran.',
        lit: ['web', 'dominio'],
        edges: ['web-dominio'],
        refs: ['D-144'],
        tests: ['packages/domain/src/currency/convert-pricing.test.ts'],
      },
      {
        title: 'Y si falla, se ve',
        text: 'Error con «Reintentar». Con tipos de menos de 48 h, se usan marcados como desactualizados; si no, los importes vuelven a euros. Cada estado tiene su e2e.',
        lit: ['web', 'divisas'],
        edges: [],
        refs: ['D-51', 'AC-80', 'AC-82'],
        tests: ['e2e/specs/exchange-rates-cache.spec.ts'],
      },
    ],
  },
];
