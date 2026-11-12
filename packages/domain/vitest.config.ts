import { configDefaults, defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'domain',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    // The `.slow.test.ts` suffix decides: those sweeps belong to vitest.slow.config.ts (D-101), never the Stop hook.
    exclude: [...configDefaults.exclude, '**/*.slow.test.ts'],
  },
});
