// @ts-check
/**
 * The pieces a request goes through (D-183), from 03-arquitectura and 08-despliegue §4: what each one does, the
 * security control it applies (with its RNF-SEC id of 06-seguridad) and where it lives. `tools/recorrido.test.ts`
 * checks that every id is defined and every path exists.
 */

/**
 * @typedef {object} Piece
 * @property {string} id anchor of its panel
 * @property {string} name
 * @property {string} role one line under the name in the diagram
 * @property {string} does
 * @property {string} control the security control it applies
 * @property {string[]} controlIds RNF-SEC ids of that control
 * @property {string[]} files
 */

/** @type {readonly Piece[]} The path of a request, in order. */
export const REQUEST_PATH = [
  {
    id: 'pieza-navegador',
    name: 'Navegador',
    role: 'Angular 22',
    does: 'Pinta la interfaz con signals y calcula la proyección con el mismo dominio que la API, sin esperar a la red (ADR-008).',
    control:
      'CSP sin scripts ni estilos en línea, y ningún HTML insertado a mano: nada de innerHTML ni de bypassSecurityTrust*.',
    controlIds: ['RNF-SEC-06', 'RNF-SEC-14'],
    files: ['apps/web/src/app/app.config.ts', 'apps/web/src/app/features/simulator/simulator.store.ts'],
  },
  {
    id: 'pieza-cloudflare',
    name: 'Cloudflare',
    role: 'solo en la demo',
    does: 'Proxy y HTTPS delante del nginx del servidor de la demo pública. En local y con Docker Compose no existe.',
    control:
      'El nginx del servidor recupera la IP real de CF-Connecting-IP solo si la conexión viene de Cloudflare, así que el límite de escrituras cuenta por cliente.',
    controlIds: ['RNF-SEC-08', 'RNF-SEC-20'],
    files: ['deploy/demo/nginx/https.conf.template', 'deploy/demo/docker-compose.demo.yml'],
  },
  {
    id: 'pieza-nginx',
    name: 'nginx',
    role: 'web y proxy',
    does: 'Sirve la build de Angular y reenvía /api a la API: un único origen para la web y la API (ADR-012).',
    control:
      'Cabeceras de seguridad y CSP de la web, y contenedores sin root, de solo lectura y con el puerto solo en 127.0.0.1.',
    controlIds: ['RNF-SEC-06', 'RNF-SEC-16'],
    files: ['apps/web/nginx/nginx.conf', 'apps/web/nginx/security-headers.conf'],
  },
  {
    id: 'pieza-api',
    name: 'API Fastify',
    role: 'rutas y casos de uso',
    does: 'Rutas finas que llaman a casos de uso; un único manejador de errores responde en formato RFC 9457 (ADR-009).',
    control:
      'Límite de peticiones por IP, CORS con lista cerrada, errores sin detalles internos y logs sin datos personales.',
    controlIds: ['RNF-SEC-07', 'RNF-SEC-08', 'RNF-SEC-10', 'RNF-SEC-11'],
    files: ['apps/api/src/app.ts', 'apps/api/src/http/rate-limit.ts', 'apps/api/src/http/error-handler.ts'],
  },
  {
    id: 'pieza-contrato',
    name: 'Contrato Zod',
    role: 'esquemas compartidos',
    does: 'Los mismos esquemas validan las peticiones en la API, generan el OpenAPI y dan los tipos a la web (ADR-002).',
    control:
      'Esquemas estrictos: un campo desconocido o un importe enviado por el cliente se rechazan con un 400.',
    controlIds: ['RNF-SEC-01', 'RNF-SEC-03'],
    files: [
      'packages/contract/src/simulations.ts',
      'packages/contract/src/customers.ts',
      'apps/api/openapi.json',
    ],
  },
  {
    id: 'pieza-dominio',
    name: 'Dominio',
    role: 'reglas puras',
    does: 'Precios por tramos, impuestos, redondeo, divisas y validación fiscal: funciones puras sin dependencias, con el 100 % de cobertura (ADR-001).',
    control: 'El servidor calcula todos los importes con estas funciones; nunca acepta uno del cliente.',
    controlIds: ['RNF-SEC-03'],
    files: ['packages/domain/src/index.ts', 'packages/domain/src/pricing/calculate-pricing.ts'],
  },
  {
    id: 'pieza-sqlite',
    name: 'SQLite',
    role: 'Drizzle',
    does: 'Clientes y simulaciones; cada simulación guarda su desglose en una tabla hija, como instantánea (ADR-004).',
    control: 'Solo consultas parametrizadas, comodines de LIKE escapados e IDs UUID v7 no enumerables.',
    controlIds: ['RNF-SEC-02', 'RNF-SEC-04'],
    files: [
      'apps/api/src/db/schema/customers.ts',
      'apps/api/src/db/like-pattern.ts',
      'apps/api/src/shared/id-generator.ts',
    ],
  },
];

/** @type {Piece} The call that leaves the request path: the browser asks for the exchange rates itself. */
export const RATES_CALL = {
  id: 'pieza-divisas',
  name: 'open.er-api.com',
  role: 'tipos de cambio',
  does: 'El navegador pide los tipos de cambio, los guarda en caché y avisa si están desactualizados o si fallan (D-22, D-51).',
  control: 'La respuesta se valida antes de usarla y el backend no hace ninguna petición saliente.',
  controlIds: ['RNF-SEC-13', 'RNF-SEC-18'],
  files: [
    'apps/web/src/app/core/currency/exchange-rates.client.ts',
    'apps/web/src/app/core/currency/exchange-rates.parser.ts',
    'apps/web/src/app/core/currency/exchange-rates.cache.ts',
  ],
};
