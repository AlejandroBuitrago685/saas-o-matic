// @ts-check
/**
 * The system map of the walkthrough (D-183, D-192): where each piece runs, what it does, why it is so, the control it
 * applies, where its code is and what tests it. `tools/recorrido.test.ts` checks that every reference is defined,
 * every path exists and every line joins two pieces of the map.
 */

/**
 * @typedef {'code' | 'external' | 'demo' | 'shared' | 'infra' | 'guard'} ZoneKind
 * @typedef {import('../render/icons.mjs').IconName} IconName
 */

/**
 * @typedef {object} Piece
 * @property {string} id
 * @property {string} name
 * @property {string} caption one line under the name on the map
 * @property {IconName} icon
 * @property {string} does
 * @property {string} [control] the security control it applies
 * @property {string[]} refs criteria, decisions, ADR and requirements that explain it
 * @property {string[]} files
 * @property {string[]} tests
 */

/**
 * @typedef {object} Zone
 * @property {string} id
 * @property {string} label
 * @property {ZoneKind} kind
 * @property {Piece[]} pieces
 */

/** @type {readonly Zone[]} In the order a narrow screen stacks them. */
export const ZONES = [
  {
    id: 'internet',
    label: 'Internet',
    kind: 'external',
    pieces: [
      {
        id: 'tipos',
        name: 'open.er-api.com',
        caption: 'tipos de cambio',
        icon: 'globe',
        does: 'La API pública de tipos de cambio que pide el enunciado. Solo la llama el navegador.',
        control:
          'La respuesta se valida antes de usarla; la petición va sin cookies ni referrer y con 5 s de límite.',
        refs: ['D-22', 'D-148', 'RNF-SEC-13'],
        files: ['apps/web/src/app/core/currency/exchange-rates.client.ts'],
        tests: [
          'apps/web/src/app/core/currency/exchange-rates.parser.test.ts',
          'e2e/specs/exchange-rates.spec.ts',
        ],
      },
    ],
  },
  {
    id: 'navegador',
    label: 'Navegador',
    kind: 'code',
    pieces: [
      {
        id: 'web',
        name: 'Web Angular',
        caption: 'pantallas con signals',
        icon: 'browser',
        does: 'El dashboard, el alta, el detalle y el simulador, con signals y sin Zone.js. Cada pantalla importa solo lo común, nunca otra pantalla.',
        control: 'CSP sin scripts ni estilos en línea, y prohibidos innerHTML y bypassSecurityTrust*.',
        refs: ['ADR-011', 'ADR-008', 'RNF-SEC-14'],
        files: ['apps/web/src/app/features', 'apps/web/src/app/core'],
        tests: ['e2e/specs/simulator.spec.ts', 'e2e/specs/xss.spec.ts'],
      },
      {
        id: 'divisas',
        name: 'Divisas',
        caption: 'tipos, caché y estados',
        icon: 'currency',
        does: 'Pide los tipos, los guarda una hora, los vuelve a validar al leerlos y enseña siempre su estado: cargando, al día, desactualizados o error con «Reintentar».',
        control:
          'Lo que se lee del almacenamiento del navegador pasa por el mismo parser que la respuesta de red.',
        refs: ['D-23', 'D-51', 'D-146'],
        files: ['apps/web/src/app/core/currency'],
        tests: [
          'apps/web/src/app/core/currency/exchange-rates.cache.test.ts',
          'e2e/specs/exchange-rates-cache.spec.ts',
        ],
      },
    ],
  },
  {
    id: 'solo-demo',
    label: 'Solo en la demo',
    kind: 'demo',
    pieces: [
      {
        id: 'cloudflare',
        name: 'Cloudflare',
        caption: 'HTTPS delante',
        icon: 'cloud',
        does: 'HTTPS y proxy delante de la demo pública. En local y con Docker Compose no existe.',
        control: 'El límite de escrituras cuenta por cliente, no por el proxy.',
        refs: ['D-47', 'RNF-SEC-08'],
        files: ['deploy/demo/docker-compose.demo.yml'],
        tests: ['apps/api/src/http/rate-limit.test.ts'],
      },
    ],
  },
  {
    id: 'compartido',
    label: 'Paquetes compartidos: el mismo código en los dos lados',
    kind: 'shared',
    pieces: [
      {
        id: 'contrato',
        name: 'Contrato Zod',
        caption: 'packages/contract',
        icon: 'contract',
        does: 'Los esquemas de cada petición y respuesta. La API valida con ellos y genera el OpenAPI; la web toma sus tipos con import type, sin cargar Zod.',
        control:
          'Esquemas estrictos: un campo desconocido o un importe enviado por el cliente se rechazan con un 400.',
        refs: ['ADR-002', 'RNF-SEC-01', 'RNF-SEC-03'],
        files: ['packages/contract/src', 'apps/api/openapi.json'],
        tests: ['packages/contract/src/simulations.test.ts'],
      },
      {
        id: 'dominio',
        name: 'Dominio',
        caption: 'reglas puras · packages/domain',
        icon: 'cube',
        does: 'Tramos, impuestos, redondeo, divisas y validación fiscal en funciones puras: sin npm, sin Node, sin DOM y sin reloj. La misma función calcula en el navegador y en la API, con el 100 % de cobertura.',
        control:
          'Los importes que se guardan los calcula siempre la API con estas funciones; nunca acepta uno del cliente.',
        refs: ['ADR-001', 'ADR-008', 'RNF-SEC-03'],
        files: ['packages/domain/src/pricing/calculate-pricing.ts', 'packages/domain/src/tax-id'],
        tests: [
          'packages/domain/src/pricing/calculate-pricing.test.ts',
          'packages/domain/src/tax-id/validate-tax-id.test.ts',
        ],
      },
    ],
  },
  {
    id: 'docker',
    label: 'Docker Compose',
    kind: 'infra',
    pieces: [
      {
        id: 'nginx',
        name: 'nginx',
        caption: 'web, CSP y proxy /api',
        icon: 'layers',
        does: 'Sirve la web compilada y reenvía /api a la API: un único origen, así que no hace falta abrir CORS.',
        control: 'Cabeceras de seguridad y CSP; contenedores sin privilegios y de solo lectura.',
        refs: ['ADR-012', 'RNF-SEC-06', 'RNF-SEC-16'],
        files: ['apps/web/nginx/nginx.conf', 'apps/web/nginx/security-headers.conf'],
        tests: ['e2e/specs/production-stack.spec.ts'],
      },
      {
        id: 'api',
        name: 'API Fastify',
        caption: 'rutas → casos de uso → repositorios',
        icon: 'bolt',
        does: 'Rutas finas que llaman a casos de uso, que hablan con puertos que implementan los repositorios. Ninguna regla de negocio en las rutas y un único manejador de errores.',
        control:
          'Límite de peticiones, CORS cerrado, errores en RFC 9457 sin detalles internos y logs sin datos personales.',
        refs: ['ADR-009', 'ADR-010', 'RNF-SEC-07', 'RNF-SEC-10'],
        files: ['apps/api/src/modules', 'apps/api/src/http'],
        tests: [
          'apps/api/src/modules/customers/create-customer.routes.test.ts',
          'apps/api/src/http/security.test.ts',
        ],
      },
      {
        id: 'sqlite',
        name: 'SQLite',
        caption: 'Drizzle · 3 tablas',
        icon: 'database',
        does: 'Clientes, simulaciones y el desglose de cada simulación por tramos, guardado como instantánea. Importes en céntimos enteros.',
        control: 'Solo SQL parametrizado, comodines de LIKE escapados e IDs UUID v7.',
        refs: ['ADR-003', 'ADR-004', 'RNF-SEC-02'],
        files: ['apps/api/src/db/schema'],
        tests: [
          'apps/api/src/modules/simulations/simulations.repository.test.ts',
          'apps/api/src/db/like-pattern.test.ts',
        ],
      },
    ],
  },
  {
    id: 'guardarrailes',
    label: 'Guardarraíles: lo que mantuvo el código así mientras lo escribía la IA',
    kind: 'guard',
    pieces: [
      {
        id: 'claude-md',
        name: 'CLAUDE.md',
        caption: 'las reglas',
        icon: 'file',
        does: 'Las reglas que leía cada sesión: trabajar por fases, no inventar reglas de negocio, tamaños máximos, fronteras entre capas, seguridad y qué significa «hecho».',
        refs: ['D-02'],
        files: ['CLAUDE.md'],
        tests: [],
      },
      {
        id: 'hooks',
        name: 'Hooks',
        caption: 'en cada edición',
        icon: 'hook',
        does: 'Bloquean acciones prohibidas antes de ejecutarlas, pasan el lint al fichero recién editado y no dejan cerrar un turno con el lint o los tipos en rojo.',
        refs: ['ADR-013'],
        files: ['.claude/settings.json', 'scripts/claude-hooks'],
        tests: ['tools/claude-hooks.test.ts'],
      },
      {
        id: 'eslint',
        name: 'ESLint',
        caption: 'tamaño y fronteras',
        icon: 'ruler',
        does: '250 líneas por fichero, 40 por función, complejidad 8 y fronteras entre capas: el dominio no importa nada y la web no carga Zod.',
        refs: ['ADR-013'],
        files: ['eslint.config.js'],
        tests: ['tools/eslint-zones.test.ts', 'tools/eslint-rules.test.ts'],
      },
      {
        id: 'revisor',
        name: 'Revisor',
        caption: 'al cerrar cada parte',
        icon: 'search',
        does: 'Un subagente de solo lectura revisa el diff de cada parte contra la especificación y la seguridad. Su primera revisión fue un NO APTO.',
        refs: ['D-72'],
        files: ['.claude/agents/revisor.md', 'ai-workspace/diario.md'],
        tests: [],
      },
      {
        id: 'ci',
        name: 'CI',
        caption: '11 checks para main',
        icon: 'branch',
        does: 'Para integrar en main: Node 22, 24 y 26 en Linux, la prueba de humo también en Windows y macOS, auditoría de dependencias, e2e y trazabilidad de cada criterio.',
        refs: ['D-88'],
        files: ['.github/workflows/ci.yml'],
        tests: ['tools/trace-tests.test.ts'],
      },
    ],
  },
];

/** @typedef {{ id: string, from: string, to: string, kind: 'http' | 'import' }} Edge */

/** @type {readonly Edge[]} The lines of the map: an HTTP call, or one piece importing the code of another. */
export const EDGES = [
  { id: 'web-cloudflare', from: 'web', to: 'cloudflare', kind: 'http' },
  { id: 'cloudflare-nginx', from: 'cloudflare', to: 'nginx', kind: 'http' },
  { id: 'nginx-api', from: 'nginx', to: 'api', kind: 'http' },
  { id: 'api-sqlite', from: 'api', to: 'sqlite', kind: 'http' },
  { id: 'divisas-tipos', from: 'divisas', to: 'tipos', kind: 'http' },
  { id: 'web-dominio', from: 'web', to: 'dominio', kind: 'import' },
  { id: 'web-contrato', from: 'web', to: 'contrato', kind: 'import' },
  { id: 'api-dominio', from: 'api', to: 'dominio', kind: 'import' },
  { id: 'api-contrato', from: 'api', to: 'contrato', kind: 'import' },
];

/** @type {readonly Piece[]} */
export const PIECES = ZONES.flatMap((zone) => zone.pieces);
