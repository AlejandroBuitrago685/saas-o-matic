// @ts-check
/**
 * Per-zone restrictions on external modules, globals and syntax
 * (CLAUDE.md "Reglas de dependencia", 03-arquitectura/09-calidad-y-automatizacion.md §3).
 * ESLint replaces (does not merge) a rule's options when two blocks match the same file,
 * so each block below covers a disjoint set of files.
 */
const TESTS = ['**/*.test.ts'];

/** @typedef {{ regex: string, message: string }} ImportPattern */

/**
 * @param {ImportPattern[]} patterns
 * @returns {import('eslint').Linter.RuleEntry}
 */
const restrictImports = (patterns) => ['error', { patterns }];

/**
 * @param {string} regex
 * @param {string} message
 * @returns {ImportPattern}
 */
const only = (regex, message) => ({ regex, message });

const DRIZZLE = {
  regex: '^(drizzle-orm|better-sqlite3)(/|$)',
  message: 'Drizzle/SQLite solo en db/ y *.repository.ts.',
};
const FASTIFY = {
  regex: '^(fastify|@fastify/)',
  message: 'Fastify solo en *.routes.ts, http/, app.ts y main.ts.',
};
const NO_REPOSITORY = {
  regex: '\\.repository(\\.js)?$',
  message: 'Usa el puerto del módulo, no el repositorio (capas).',
};
const DB = {
  regex: '^\\.{1,2}/(.*/)?db(/|$)',
  message: 'La base de datos solo desde *.repository.ts y la raíz de composición (capas).',
};
/**
 * From inside a module: `../<other module>/<anything but index>`, or the same through `modules/` with any number of
 * `../` (`../../modules/<other>/<file>`). `../../shared/x.js` matches neither (`..` has dots, and it has no
 * `modules/`). Not covered: dynamic `import()` and `require`, and a module with subfolders (none has them).
 */
const MODULE_INTERNALS = {
  regex: '^(\\.\\./[^/.]+/|(\\.\\./)+modules/[^/]+/)(?!index(\\.js)?$)',
  message: 'Un módulo solo usa otro por su index.ts (D-119).',
};
/** From the composition root: `./modules/<module>/<anything but index>`. */
const ROOT_MODULE_INTERNALS = {
  regex: '^\\./modules/[^/]+/(?!index(\\.js)?$)',
  message: 'La raíz de composición solo usa un módulo por su index.ts (D-119).',
};
const PACKAGE_INTERNALS = {
  regex: '^\\.{1,2}/(.*/)?packages/',
  message: 'Los paquetes se importan por su nombre (@saas-o-matic/…) y su index.ts, nunca por ruta.',
};
const ZOD_SUBPATH = { regex: '^zod/', message: 'Zod no se empaqueta en la web (ADR-002).' };

/**
 * Restrictions of an API zone; every zone also forbids reaching into packages/ by path.
 * @param {ImportPattern[]} patterns
 */
const api = (patterns) => restrictImports([...patterns, PACKAGE_INTERNALS]);

const PURE = 'El dominio es puro: sin I/O ni APIs del entorno (ADR-001).';
const ENV_GLOBALS = [
  'process',
  'console',
  'window',
  'document',
  'fetch',
  'setTimeout',
  'setInterval',
  'Buffer',
];
const ENV_STORAGE = ['localStorage', 'sessionStorage', 'navigator', 'crypto', 'performance'];
const PROCESS_ENV = {
  object: 'process',
  property: 'env',
  message: 'process.env solo en apps/api/src/config/.',
};

const COMPONENT_STYLES =
  "Decorator[expression.callee.name='Component'] Property[key.name=/^(styles|styleUrl|styleUrls)$/]";

