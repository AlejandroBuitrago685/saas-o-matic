// @ts-check
/**
 * Size and complexity limits (03-arquitectura/09-calidad-y-automatizacion.md §3.2, D-66).
 * An exception needs `// eslint-disable-next-line <rule> -- <reason>`.
 */

/** Limits for JavaScript files (configuration and scripts). */
/** @type {import('eslint').Linter.RulesRecord} */
export const jsLimits = {
  'max-lines': ['error', { max: 250, skipBlankLines: true, skipComments: true }],
  'max-lines-per-function': ['error', { max: 40, skipBlankLines: true, skipComments: true, IIFEs: true }],
  complexity: ['error', { max: 8 }],
  'max-depth': ['error', { max: 3 }],
  'max-params': ['error', { max: 3 }],
  'max-nested-callbacks': ['error', { max: 3 }],
};

/** Same limits for TypeScript, with the type-aware version of max-params (ignores `this`). */
/** @type {import('eslint').Linter.RulesRecord} */
export const codeLimits = {
  ...jsLimits,
  'max-params': 'off',
  '@typescript-eslint/max-params': ['error', { max: 3 }],
};

/** Tests group many cases in one `describe` callback, so only file size and nesting are limited. */
/** @type {import('eslint').Linter.RulesRecord} */
export const testLimits = {
  'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
  'max-lines-per-function': 'off',
  'max-nested-callbacks': ['error', { max: 4 }],
};
