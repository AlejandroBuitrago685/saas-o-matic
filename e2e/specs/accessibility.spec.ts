import type { APIRequestContext, Page } from '@playwright/test';

import { expectNoSeriousA11yViolations } from '../fixtures/a11y.js';
import { answerListing, isListing, pageOf } from '../fixtures/customer-pages.js';
import { fillCustomerForm } from '../fixtures/customer-form.js';
import { createCustomer, newCustomer } from '../fixtures/customers.js';
import { currencyHeader, simulateRatesApi } from '../fixtures/exchange-rates-api.js';
import { NARROW_VIEWPORT } from '../fixtures/layout.js';
import { openSimulator } from '../fixtures/simulator.js';
import { expect, test } from '../fixtures/test.js';

/** AC-86, D-156: every view and state, audited at a desktop width and at 360 px (AC-84). */
const VIEWPORTS = [
  ['1280 px', { width: 1280, height: 800 }],
  ['360 px', NARROW_VIEWPORT],
] as const;

const SERVER_ERROR = {
  status: 500,
  contentType: 'application/problem+json',
  json: { type: '/problems/internal-error', title: 'Internal error', status: 500, code: 'INTERNAL_ERROR' },
};

const cards = (page: Page) => page.getByRole('list', { name: 'Clientes' }).getByRole('link');
const createButton = (page: Page) => page.getByRole('button', { name: 'Crear cliente' });

async function auditDashboard(page: Page, request: APIRequestContext): Promise<void> {
  await createCustomer(request);
  await page.goto('/');
  await expect(cards(page).first()).toBeVisible();
  await expectNoSeriousA11yViolations(page, 'dashboard with customers');

  await answerListing(page, () => pageOf([]));
  await page.goto('/');
  await expect(page.getByText('Todavía no hay clientes')).toBeVisible();
  await expectNoSeriousA11yViolations(page, 'empty dashboard');

  await page.unroute(isListing);
  await page.route(isListing, (route) => route.fulfill(SERVER_ERROR));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  await expectNoSeriousA11yViolations(page, 'failing dashboard');
}

async function auditCreateForm(page: Page, request: APIRequestContext): Promise<void> {
  await page.goto('/customers/new');
  await expect(createButton(page)).toBeVisible();
  await expectNoSeriousA11yViolations(page, 'empty form');

  await createButton(page).click();
  await expect(page.locator('#customer-tax-id-error')).toBeVisible();
  await expectNoSeriousA11yViolations(page, 'form with schema errors');

  const existing = await createCustomer(request);
  await page.reload();
  await fillCustomerForm(page, newCustomer({ taxId: existing.taxId }));
  await createButton(page).click();
  await expect(page.getByRole('link', { name: 'Ver cliente' })).toBeVisible();
  await expectNoSeriousA11yViolations(page, 'form with a duplicate');
}

async function auditDetail(page: Page, request: APIRequestContext): Promise<void> {
  const simulator = await openSimulator(page, request);
  await simulator.usersField.fill('51');
  await simulator.saveButton.click();
  const history = page.getByRole('list', { name: 'Simulaciones guardadas' });
  await expect(history.getByRole('listitem')).toHaveCount(1);
  await expectNoSeriousA11yViolations(page, 'detail with a saved simulation');

  await page.route('**/api/simulations', (route) => route.fulfill(SERVER_ERROR));
  await simulator.saveButton.click();
  await expect(page.getByText(/No se ha podido guardar la simulación/)).toBeVisible();
  await expectNoSeriousA11yViolations(page, 'detail with a failed save');
}

async function auditNotFoundAndRatesError(page: Page): Promise<void> {
  await simulateRatesApi(page, 'server-error');
  await page.goto('/customers/abc');
  await expect(page.getByRole('heading', { name: 'Cliente no encontrado' })).toBeVisible();
  await expect(currencyHeader(page).status).toHaveText('No se han podido obtener los tipos de cambio');
  await expectNoSeriousA11yViolations(page, 'customer not found, with the rates failing');

  await page.goto('/no-such-page');
  await expect(page.getByRole('heading', { name: 'Página no encontrada' })).toBeVisible();
  await expectNoSeriousA11yViolations(page, 'page not found');
}

for (const [width, viewport] of VIEWPORTS) {
  test.describe(`AC-86 axe at ${width}`, () => {
    test.use({ viewport });

    test(`AC-86: the dashboard with customers, empty and failing (${width})`, async ({ page, request }) => {
      await auditDashboard(page, request);
    });

    test(`AC-86: the create form empty, with errors and with a duplicate (${width})`, async ({
      page,
      request,
    }) => {
      await auditCreateForm(page, request);
    });

    test(`AC-86: the detail with the simulator and the history, and a failed save (${width})`, async ({
      page,
      request,
    }) => {
      await auditDetail(page, request);
    });

    test(`AC-86: the not-found views and the exchange-rate error (${width})`, async ({ page }) => {
      await auditNotFoundAndRatesError(page);
    });
  });
}
