// @ts-check
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import js from '@eslint/js';
import angular from 'angular-eslint';
import prettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import { boundariesConfig } from './tools/eslint/boundaries.js';
import { codeLimits, jsLimits, testLimits } from './tools/eslint/limits.js';
import { restrictionConfigs } from './tools/eslint/restrictions.js';

/** Rules on top of typescript-eslint strict/stylistic (CLAUDE.md "Código"). */
const typescriptRules = {
  '@typescript-eslint/explicit-module-boundary-types': 'error',
  '@typescript-eslint/consistent-type-imports': 'error',
  '@typescript-eslint/switch-exhaustiveness-check': 'error',
  '@typescript-eslint/prefer-readonly': 'error',
  eqeqeq: 'error',
  'no-console': 'error',
};

export default defineConfig(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.angular/**',
      'apps/api/drizzle/**',
      'docs/recorrido/domain/**',
    ],
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
    rules: jsLimits,
  },
  {
    // The evaluator walkthrough runs in the browser (D-183): its page script is classic, so it also loads from
    // file://; the tier simulator is a module that imports the compiled domain (D-184).
    files: ['docs/recorrido/*.js'],
    ignores: ['docs/recorrido/simulador.js'],
    languageOptions: { globals: globals.browser, sourceType: 'script' },
  },
  {
    files: ['docs/recorrido/simulador.js'],
    languageOptions: { globals: globals.browser, sourceType: 'module' },
  },
  {
    files: ['**/*.ts'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ['vitest.config.ts'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: { ...codeLimits, ...typescriptRules },
  },
  { files: ['**/*.test.ts'], rules: testLimits },
  comments.recommended,
  {
    rules: {
      '@eslint-community/eslint-comments/require-description': ['error', { ignore: [] }],
      '@eslint-community/eslint-comments/no-unused-disable': 'error',
    },
  },
  ...restrictionConfigs,
  boundariesConfig,
  {
    files: ['apps/web/src/**/*.ts'],
    extends: [angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      // A presentational component is a decorated class with no members (the header, the footer): that is how
      // Angular declares it, not an extraneous class. Undecorated empty classes are still an error.
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
    },
  },
  {
    files: ['apps/web/src/**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {
      '@angular-eslint/template/cyclomatic-complexity': ['error', { maxComplexity: 6 }],
      // Static style="" and [ngStyle] are banned (Tailwind only, ADR-011); [style.x] bindings go through
      // the CSSOM, which the CSP allows, for values that classes cannot express (a slider fill).
      '@angular-eslint/template/no-inline-styles': ['error', { allowNgStyle: false, allowBindToStyle: true }],
    },
  },
  prettier,
);
