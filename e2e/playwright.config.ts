import { defineConfig, devices } from '@playwright/test';

/**
 * e2e of the web app (03-arquitectura/07-tests §1.3, D-68), in Chromium, as two projects:
 * - `stack` (`npm run e2e`, the one of the CI): the Docker Compose stack started by `npm run e2e:stack`, with the real
 *   nginx, CSP and headers;
 * - `dev` (`npm run e2e:dev`): the dev servers of `npm run dev`. The tests tagged `@prod-only` check what only the
 *   stack serves, so they are skipped.
 * No retries: a test that only passes on a second attempt is a failure to investigate, and its trace is kept.
 */
const isCi = process.env['CI'] !== undefined;

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: 0,
  reporter: isCi ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    ...devices['Desktop Chrome'],
    locale: 'es-ES',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'stack', use: { baseURL: 'http://127.0.0.1:8080' } },
    { name: 'dev', use: { baseURL: 'http://localhost:4200' }, grepInvert: /@prod-only/ },
  ],
});
