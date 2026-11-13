import { defineConfig } from '@playwright/test';

import { SHARED_CONFIG } from './playwright.shared.js';

const API_PORT = '3100';
const WEB_URL = 'http://localhost:4300';
const REPO_ROOT = '..';

/**
 * e2e against the dev servers (`npm run e2e:dev`, D-137), started by Playwright with their own ports, so they run
 * next to `npm run dev` (:3000 and :4200) and never write in its database:
 * - the API in :3100 with SQLite **in memory**: every run starts empty and leaves no file behind. The limits are the
 *   high ones of the e2e stack (D-133), because every test reaches the API from the same address;
 * - `ng serve` in :4300, whose proxy sends `/api` to :3100 (`apps/web/proxy.e2e.conf.json`).
 * Playwright sets the variables itself, so nothing depends on the shell (Windows included). The tests tagged
 * `@prod-only` check what only the stack serves (nginx, its headers and its CSP), so they are skipped here.
 */
export default defineConfig({
  ...SHARED_CONFIG,
  projects: [{ name: 'dev', use: { baseURL: WEB_URL }, grepInvert: /@prod-only/ }],
  webServer: [
    {
      name: 'api',
      command: 'npm run start:e2e -w @saas-o-matic/api',
      cwd: REPO_ROOT,
      url: `http://127.0.0.1:${API_PORT}/health`,
      env: {
        NODE_ENV: 'test',
        DATABASE_PATH: ':memory:',
        HOST: '127.0.0.1',
        PORT: API_PORT,
        CORS_ORIGINS: WEB_URL,
        RATE_LIMIT_PER_MINUTE: '5000',
        RATE_LIMIT_WRITES_PER_MINUTE: '1000',
        LOG_LEVEL: 'warn',
      },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      name: 'web',
      command: 'npm run dev -w @saas-o-matic/web -- --port 4300 --proxy-config proxy.e2e.conf.json',
      cwd: REPO_ROOT,
      url: WEB_URL,
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
