import { defineConfig } from '@playwright/test';

import { SHARED_CONFIG } from './playwright.shared.js';

/**
 * e2e of the public demo (`npm run e2e:demo`, AC-61): the stack of docker-compose.yml plus
 * deploy/demo/docker-compose.demo.yml on 127.0.0.1:4010, which the CI job `demo` starts with the images it publishes
 * (D-170, 07-tests). One worker: the tests share the stack, and the last one restarts the API.
 */
export default defineConfig({
  ...SHARED_CONFIG,
  testDir: './demo',
  workers: 1,
  projects: [{ name: 'demo', use: { baseURL: 'http://127.0.0.1:4010' } }],
});
