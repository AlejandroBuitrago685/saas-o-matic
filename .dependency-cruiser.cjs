// @ts-check
/**
 * Dependency graph checks that ESLint cannot express well (03-arquitectura/09-calidad-y-automatizacion.md §1).
 * Package and layer boundaries are enforced by eslint-plugin-boundaries; this only forbids cycles.
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies make modules impossible to understand and test in isolation.',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: ['(^|/)dist/', '(^|/)\\.angular/', '(^|/)coverage/', '__lint_fixture__'] },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'types', 'default'],
    },
  },
};
