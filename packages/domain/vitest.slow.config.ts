import { defineProject } from 'vitest/config';

/**
 * Slow exhaustive sweeps of the domain (D-101): the full homoglyph sweep of AC-14 takes about 3.7 s. They run in CI and
 * in `npm run verify` (a plain `vitest run`), but not in `npm test` (pre-push) nor in the Stop hook, which select
 * their projects explicitly.
 */
export default defineProject({
  test: {
    name: 'domain-slow',
    include: ['**/*.slow.test.ts'],
    testTimeout: 60_000,
  },
});
