import { defineConfig } from '@playwright/test';

import { SHARED_CONFIG } from './playwright.shared.js';

/**
 * e2e against the Docker Compose stack (`npm run e2e`, the target of the CI): the real nginx, CSP and headers, started
 * by `npm run e2e:stack` with an empty database (D-133). `npm run e2e:dev` uses `playwright.dev.config.ts` instead.
 */
export default defineConfig({
  ...SHARED_CONFIG,
  projects: [{ name: 'stack', use: { baseURL: 'http://127.0.0.1:8080' } }],
});
