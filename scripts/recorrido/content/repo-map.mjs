// @ts-check
/**
 * The repository map of the walkthrough (D-183): the folders and files worth opening, not all of them. Each entry
 * says what it is for and when it pays to open it, and carries the interests it serves. `tools/recorrido.test.ts`
 * checks that every path exists.
 */

/** @typedef {'negocio' | 'seguridad' | 'tests' | 'ia'} Interest */
/**
 * @typedef {object} MapEntry
 * @property {string} path
 * @property {string} what what it is for
 * @property {string} when when it pays to open it
 * @property {Interest[]} interests
 */

/** @type {Readonly<Record<Interest, string>>} */
export const INTERESTS = {
  negocio: 'Negocio',
  seguridad: 'Seguridad',
  tests: 'Tests',
  ia: 'Proceso con IA',
};

/**
 * @typedef {object} MapGroup
 * @property {string} folder
 * @property {string} what
 * @property {MapEntry[]} entries
 */

/** @type {readonly MapGroup[]} */
export const REPO_MAP = [
  {
    folder: 'ai-workspace',
    what: 'El proceso: del enunciado a las decisiones',
    entries: [
      {
        path: 'ai-workspace/README.md',
        what: 'Mapa del proceso, cómo se trabajó con la IA y dónde intervino el responsable.',
        when: 'Lo primero, para entender el proceso.',
        interests: ['ia'],
      },
      {
        path: 'ai-workspace/01-analisis.md',
        what: 'Requisitos, ambigüedades y casos límite antes de decidir nada.',
        when: 'Para ver cómo se desmenuzó el enunciado.',
        interests: ['negocio', 'ia'],
      },
      {
        path: 'ai-workspace/02-especificacion/02-reglas-negocio.md',
        what: 'Tramos, impuestos, redondeo y divisas, con sus vectores de prueba.',
        when: 'Para comprobar una cifra del simulador.',
        interests: ['negocio', 'tests'],
      },
      {
        path: 'ai-workspace/02-especificacion/03-validacion-fiscal.md',
        what: 'El algoritmo de cada identificador fiscal, con su fuente oficial.',
        when: 'Si te interesa la validación fiscal.',
        interests: ['negocio'],
      },
      {
        path: 'ai-workspace/02-especificacion/06-seguridad.md',
        what: 'OWASP API Top 10, modelo de amenazas y por qué no hay login.',
        when: 'Para revisar la seguridad con método.',
        interests: ['seguridad'],
      },
      {
        path: 'ai-workspace/02-especificacion/07-criterios-aceptacion.md',
        what: 'Los criterios de aceptación, cada uno con su nivel de test.',
        when: 'Para ver qué significa «hecho».',
        interests: ['tests', 'negocio'],
      },
      {
        path: 'ai-workspace/03-arquitectura/adr',
        what: 'Las decisiones de arquitectura, una por fichero.',
        when: 'Para entender el porqué de la estructura.',
        interests: ['ia'],
      },
      {
        path: 'ai-workspace/decisiones.md',
        what: 'Cada decisión con la alternativa descartada, el motivo y quién la tomó.',
        when: 'Para saber quién decidió qué.',
        interests: ['ia'],
      },
      {
        path: 'ai-workspace/diario.md',
        what: 'Una entrada por parte: qué se hizo, qué falló y qué corrigió el revisor.',
        when: 'Para ver el proceso real, con sus errores.',
        interests: ['ia'],
      },
      {
        path: 'ai-workspace/prompts',
        what: 'Los prompts de cada sesión, literales y numerados.',
        when: 'Para ver qué se pidió exactamente.',
        interests: ['ia'],
      },
    ],
  },
  {
    folder: 'packages',
    what: 'El código compartido',
    entries: [
      {
        path: 'packages/domain/src/pricing/calculate-pricing.ts',
        what: 'Tramos acumulativos e impuesto: la misma función en la API y en la web.',
        when: 'Para ver la regla central.',
        interests: ['negocio'],
      },
      {
        path: 'packages/domain/src/tax-id',
        what: 'Un validador de identificador fiscal por país detrás de una interfaz común.',
        when: 'Para ver cómo se extiende a otro país.',
        interests: ['negocio'],
      },
      {
        path: 'packages/domain/src/currency/convert-pricing.ts',
        what: 'Conversión partida a partida, con aritmética entera.',
        when: 'Si te preguntas por qué los totales cuadran.',
        interests: ['negocio'],
      },
      {
        path: 'packages/contract/src',
        what: 'Esquemas Zod que validan la API y tipan la web.',
        when: 'Para ver el contrato de la API.',
        interests: ['seguridad'],
      },
    ],
  },
  {
    folder: 'apps',
    what: 'La API y la web',
    entries: [
      {
        path: 'apps/api/src/modules',
        what: 'Un módulo por recurso: rutas, casos de uso y repositorios.',
        when: 'Para seguir una petición en la API.',
        interests: ['negocio'],
      },
      {
        path: 'apps/api/src/http',
        what: 'Lo transversal: errores RFC 9457, límite de peticiones, CORS, cabeceras y logs.',
        when: 'Para revisar los controles de seguridad.',
        interests: ['seguridad'],
      },
      {
        path: 'apps/api/src/config/catalog.data.ts',
        what: 'Tarifas e impuestos por país, validados al arrancar.',
        when: 'Para cambiar un precio o un tipo.',
        interests: ['negocio'],
      },
      {
        path: 'apps/web/src/app/features',
        what: 'Las pantallas: dashboard, alta, detalle y simulador.',
        when: 'Para ver la interfaz con signals.',
        interests: ['negocio'],
      },
      {
        path: 'apps/web/src/styles/tokens.css',
        what: 'Los colores y medidas de la interfaz, con su contraste probado.',
        when: 'Si te interesa el diseño o la accesibilidad.',
        interests: ['tests'],
      },
      {
        path: 'apps/web/nginx',
        what: 'El nginx de producción: CSP, cabeceras y proxy a la API.',
        when: 'Para ver la CSP real.',
        interests: ['seguridad'],
      },
    ],
  },
  {
    folder: 'Tests y calidad',
    what: 'Lo que comprueba que todo lo anterior es cierto',
    entries: [
      {
        path: 'e2e/specs',
        what: 'Los e2e de Playwright contra la pila de Docker, con la CSP real.',
        when: 'Para ver un flujo completo probado.',
        interests: ['tests'],
      },
      {
        path: 'e2e/specs/xss.spec.ts',
        what: 'Un nombre de empresa con HTML malicioso se muestra como texto y no ejecuta nada.',
        when: 'Para ver la defensa frente a XSS.',
        interests: ['seguridad', 'tests'],
      },
      {
        path: 'tools',
        what: 'Tests de las propias herramientas: reglas de lint, hooks, scripts y documentación.',
        when: 'Para ver que los controles también se prueban.',
        interests: ['tests', 'ia'],
      },
      {
        path: 'scripts/trace-tests.mjs',
        what: 'Exige que cada criterio y cada vector los cite algún test.',
        when: 'Para ver cómo se hace cumplir la trazabilidad.',
        interests: ['tests'],
      },
      {
        path: '.github/workflows/ci.yml',
        what: 'El pipeline: calidad en tres versiones de Node, auditoría, e2e, humo y demo.',
        when: 'Para ver qué bloquea un merge.',
        interests: ['tests', 'seguridad'],
      },
      {
        path: 'eslint.config.js',
        what: 'Límites de tamaño, fronteras entre capas y reglas de seguridad.',
        when: 'Para ver las reglas que la IA no podía saltarse.',
        interests: ['ia', 'seguridad'],
      },
    ],
  },
  {
    folder: 'Trabajo con la IA',
    what: 'Las reglas que seguía Claude y cómo se hacían cumplir',
    entries: [
      {
        path: 'CLAUDE.md',
        what: 'Las reglas de trabajo, de código y de seguridad que leía cada sesión.',
        when: 'Para ver qué se le exigía a la IA.',
        interests: ['ia'],
      },
      {
        path: '.claude/agents/revisor.md',
        what: 'El subagente revisor: solo lee y devuelve hallazgos P0 a P3.',
        when: 'Para ver cómo se revisaba cada parte.',
        interests: ['ia', 'tests'],
      },
      {
        path: '.claude/settings.json',
        what: 'Permisos y hooks: qué pedía confirmación y qué se comprobaba en cada edición.',
        when: 'Para ver los guardarraíles.',
        interests: ['ia', 'seguridad'],
      },
      {
        path: 'scripts/claude-hooks',
        what: 'Bloquean acciones prohibidas, pasan el lint del fichero editado y no dejan terminar en rojo.',
        when: 'Para ver cómo se paraba a la IA.',
        interests: ['ia'],
      },
    ],
  },
];
