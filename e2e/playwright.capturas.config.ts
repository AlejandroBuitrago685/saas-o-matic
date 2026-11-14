import { defineConfig } from '@playwright/test';

import { SHARED_CONFIG } from './playwright.shared.js';

const API_PORT = '3100';
const WEB_URL = 'http://localhost:4300';
const REPO_ROOT = '..';

/**
 * The screenshots of the README (`npm run capturas`, D-180): the same servers as `e2e:dev` (D-137), but the API is
 * started in `DEMO_MODE` so its in-memory database holds the 25 fictitious customers of the sample data, whatever
 * the contents of the local database. Same ports as `e2e:dev`, so the two never run together; nothing here writes
 * in the database of `npm run dev`.
 */
export default defineConfig({
  ...SHARED_CONFIG,
  testDir: './capturas',
  // One worker: the three pictures share the same servers and write the same folder.
  workers: 1,
  projects: [{ name: 'capturas', use: { baseURL: WEB_URL } }],
  webServer: [
    {
      name: 'api',
      command: 'npm run start:e2e -w @saas-o-matic/api',
      cwd: REPO_ROOT,
      url: `http://127.0.0.1:${API_PORT}/health`,
      env: {
        NODE_ENV: 'test',
        DEMO_MODE: 'true',
        DATABASE_PATH: ':memory:',
        HOST: '127.0.0.1',
        PORT: API_PORT,
        CORS_ORIGINS: WEB_URL,
        RATE_LIMIT_PER_MINUTE: '5000',
        RATE_LIMIT_WRITES_PER_MINUTE: '5',
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
