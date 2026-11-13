import type { APIResponse } from '@playwright/test';
import type { CatalogResponse, GatewayProblem } from '@saas-o-matic/contract';

import { API_DOWN_WEB_URL } from '../fixtures/api-down.js';
import { fillCustomerForm } from '../fixtures/customer-form.js';
import { newCustomer } from '../fixtures/customers.js';
import { expect, test } from '../fixtures/test.js';

/** AC-85, D-152, D-155: the web of the e2e stack whose API is down, so nginx answers for it. */
const PROD_ONLY = { tag: '@prod-only' } as const;
const STACK_URL = 'http://127.0.0.1:8080';

test.use({ baseURL: API_DOWN_WEB_URL });

/** The answer of nginx for a 502 (apps/web/nginx/nginx.conf). */
const UNREACHABLE: GatewayProblem = {
  type: '/problems/service-unavailable',
  title: 'Service unavailable',
  status: 502,
  detail: 'The API is not responding. Try again in a few minutes.',
  code: 'SERVICE_UNAVAILABLE',
};

/** Every value of a header, however many times it was sent. */
function valuesOf(response: APIResponse, name: string): string[] {
  return response
    .headersArray()
    .filter((header) => header.name.toLowerCase() === name)
    .map((header) => header.value);
}

function expectUnreachable(response: APIResponse): void {
  expect(response.status()).toBe(502);
  expect(response.headers()['content-type']).toBe('application/problem+json');
  // One CSP, the one of the API: security-headers.conf of the SPA is not included.
  expect(valuesOf(response, 'content-security-policy')).toEqual([
    "default-src 'none';frame-ancestors 'none'",
  ]);
  expect(valuesOf(response, 'cache-control')).toEqual(['no-store']);
  expect(response.headers()).toMatchObject({
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'cross-origin-resource-policy': 'same-site',
    'x-frame-options': 'DENY',
    server: 'nginx',
  });
}

test(
  'AC-85 D-152: nginx answers with its own Problem and only the headers of the API',
  PROD_ONLY,
  async ({ request }) => {
    const search = await request.get('/api/customers?q=Acme');
    const create = await request.post('/api/customers', { data: newCustomer() });

    for (const response of [search, create]) {
      expectUnreachable(response);
      expect(await response.json()).toEqual(UNREACHABLE);
    }
  },
);

test(
  'AC-85: through that nginx, the dashboard shows its error with «Reintentar»',
  PROD_ONLY,
  async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('alert')).toContainText('No se ha podido cargar el listado.');
    await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  },
);

// P9 review: «each view» of AC-85 also through nginx, not only with the request cut in the browser.
test(
  'AC-85: through that nginx, the create form and the detail show their error with «Reintentar»',
  PROD_ONLY,
  async ({ page }) => {
    await page.goto('/customers/new');
    await expect(page.getByRole('alert')).toContainText('No se ha podido cargar el catálogo.');
    await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();

    await page.goto('/customers/019a7b2c-0000-7000-8000-000000000001');
    await expect(page.getByRole('alert')).toContainText('No se ha podido cargar el cliente.');
    await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  },
);

test(
  'AC-85 D-152: sending the form says that the server cannot be reached',
  PROD_ONLY,
  async ({ page, playwright }) => {
    // The catalog was loaded before the API went down: it is taken from the stack that has an API.
    const stack = await playwright.request.newContext({ baseURL: STACK_URL });
    const catalog = (await (await stack.get('/api/catalog')).json()) as CatalogResponse;
    await stack.dispose();
    await page.route('**/api/catalog', (route) => route.fulfill({ json: catalog }));
    const customer = newCustomer();
    await page.goto('/customers/new');
    await fillCustomerForm(page, customer);

    await page.getByRole('button', { name: 'Crear cliente' }).click();

    await expect(page.getByRole('alert')).toContainText(
      'No se puede conectar con el servidor. Inténtalo de nuevo en unos minutos.',
    );
    await expect(page.getByLabel('Nombre de empresa')).toHaveValue(customer.companyName);
  },
);