/** @type {import('eslint').Linter.Config[]} */
export const restrictionConfigs = [
  { rules: { 'no-restricted-imports': 'off' } },
  {
    files: ['apps/*/src/**/*.ts', 'packages/*/src/**/*.ts'],
    ignores: ['apps/api/src/config/**'],
    rules: { 'no-restricted-properties': ['error', PROCESS_ENV] },
  },
  {
    files: ['packages/domain/src/**/*.ts'],
    ignores: TESTS,
    rules: {
      '@typescript-eslint/no-restricted-imports': restrictImports([only('^(?!\\.{1,2}/)', PURE)]),
      'no-restricted-globals': [
        'error',
        ...[...ENV_GLOBALS, ...ENV_STORAGE].map((name) => ({ name, message: PURE })),
      ],
      'no-restricted-properties': [
        'error',
        PROCESS_ENV,
        { object: 'Date', property: 'now', message: `${PURE} Recibe la fecha por parámetro.` },
        { object: 'Math', property: 'random', message: `${PURE} Recibe el valor por parámetro.` },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: "NewExpression[callee.name='Date'][arguments.length=0]", message: PURE },
      ],
    },
  },
  {
    files: ['packages/contract/src/**/*.ts'],
    ignores: TESTS,
    rules: {
      '@typescript-eslint/no-restricted-imports': restrictImports([
        only('^(?!\\.{1,2}/|zod$|@saas-o-matic/domain$)', 'contract solo depende de zod y del dominio.'),
      ]),
    },
  },
  {
    files: ['apps/web/src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'zod', message: 'Zod no se empaqueta en la web (ADR-002).' },
            {
              name: '@saas-o-matic/contract',
              allowTypeImports: true,
              message: 'Desde la web, solo import type.',
            },
          ],
          patterns: [ZOD_SUBPATH, PACKAGE_INTERNALS],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'MemberExpression[property.name=/^bypassSecurityTrust/]',
          message: 'Prohibido (RNF-SEC-14).',
        },
        {
          selector: 'MemberExpression[property.name=/^(innerHTML|outerHTML)$/]',
          message: 'Prohibido (RNF-SEC-14).',
        },
        { selector: COMPONENT_STYLES, message: 'Sin estilos de componente: solo Tailwind (CSP, ADR-011).' },
      ],
    },
  },
  {
    files: ['apps/api/src/**/*.routes.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': api([DRIZZLE, NO_REPOSITORY, DB, MODULE_INTERNALS]),
    },
  },
  {
    files: ['apps/api/src/http/**/*.ts'],
    rules: { '@typescript-eslint/no-restricted-imports': api([DRIZZLE, DB]) },
  },
  {
    // The composition root: every file at the top of src/ (app.ts, main.ts).
    files: ['apps/api/src/*.ts'],
    ignores: TESTS,
    rules: { '@typescript-eslint/no-restricted-imports': api([DRIZZLE, ROOT_MODULE_INTERNALS]) },
  },
  {
    files: ['apps/api/src/db/**/*.ts'],
    rules: { '@typescript-eslint/no-restricted-imports': api([FASTIFY]) },
  },
  {
    files: ['apps/api/src/**/*.repository.ts'],
    rules: { '@typescript-eslint/no-restricted-imports': api([FASTIFY, MODULE_INTERNALS]) },
  },
  {
    files: ['apps/api/src/**/*.use-case.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': api([
        DRIZZLE,
        FASTIFY,
        NO_REPOSITORY,
        DB,
        MODULE_INTERNALS,
      ]),
    },
  },
  {
    // The rest of a module (mappers, types, index.ts).
    files: ['apps/api/src/modules/**/*.ts'],
    ignores: [
      ...TESTS,
      'apps/api/src/**/*.routes.ts',
      'apps/api/src/**/*.repository.ts',
      'apps/api/src/**/*.use-case.ts',
    ],
    rules: { '@typescript-eslint/no-restricted-imports': api([DRIZZLE, FASTIFY, DB, MODULE_INTERNALS]) },
  },
  {
    // Shared code and configuration: no database, no framework. That they use no module is `boundaries`' job.
    files: ['apps/api/src/shared/**/*.ts', 'apps/api/src/config/**/*.ts'],
    ignores: TESTS,
    rules: { '@typescript-eslint/no-restricted-imports': api([DRIZZLE, FASTIFY, DB]) },
  },
];
