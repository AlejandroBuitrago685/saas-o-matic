import type { Page } from '@playwright/test';
import type { StatsResponse } from '@saas-o-matic/contract';

import { expectNoSeriousA11yViolations } from '../fixtures/a11y.js';
import { amount } from '../fixtures/amounts.js';
import { createCustomer } from '../fixtures/customers.js';
import { currencyHeader, expectReferenceRates, simulateRatesApi } from '../fixtures/exchange-rates-api.js';
import { expect, test } from '../fixtures/test.js';

const isStats = (url: URL): boolean => url.pathname === '/api/stats';
const AVERAGE = 'Importe medio simulado (sin impuestos)';

/** The figure of a metric, found by its label (a `<dt>`/`<dd>` pair). */
const metric = (page: Page, label: string) =>
  page
    .getByRole('region', { name: 'Métricas' })
    .locator('dl > div')
    .filter({ has: page.locator('dt', { hasText: label }) })
    .locator('dd');

const cards = (page: Page) => page.getByRole('list', { name: 'Clientes' }).getByRole('link');

/** «1234» or «12.345», as es-ES writes the counts (spec 05 §4.5). */
const count = (value: number) => new Intl.NumberFormat('es-ES').format(value);

test('AC-92: the three metrics are the ones GET /stats answers, the average in EUR', async ({
  page,
  request,
}) => {
  const customer = await createCustomer(request);
  const saved = await request.post('/api/simulations', {
    data: { customerId: customer.id, activeUsers: 15, storageGb: 0, apiCallsPerMonth: 0 },
  });
  expect(saved.status()).toBe(201);

  // Other tests write at the same time, so the figures are compared with the answer this very page received.
  const answer = page.waitForResponse((response) => isStats(new URL(response.url())));
  await page.goto('/');
  const stats = (await (await answer).json()) as StatsResponse;

  expect(stats.simulationsCount).toBeGreaterThan(0);
  await expect(metric(page, 'Clientes')).toHaveText(count(stats.customersCount));
  await expect(metric(page, 'Simulaciones')).toHaveText(count(stats.simulationsCount));
  const average = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2 }).format(
    (stats.averageBaseCents ?? 0) / 100,
  );
  await expect(metric(page, AVERAGE)).toHaveText(amount(average, 'EUR'));
  await expectNoSeriousA11yViolations(page, 'dashboard with metrics');
});

test('AC-92 / D-20: in USD the average is one converted leaf item, approximate, with the date of the rates', async ({
  page,
}) => {
  await page.route(isStats, (route) =>
    route.fulfill({
      json: { customersCount: 25, simulationsCount: 2, averageBaseCents: 12_400, currency: 'EUR' },
    }),
  );
  await simulateRatesApi(page);
  await page.goto('/');
  const header = currencyHeader(page);
  await expectReferenceRates(header);

  await header.select.selectOption('USD');

  // 124,00 € × 1,111287 = 137,7996 → 137,80 US$ (REFERENCE_RATES).
  await expect(metric(page, AVERAGE)).toHaveText(amount('137,80', 'USD'));
  await expect(page.getByTestId('metrics-note')).toHaveText('Orientativo en USD con tipos del 12/11/2026');
});

test('AC-92: if GET /stats fails, the metrics show «—» and the listing still works', async ({
  page,
  request,
}) => {
  await page.route(isStats, (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/problem+json',
      json: { type: 'about:blank', title: 'Error interno', status: 500, code: 'INTERNAL_ERROR' },
    }),
  );
  const customer = await createCustomer(request);

  await page.goto(`/?q=${customer.taxId}`);

  await expect(page.getByTestId('metrics-error')).toHaveText('No se han podido cargar las métricas.');
  await expect(metric(page, 'Clientes')).toHaveText('—');
  await expect(cards(page)).toHaveCount(1);
  await expect(page.getByRole('alert')).toHaveCount(0);
});
