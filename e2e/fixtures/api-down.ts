import type { Page } from '@playwright/test';

/** The web of the e2e stack whose API is down (docker-compose.e2e.yml, D-155): only for `@prod-only` tests. */
export const API_DOWN_WEB_URL = 'http://127.0.0.1:8081';

const API_REQUESTS = '**/api/**';

/**
 * AC-85 in both targets: every request to the API fails as if nothing listened, as the browser sees an API that is
 * down. Registered after the network guard of `fixtures/test.ts`, so it runs first. Returns the function that brings
 * the API back.
 */
export async function takeApiDown(page: Page): Promise<() => Promise<void>> {
  await page.route(API_REQUESTS, (route) => route.abort('connectionrefused'));
  return () => page.unroute(API_REQUESTS);
}
