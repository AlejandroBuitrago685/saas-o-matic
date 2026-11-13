import { amount } from '../fixtures/amounts.js';
import { createCustomer } from '../fixtures/customers.js';
import {
  currencyHeader,
  firstVisit,
  RATES_UPDATED_AT as UPDATED_AT,
} from '../fixtures/exchange-rates-api.js';
import { expect, test } from '../fixtures/test.js';

// The cache of the rates (D-23), with the clock of the page: a first visit fills it as a user would, and the test
// moves the clock and reloads (D-149).

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

test('AC-82 / D-23 rates fetched 30 min ago: a reload makes no request', async ({ page }) => {
  const rates = await firstVisit(page, '/', UPDATED_AT + HOUR);

  await page.clock.setSystemTime(UPDATED_AT + HOUR + 30 * MINUTE);
  await page.reload();

  await expect(currencyHeader(page).status).toHaveText('Tipos del 12/11/2026');
  expect(rates.requests()).toBe(1);
});

test('AC-81 rates of 2 h are refreshed while still in use: the date plus «Actualizando…»', async ({
  page,
}) => {
  const rates = await firstVisit(page, '/', UPDATED_AT + HOUR);
  const header = currencyHeader(page);

  await page.clock.setSystemTime(UPDATED_AT + 3 * HOUR);
  const slow = rates.hold();
  await page.reload();

  await expect(header.status).toContainText('Tipos del 12/11/2026');
  await expect(header.status).toContainText('Actualizando…');
  slow.release();
  await expect(header.status).toHaveText('Tipos del 12/11/2026');
  expect(rates.requests()).toBe(2);
});

test('AC-82 / CL-60 rates of 2 h, updated 20 h ago, and a failed refresh: stale, «Reintentar», and USD with ≈', async ({
  page,
  request,
}) => {
  const customer = await createCustomer(request);
  const rates = await firstVisit(page, `/customers/${customer.id}`, UPDATED_AT + 18 * HOUR);
  const header = currencyHeader(page);

  rates.serve('server-error');
  await page.clock.setSystemTime(UPDATED_AT + 20 * HOUR);
  await page.reload();

  await expect(header.status).toHaveText('Tipos desactualizados del 12/11/2026');
  await expect(header.retry).toBeVisible();
  // Remembering the currency across a reload is a Could of P10: USD is chosen again after it.
  await header.select.selectOption('USD');
  await page.getByRole('textbox', { name: 'Usuarios activos' }).fill('15');
  await expect(page.getByTestId('projection-total')).toHaveText(amount('188,25', 'USD'));
});

test('AC-82 rates of 3 days and a failed refresh: the error of AC-80, and only EUR', async ({ page }) => {
  const rates = await firstVisit(page, '/', UPDATED_AT + HOUR);
  const header = currencyHeader(page);

  rates.serve('network-error');
  await page.clock.setSystemTime(UPDATED_AT + 3 * 24 * HOUR);
  await page.reload();

  await expect(header.status).toHaveText('No se han podido obtener los tipos de cambio');
  await expect(header.retry).toBeVisible();
  expect(await header.enabledCurrencies()).toEqual(['EUR']);
});
