import { euros } from '../fixtures/amounts.js';
import { createCustomer } from '../fixtures/customers.js';
import {
  currencyHeader,
  expectReferenceRates,
  type RatesBehaviour,
  simulateRatesApi,
} from '../fixtures/exchange-rates-api.js';
import { openSimulator } from '../fixtures/simulator.js';
import { expect, test } from '../fixtures/test.js';

const FAILURES: readonly (readonly [string, RatesBehaviour])[] = [
  ['a network error', 'network-error'],
  ['a 500', 'server-error'],
  ['a 429', 'rate-limited'],
  ['a 200 with "result": "error" (CL-29)', 'result-error'],
  ['a 200 with base_code "USD"', 'wrong-base'],
];

for (const [failure, behaviour] of FAILURES) {
  test(`AC-80 with ${failure} and EUR selected: the error without doing anything, only EUR, and «Reintentar» recovers`, async ({
    page,
    request,
  }) => {
    const rates = await simulateRatesApi(page, behaviour);
    const header = currencyHeader(page);
    const simulator = await openSimulator(page, request);

    await expect(header.status).toHaveText('No se han podido obtener los tipos de cambio');
    await expect(header.retry).toBeVisible();
    expect(await header.enabledCurrencies()).toEqual(['EUR']);
    await simulator.usersField.fill('15');
    await expect(simulator.total).toHaveText(euros('169,40'));

    rates.serve('reference');
    const slow = rates.hold();
    await header.retry.click();
    await expect(header.status).toHaveText('Cargando tipos de cambio…');
    slow.release();
    await expectReferenceRates(header);
    await expect(header.retry).toBeHidden();
  });
}

test('AC-80 / CL-31 a 200 without GBP shows the date of the rates and disables only GBP', async ({
  page,
}) => {
  await simulateRatesApi(page, 'without-gbp');
  const header = currencyHeader(page);
  await page.goto('/');

  await expect(header.status).toHaveText('Tipos del 12/11/2026');
  expect(await header.enabledCurrencies()).toEqual(['EUR', 'USD', 'CHF', 'JPY', 'MXN']);
});

test('AC-81 / CL-32 a slow provider: «Cargando…» from the first moment, and the slider works in EUR meanwhile', async ({
  page,
  request,
}) => {
  const rates = await simulateRatesApi(page);
  const slow = rates.hold();
  const header = currencyHeader(page);
  const simulator = await openSimulator(page, request);

  await expect(header.status).toHaveText('Cargando tipos de cambio…');
  await expect(header.status.locator('app-spinner')).toBeVisible();
  expect(await header.enabledCurrencies()).toEqual(['EUR']);
  await simulator.slider.focus();
  await page.keyboard.press('ArrowRight');
  await expect(simulator.total).toHaveText(euros('24,20'));

  slow.release();
  await expectReferenceRates(header);
});

test('D-51 the indicator stays visible while the page scrolls', async ({ page, request }) => {
  const header = currencyHeader(page);
  await openSimulator(page, request);
  await expect(header.status).toHaveText('Tipos del 12/11/2026');

  await page.getByRole('contentinfo').scrollIntoViewIfNeeded();

  await expect(header.status).toBeInViewport();
});

test('AC-83 / D-24 every view credits the provider in the footer', async ({ page, request }) => {
  const customer = await createCustomer(request);

  for (const path of ['/', '/customers/new', `/customers/${customer.id}`, '/no-existe']) {
    await page.goto(path);
    await expect(
      page.getByRole('contentinfo').getByRole('link', { name: 'Rates By Exchange Rate API' }),
    ).toHaveAttribute('href', 'https://www.exchangerate-api.com');
  }
});
