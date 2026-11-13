import { defineConfig } from '@playwright/test';

import { SHARED_CONFIG } from './playwright.shared.js';

const WEB_URL = 'http://localhost:4200';

/**
 * Smoke test of a clean start (AC-95, D-53): after `npm ci` and `npm run setup`, the very command of the README,
 * `npm run dev`, is started by Playwright, which also stops its whole process tree at the end (on Windows too). The
 * CI runs it on Linux with Node 22, 24 and 26, and on Windows and macOS with the version of `.nvmrc`. It uses the
 * local database the README creates, so it never runs next to a `npm run dev` of your own (the ports are taken).
 */
export default defineConfig({
  ...SHARED_CONFIG,
  testDir: './smoke',
  projects: [{ name: 'smoke', use: { baseURL: WEB_URL } }],
  webServer: {
    command: 'npm run dev',
    cwd: '..',
    url: WEB_URL,
    reuseExistingServer: false,
    // The first `ng serve` of a clean clone compiles everything: on the Windows and macOS runners it is slow.
    timeout: 300_000,
  },
});
