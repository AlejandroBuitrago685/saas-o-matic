import { defineConfig } from '@playwright/test';

import { SHARED_CONFIG } from './playwright.shared.js';

/**
 * The evaluator walkthrough (`docs/recorrido`, D-183): a static page, so there is no server to start. The tests serve
 * the files of `docs/` from disk on a test origin (as GitHub Pages would) and also open the page from file://, as an
 * evaluator who clones the repository would. Run it after `npm run recorrido`, which copies the compiled domain
 * package the live simulator imports (D-184): `npm run e2e:recorrido` does both.
 */
export default defineConfig({
  ...SHARED_CONFIG,
  testDir: './recorrido',
  // With reduced motion the entrance animations last 1 ms: axe measures colours at rest (D-156) without waiting for
  // animations of folded content, which never run.
  projects: [{ name: 'recorrido', use: { baseURL: 'http://recorrido.test', reducedMotion: 'reduce' } }],
});
