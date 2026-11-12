import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'tools',
    include: ['**/*.test.ts'],
    globalSetup: ['./clean-fixtures.setup.ts'],
    // Type-aware lint tests start a TypeScript program; give them room on slow CI runners.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
