// @ts-check
/**
 * The path of a sales rep through the application, step by step (D-183): what each step shows, where the rule that
 * drives it lives and which tests cover it. The numbers of each rule are computed by the domain (`sources/examples`);
 * `tools/recorrido.test.ts` checks that every path exists.
 */

/** @typedef {'search' | 'tax-id' | 'tax-rate' | 'tiers' | 'tax' | 'currency' | 'save'} RuleKind */
/**
 * @typedef {object} FlowStep
 * @property {string} id anchor of the step
 * @property {string} title
 * @property {import('../render/icons.mjs').IconName} icon its symbol in the strip of steps
 * @property {string} lead one line: what the rep does
 * @property {{ closeUp: string, full: string, alt: string }} capture pictures of `docs/capturas`: a close-up of what
 *   matters, shown in the step, and the full screenshot it links to (both taken by e2e/capturas/recorrido.spec.ts)
 * @property {RuleKind} rule
 * @property {string[]} criteria acceptance criteria and test vectors the step shows
 * @property {string[]} files where it is implemented
 * @property {string[]} tests where it is tested
 */

/** @type {readonly FlowStep[]} */
export const FLOW_STEPS = [
  {
    id: 'paso-dashboard',
    icon: 'search',
    title: 'Dashboard',
    lead: 'Busca un cliente por nombre o identificador fiscal, sin acentos ni mayúsculas.',
    capture: {
      closeUp: 'recorte-buscador.webp',
      full: 'dashboard.webp',
      alt: 'El buscador con «nandu» y la única tarjeta que encuentra: Telefonía Ñandú S.A.',
    },
    rule: 'search',
    criteria: ['AC-29', 'AC-30', 'AC-70', 'AC-92'],
    files: [
      'apps/web/src/app/features/dashboard/customer-search.store.ts',
      'apps/api/src/modules/customers/search-customers.use-case.ts',
      'packages/domain/src/text/normalize-for-search.ts',
    ],
    tests: ['apps/api/src/modules/customers/search-customers.routes.test.ts', 'e2e/specs/dashboard.spec.ts'],
  },
  {
    id: 'paso-alta',
    icon: 'idcard',
    title: 'Alta con validación fiscal',
    lead: 'Da de alta un cliente: el identificador se valida con el algoritmo oficial de su país.',
    capture: {
      closeUp: 'recorte-alta.webp',
      full: 'alta-cliente.webp',
      alt: 'El campo del DNI con 12345678A y el error: el carácter de control no es correcto',
    },
    rule: 'tax-id',
    criteria: ['AC-10', 'AC-25', 'AC-26', 'TV-ES-04'],
    files: [
      'packages/domain/src/tax-id/validate-tax-id.ts',
      'packages/domain/src/tax-id/registry.ts',
      'apps/api/src/modules/customers/create-customer.use-case.ts',
      'apps/web/src/app/features/customer-create/customer-form.ts',
    ],
    tests: [
      'packages/domain/src/tax-id/validate-tax-id.test.ts',
      'apps/api/src/modules/customers/create-customer.rules.test.ts',
      'e2e/specs/customer-create.spec.ts',
    ],
  },
  {
    id: 'paso-detalle',
    icon: 'user',
    title: 'Detalle del cliente',
    lead: 'Abre la ficha: datos del cliente, su país y su plan, y el simulador debajo.',
    capture: {
      closeUp: 'recorte-cliente.webp',
      full: 'detalle.webp',
      alt: 'La tarjeta de datos de Acme Ibérica S.L.: identificador, país, email, plan y fecha de alta',
    },
    rule: 'tax-rate',
    criteria: ['AC-27', 'AC-75'],
    files: [
      'apps/web/src/app/features/customer-detail/customer-detail.page.ts',
      'apps/api/src/modules/customers/get-customer.use-case.ts',
      'apps/api/src/config/catalog.data.ts',
    ],
    tests: [
      'apps/api/src/modules/customers/get-customer.routes.test.ts',
      'e2e/specs/customer-detail.spec.ts',
    ],
  },
  {
    id: 'paso-tramos',
    icon: 'sliders',
    title: 'Simulador por tramos',
    lead: 'Mueve el slider: la proyección se recalcula en el navegador con el mismo dominio que la API.',
    capture: {
      closeUp: 'recorte-tramos.webp',
      full: 'tramos.webp',
      alt: 'La proyección de 100 usuarios: tres tramos, base de 670 €, impuesto y total de 810,70 €',
    },
    rule: 'tiers',
    criteria: ['AC-01', 'AC-02', 'AC-03', 'AC-76', 'TV-PR-07'],
    files: [
      'packages/domain/src/pricing/calculate-pricing.ts',
      'packages/domain/src/slider/slider-scale.ts',
      'apps/web/src/app/features/simulator/simulator.store.ts',
    ],
    tests: [
      'packages/domain/src/pricing/calculate-pricing.test.ts',
      'packages/domain/src/slider/slider-scale.test.ts',
      'e2e/specs/simulator.spec.ts',
    ],
  },
  {
    id: 'paso-impuestos',
    icon: 'percent',
    title: 'Impuestos',
    lead: 'El impuesto del país se aplica una sola vez, sobre la base entera, con un único redondeo.',
    capture: {
      closeUp: 'recorte-tramos.webp',
      full: 'tramos.webp',
      alt: 'Las líneas de base, impuesto del 21 % y total de la proyección de 100 usuarios',
    },
    rule: 'tax',
    criteria: ['AC-04', 'AC-05', 'TV-TX-01', 'TV-RD-01'],
    files: ['packages/domain/src/tax/calculate-tax.ts', 'packages/domain/src/money'],
    tests: ['packages/domain/src/tax/calculate-tax.test.ts'],
  },
  {
    id: 'paso-divisa',
    icon: 'currency',
    title: 'Divisa',
    lead: 'Cambia la divisa de la cabecera: cada partida se convierte por separado y se suma después.',
    capture: {
      closeUp: 'recorte-divisa.webp',
      full: 'simulador.webp',
      alt: 'La proyección de 60 usuarios convertida a libras, partida a partida',
    },
    rule: 'currency',
    criteria: ['AC-79', 'AC-80', 'AC-88'],
    files: [
      'packages/domain/src/currency/convert-pricing.ts',
      'apps/web/src/app/core/currency/exchange-rates.store.ts',
      'apps/web/src/app/core/currency/exchange-rates.parser.ts',
    ],
    tests: [
      'packages/domain/src/currency/convert-pricing.test.ts',
      'e2e/specs/currency-conversion.spec.ts',
      'e2e/specs/exchange-rates.spec.ts',
    ],
  },
  {
    id: 'paso-guardar',
    icon: 'save',
    title: 'Guardar e historial',
    lead: 'Guarda la simulación: la API recalcula los importes y la añade arriba del historial.',
    capture: {
      closeUp: 'recorte-historial.webp',
      full: 'historial.webp',
      alt: 'Una simulación guardada en el historial, con sus usuarios, base, impuesto y total',
    },
    rule: 'save',
    criteria: ['AC-40', 'AC-42', 'AC-44', 'AC-46'],
    files: [
      'apps/api/src/modules/simulations/create-simulation.use-case.ts',
      'apps/api/src/db/schema/simulation-tiers.ts',
      'apps/web/src/app/features/customer-detail/simulation-history.ts',
    ],
    tests: [
      'apps/api/src/modules/simulations/create-simulation.routes.test.ts',
      'apps/api/src/modules/simulations/simulation-snapshot.test.ts',
      'e2e/specs/simulation-save.spec.ts',
    ],
  },
];
