import { readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { expect, type Page } from '@playwright/test';

/** The folder GitHub Pages publishes (D-183): the walkthrough and the screenshots it shows. */
const DOCS_DIR = resolve(import.meta.dirname, '../../docs');
const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

/** The walkthrough as it is published: over http, where the module of the live simulator loads. */
export const PUBLISHED_PATH = '/recorrido/';
/** The walkthrough as an evaluator opens it from a clone, where module scripts do not load (D-184). */
export const LOCAL_URL = pathToFileURL(join(DOCS_DIR, 'recorrido', 'index.html')).href;

/** Serves the files of `docs/` from disk on the test origin, like a static host. */
export async function serveDocs(page: Page, origin: string): Promise<void> {
  await page.route(`${origin}/**`, async (route) => {
    const path = decodeURIComponent(new URL(route.request().url()).pathname);
    const file = join(DOCS_DIR, path.endsWith('/') ? `${path}index.html` : path);
    const body = file.startsWith(DOCS_DIR) ? readIfExists(file) : undefined;
    await (body === undefined
      ? route.fulfill({ status: 404 })
      : route.fulfill({ body, contentType: CONTENT_TYPES[extname(file)] ?? 'application/octet-stream' }));
  });
}

function readIfExists(file: string): Buffer | undefined {
  try {
    return readFileSync(file);
  } catch {
    // A missing file is a 404, as a static host answers; `watchErrors` reports it.
    return undefined;
  }
}

/** Records the errors of the console, the uncaught exceptions and the failed requests of the page. */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${String(response.status())} ${response.url()}`);
  });
  return errors;
}

/** Opens every disclosure of the page, so the checks see the content that is folded. */
export async function openAllDetails(page: Page): Promise<void> {
  await page.evaluate(() => {
    for (const details of document.querySelectorAll('details')) details.open = true;
  });
  await expect(page.locator('details:not([open])')).toHaveCount(0);
}
