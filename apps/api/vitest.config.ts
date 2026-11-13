import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'api',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    // AC-59, D-154: no test of the API reaches the network outside the machine.
    setupFiles: ['test/setup/no-outbound-network.ts'],
  },
});
