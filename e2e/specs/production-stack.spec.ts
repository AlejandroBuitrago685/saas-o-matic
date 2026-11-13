import type { APIResponse } from '@playwright/test';

import { createCustomer } from '../fixtures/customers.js';
import { expect, test } from '../fixtures/test.js';

/** What only the Docker Compose stack serves: nginx, its headers and its CSP (D-68). */
const PROD_ONLY = { tag: '@prod-only' } as const;

/** `script-src 'self'` → { 'script-src': "'self'" }. */
function cspDirectives(response: APIResponse): Record<string, string> {
  const policy = response.headers()['content-security-policy'] ?? '';
  return Object.fromEntries(
    policy
      .split(';')
      .map((directive) => directive.trim().split(/\s+/))
      .filter((parts) => parts[0] !== '')
      .map(([name = '', ...sources]) => [name, sources.join(' ')]),
  );
}

/** RNF-SEC-06 for every response, and D-131: `Server` only says nginx, without a version. */
function expectCommonHeaders(response: APIResponse): void {
  const headers = response.headers();
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('no-referrer');
  expect(headers['server']).toBe('nginx');
  expect(headers['x-powered-by']).toBeUndefined();
}

test(
  'AC-52 D-131: the interface is served with the CSP and headers of RNF-SEC-06',
  PROD_ONLY,
  async ({ request }) => {
    const response = await request.get('/customers/new');

    expectCommonHeaders(response);
    expect(cspDirectives(response)).toEqual({
      'default-src': "'self'",
      'script-src': "'self'",
      'style-src': "'self'",
      'font-src': "'self'",
      'img-src': "'self' data:",
      'connect-src': "'self' https://open.er-api.com",
      'object-src': "'none'",
      'base-uri': "'self'",
      'form-action': "'self'",
      'frame-ancestors': "'none'",
    });
    expect(response.headers()['cache-control']).toBe('no-cache');
  },
);

test(
  'AC-52: API responses keep their own headers through nginx, all no-store but the catalog',
  PROD_ONLY,
  async ({ request }) => {
    const health = await request.get('/api/health');
    const unknownRoute = await request.get('/api/debug');
    const catalog = await request.get('/api/catalog');

    for (const response of [health, unknownRoute, catalog]) {
      expectCommonHeaders(response);
      expect(cspDirectives(response)).toEqual({ 'default-src': "'none'", 'frame-ancestors': "'none'" });
      expect(response.headers()['cross-origin-resource-policy']).toBe('same-site');
    }
    expect(health.headers()['cache-control']).toBe('no-store');
    expect(unknownRoute.headers()['cache-control']).toBe('no-store');
    expect(catalog.headers()['cache-control']).not.toContain('no-store');
  },
);

// Regression of the P6 review: a regex location of nginx would win over the plain /api/ prefix.
test(
  'AC-52: an /api/ path that looks like a hashed file still reaches the API',
  PROD_ONLY,
  async ({ request }) => {
    const response = await request.get('/api/main-ABCDEFGH.js');

    expect(response.status()).toBe(404);
    expect(response.headers()['content-type']).toContain('application/problem+json');
    expect(cspDirectives(response)).toEqual({ 'default-src': "'none'", 'frame-ancestors': "'none'" });
  },
);

test(
  'AC-64: the served index.html has no inline script, style or event handler',
  PROD_ONLY,
  async ({ request }) => {
    const html = await (await request.get('/')).text();

    expect(html).not.toMatch(/<style/i);
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/i);
    expect(html).not.toMatch(/\son[a-z]+\s*=/i);
    expect(html).toMatch(/<link rel="stylesheet" href="styles-[^"]+\.css">/);
  },
);

test(
  'AC-64: the stylesheet and the self-hosted font are applied under the CSP',
  PROD_ONLY,
  async ({ page }) => {
    await page.goto('/customers/new');
    const form = page.getByRole('form', { name: 'Datos del cliente' });

    // `flex flex-col` are Tailwind utilities: without the stylesheet the form would be a block.
    await expect(form).toHaveCSS('display', 'flex');
    await expect(form).toHaveCSS('flex-direction', 'column');
    const isMontserratLoaded = await page.evaluate(async () => {
      await document.fonts.ready;
      return [...document.fonts].some(
        (font) => font.family.includes('Montserrat') && font.status === 'loaded',
      );
    });
    expect(isMontserratLoaded).toBe(true);
  },
);

test(
  'AC-64: the dashboard, the create form, the detail with the simulator and the not-found views raise no violation',
  PROD_ONLY,
  async ({ page, request }) => {
    // Other tests create customers at the same time: this one is only sure that the list has at least one card.
    const customer = await createCustomer(request);
    await page.goto('/');
    await expect(page.getByRole('list', { name: 'Clientes' }).getByRole('link').first()).toBeVisible();

    await page.goto('/customers/new');
    await expect(page.getByRole('button', { name: 'Crear cliente' })).toBeVisible();

    await page.goto(`/customers/${customer.id}`);
    await page.getByRole('textbox', { name: 'Usuarios activos' }).fill('51');
    await expect(page.getByTestId('projection-total')).toContainText('514,25');

    await page.goto('/customers/abc');
    await expect(page.getByRole('heading', { name: 'Cliente no encontrado' })).toBeVisible();
    await page.goto('/no-such-page');
    await expect(page.getByRole('heading', { name: 'Página no encontrada' })).toBeVisible();
    // The automatic CSP guard fails this test at teardown if any view raised a violation.
  },
);

test('AC-97: the documented URL answers and GET /api/health is 200', PROD_ONLY, async ({ request }) => {
  const response = await request.get('/api/health');

  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: 'ok' });
});

test(
  'D-130: a fake X-Forwarded-For does not open a new bucket of the rate limit',
  PROD_ONLY,
  async ({ request }) => {
    const remainingWith = async (fakeIp: string): Promise<number> => {
      const response = await request.get('/api/catalog', { headers: { 'x-forwarded-for': fakeIp } });
      return Number(response.headers()['x-ratelimit-remaining']);
    };

    // If a fake address chose the bucket, every request below would start a full one and never see a decrease. Tests
    // running in parallel share the real bucket and only lower `second`. A reset of the one-minute window between
    // two requests would refill it, so a new pair of fake addresses is tried (regression of the P6 review).
    const fakePairs = [
      ['203.0.113.7', '198.51.100.20'],
      ['203.0.113.8', '198.51.100.21'],
      ['203.0.113.9', '198.51.100.22'],
    ] as const;
    let isSharedBucket = false;
    for (const [firstIp, secondIp] of fakePairs) {
      const first = await remainingWith(firstIp);
      const second = await remainingWith(secondIp);
      isSharedBucket = second < first;
      if (isSharedBucket) break;
    }

    expect(isSharedBucket, 'two fake X-Forwarded-For addresses got buckets of their own').toBe(true);
  },
);
