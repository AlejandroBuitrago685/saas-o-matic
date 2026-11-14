import { execFileSync } from 'node:child_process';

import type { APIRequestContext } from '@playwright/test';
import type { CustomerPage, Problem } from '@saas-o-matic/contract';

import { expectNoSeriousA11yViolations } from '../fixtures/a11y.js';
import { createCustomer } from '../fixtures/customers.js';
import { expectNoHorizontalScroll, NARROW_VIEWPORT } from '../fixtures/layout.js';
import { expect, test } from '../fixtures/test.js';

/**
 * AC-61 against the stack of the public demo (docker-compose.yml plus deploy/demo/docker-compose.demo.yml, D-171),
 * which the CI job `demo` starts with the very images it publishes (D-170). Each test is a client of its own: it
 * sends the X-Forwarded-For the host nginx sends in the demo (D-105), since the gateway is a trusted proxy there
 * (D-130). They run in order, because the last one restarts the API.
 * What only the public URL can show (HTTPS, HSTS, Cloudflare, the timer) is checked by hand after deploying (AC-61, R).
 */
test.describe.configure({ mode: 'serial' });

const API_CONTAINER = 'saas-o-matic-demo-api-1';
const SAMPLE_CUSTOMERS = 25;
const DEMO_WRITES_PER_MINUTE = 5;
const NOTICE =
  'Entorno de demostración: los datos son ficticios y se borran periódicamente. No introduzcas datos reales.';

/** The X-Forwarded-For of a client in the documentation range 203.0.113.0/24 (RFC 5737). */
const asClient = (host: number): Record<string, string> => ({
  'x-forwarded-for': `203.0.113.${String(host)}`,
});

async function customerPage(request: APIRequestContext): Promise<CustomerPage> {
  const response = await request.get('/api/customers?limit=1');
  expect(response.status()).toBe(200);
  return (await response.json()) as CustomerPage;
}

test.describe('a visitor', () => {
  test.use({ extraHTTPHeaders: asClient(11) });

  test('AC-61 D-168 the demo notice is on every view: the dashboard, a customer and a page that does not exist', async ({
    page,
    request,
  }) => {
    const notice = page.getByRole('complementary', { name: 'Aviso de demostración' });
    const [sample] = (await customerPage(request)).items;
    if (sample === undefined) throw new Error('the demo has no sample customers');

    for (const url of ['/', `/customers/${sample.id}`, '/no-existe']) {
      await page.goto(url);
      await expect(notice, url).toHaveText(NOTICE);
    }
  });

  test('AC-61 only the sample data: the 25 customers of the profile demo', async ({ request }) => {
    expect((await customerPage(request)).page.total).toBe(SAMPLE_CUSTOMERS);
  });
});

test.describe('a visitor on a phone', () => {
  test.use({ extraHTTPHeaders: asClient(12), viewport: NARROW_VIEWPORT });

  test('AC-61 AC-86 D-168 the notice fits 360 px and passes axe', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('complementary', { name: 'Aviso de demostración' })).toBeVisible();

    await expectNoHorizontalScroll(page);
    await expectNoSeriousA11yViolations(page, 'dashboard of the demo at 360 px');
  });
});

test('AC-61 RNF-SEC-20 five writes per minute and IP: the sixth is a 429, and another client keeps its own', async ({
  request,
}) => {
  const [sample] = (await customerPage(request)).items;
  if (sample === undefined) throw new Error('the demo has no sample customers');
  const write = (host: number) =>
    request.post('/api/simulations', {
      headers: asClient(host),
      data: { customerId: sample.id, activeUsers: 15, storageGb: 0, apiCallsPerMonth: 0 },
    });

  for (let count = 1; count <= DEMO_WRITES_PER_MINUTE; count += 1) {
    expect((await write(13)).status(), `write ${String(count)}`).toBe(201);
  }
  const limited = await write(13);
  const other = await write(14);

  expect(limited.status()).toBe(429);
  expect((await limited.json()) as Problem).toMatchObject({ code: 'RATE_LIMITED', status: 429 });
  expect(Number(limited.headers()['retry-after'])).toBeGreaterThanOrEqual(1);
  expect(other.status()).toBe(201);
});

test('D-105 D-130 two clients behind the host nginx have buckets of their own (the check of P11)', async ({
  request,
}) => {
  const remaining = async (host: number): Promise<number> => {
    const response = await request.get('/api/catalog', { headers: asClient(host) });
    return Number(response.headers()['x-ratelimit-remaining']);
  };

  const first = await remaining(15);
  const second = await remaining(15);
  const otherClient = await remaining(16);

  expect(second).toBe(first - 1);
  expect(otherClient).toBe(first);
});

test.describe('a visitor who writes', () => {
  test.use({ extraHTTPHeaders: asClient(17) });

  test('AC-61 D-47 a restart of the API, daily or on deploy, brings back the sample data only', async ({
    request,
  }) => {
    const visitor = await createCustomer(request, { companyName: 'Visitante de la demo SL' });
    expect((await customerPage(request)).page.total).toBe(SAMPLE_CUSTOMERS + 1);

    // What the systemd timer of deploy/demo runs every day (D-171). The tmpfs of /data starts empty again (D-174). If
    // Docker fails, its own message is the error of the test.
    execFileSync('docker', ['restart', API_CONTAINER], { encoding: 'utf8' });
    await expect.poll(async () => (await request.get('/api/health')).status(), { timeout: 30_000 }).toBe(200);

    expect((await request.get(`/api/customers/${visitor.id}`)).status()).toBe(404);
    expect((await customerPage(request)).page.total).toBe(SAMPLE_CUSTOMERS);
  });
});
