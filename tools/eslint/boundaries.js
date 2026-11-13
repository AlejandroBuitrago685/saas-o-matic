// @ts-check
import boundaries from 'eslint-plugin-boundaries';

/**
 * Package and zone boundaries (03-arquitectura/09-calidad-y-automatizacion.md §3.3).
 * Patterns are folders matched from the repository root; the first matching descriptor wins,
 * so the catch-all `src` folders of each app go last. External modules are restricted per zone
 * with `no-restricted-imports` (see restrictions.js); boundaries only checks files of this repository.
 */
/**
 * @param {string} type
 * @param {string} pattern
 */
const element = (type, pattern) => ({ type, pattern, partialMatch: false });

const WEB_FEATURES = ['dashboard', 'customer-create', 'customer-detail', 'simulator'];

const elements = [
  element('domain', 'packages/domain'),
  element('contract', 'packages/contract'),
  element('api-module', 'apps/api/src/modules/*'),
  element('api-db', 'apps/api/src/db'),
  element('api-http', 'apps/api/src/http'),
  element('api-config', 'apps/api/src/config'),
  element('api-shared', 'apps/api/src/shared'),
  element('api-composition', 'apps/api/src'),
  ...WEB_FEATURES.map((name) => element(`web-feature-${name}`, `apps/web/src/app/features/${name}`)),
  element('web-core', 'apps/web/src/app/core'),
  element('web-shared', 'apps/web/src/app/shared'),
  element('web-root', 'apps/web/src'),
];

/**
 * @param {string} from
 * @param {string[]} to
 */
const allow = (from, to) => ({
  from: { element: { type: from } },
  allow: { to: { element: { types: to } } },
});

/** The plugin's published types do not match ESLint's `Plugin` type, although the runtime object does. */
const boundariesPlugin = /** @type {import('eslint').ESLint.Plugin} */ (/** @type {unknown} */ (boundaries));

const WEB_SHARED_DEPS = ['web-core', 'web-shared', 'domain', 'contract'];

const policies = [
  allow('domain', ['domain']),
  allow('contract', ['contract', 'domain']),
  allow('api-module', ['api-module', 'api-db', 'api-shared', 'contract', 'domain']),
  allow('api-db', ['api-db', 'api-shared', 'domain']),
  allow('api-http', ['api-http', 'api-shared', 'contract', 'domain']),
  allow('api-config', ['api-config', 'api-shared', 'domain']),
  // D-112: AppError uses the problem codes and FieldError of the contract.
  allow('api-shared', ['api-shared', 'contract', 'domain']),
  allow('api-composition', [
    'api-composition',
    'api-module',
    'api-db',
    'api-http',
    'api-config',
    'api-shared',
    'contract',
    'domain',
  ]),
  ...WEB_FEATURES.map((name) =>
    allow(`web-feature-${name}`, [
      `web-feature-${name}`,
      ...WEB_SHARED_DEPS,
      // The only cross-feature dependency allowed: the simulator lives inside the customer detail.
      ...(name === 'customer-detail' ? ['web-feature-simulator'] : []),
    ]),
  ),
  allow('web-core', ['web-core', 'web-shared', 'domain', 'contract']),
  allow('web-shared', ['web-shared', 'domain']),
  allow('web-root', ['web-root', ...WEB_FEATURES.map((name) => `web-feature-${name}`), ...WEB_SHARED_DEPS]),
];

/** @type {import('eslint').Linter.Config} */
export const boundariesConfig = {
  files: ['packages/*/src/**/*.ts', 'apps/*/src/**/*.ts'],
  ignores: ['**/*.test.ts'],
  plugins: { boundaries: boundariesPlugin },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        noWarnOnMultipleProjects: true,
        project: [
          'packages/domain/tsconfig.json',
          'packages/contract/tsconfig.json',
          'apps/api/tsconfig.json',
          'apps/web/tsconfig.app.json',
        ],
      },
    },
    'boundaries/elements': elements,
  },
  rules: {
    'boundaries/dependencies': ['error', { default: 'disallow', policies }],
  },
};
