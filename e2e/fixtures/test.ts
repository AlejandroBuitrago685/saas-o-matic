import { test as base, expect, type Page } from '@playwright/test';

import { EXCHANGE_RATE_URL, REFERENCE_RATES } from './exchange-rates.js';

/** What the automatic guards recorded during a test; a test that provokes one on purpose clears it. */
export interface Guards {
  readonly cspViolations: string[];
  readonly blockedRequests: string[];
}

const CSP_CONSOLE_MESSAGE = /Content Security Policy/i;

/**
 * AC-64, D-70: records every CSP violation of the page, across navigations. The `securitypolicyviolation` event is
 * reported to Node through an exposed function, and Chromium also logs each violation in the console.
 */
async function watchCsp(page: Page, violations: string[]): Promise<void> {
  await page.exposeFunction('__reportCspViolation', (text: string) => violations.push(text));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      window.__reportCspViolation?.(
        `${event.effectiveDirective} blocked ${event.blockedURI || 'inline'} in ${event.documentURI}`,
      );
    });
  });
  page.on('console', (message) => {
    if (CSP_CONSOLE_MESSAGE.test(message.text())) violations.push(message.text());
  });
}

/**
 * RT-05 (07-tests §1.3): the exchange-rate API always answers with the reference rates, and any other request to an
 * origin that is not the application is aborted and recorded, so a test never reaches the real network.
 */
async function guardNetwork(page: Page, baseUrl: string, blocked: string[]): Promise<void> {
  const appOrigin = new URL(baseUrl).origin;
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    // The real service allows any origin; without that header the browser would reject the answer.
    if (url === EXCHANGE_RATE_URL) {
      return route.fulfill({ json: REFERENCE_RATES, headers: { 'access-control-allow-origin': '*' } });
    }
    if (new URL(url).origin === appOrigin) return route.fallback();
    blocked.push(url);
    return route.abort('blockedbyclient');
  });
}

/** `test` with the guards of 07-tests §1.3 active in every test: a violation or a blocked request fails it. */
export const test = base.extend<{ guards: Guards }>({
  guards: [
    async ({ page, baseURL }, use) => {
      const guards: Guards = { cspViolations: [], blockedRequests: [] };
      await watchCsp(page, guards.cspViolations);
      await guardNetwork(page, baseURL ?? '', guards.blockedRequests);

      await use(guards);

      expect(guards.cspViolations, 'CSP violations (AC-64)').toEqual([]);
      expect(guards.blockedRequests, 'requests to external origins (RT-05)').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
