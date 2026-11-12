import { defineConfig } from 'vitest/config';

// Node-side test projects. The Angular app runs its own tests through `ng test` (Vitest runner).
export default defineConfig({
  test: {
    projects: ['packages/domain', 'packages/contract', 'apps/api', 'tools'],
    coverage: {
      provider: 'v8',
      include: ['packages/domain/src/**/*.ts'],
      exclude: ['**/*.test.ts', 'packages/domain/src/index.ts'],
      // The shared domain must stay fully covered (ADR-001, 03-arquitectura/07-tests.md §1.1).
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
    },
  },
});
