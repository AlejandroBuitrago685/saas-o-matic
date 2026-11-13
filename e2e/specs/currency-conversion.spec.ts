import { amount } from '../fixtures/amounts.js';
import { createCustomer } from '../fixtures/customers.js';
import { currencyHeader, expectReferenceRates, simulateRatesApi } from '../fixtures/exchange-rates-api.js';
import { REFERENCE_RATES } from '../fixtures/exchange-rates.js';
import { openSimulator } from '../fixtures/simulator.js';
import { expect, test } from '../fixtures/test.js';

/** 15 users of a Spanish customer in each currency (02-reglas §6.5, TV-FX-01…06). */
const VECTORS = [
  {
    id: 'TV-FX-01',
    currency: 'USD',
    tiers: ['111,13', '44,45'],
    base: '155,58',
    tax: '32,67',
    total: '188,25',
  },
  {
    id: 'TV-FX-02',
    currency: 'GBP',
    tiers: ['83,59', '33,44'],
    base: '117,03',
    tax: '24,58',
    total: '141,61',
  },
  {
    id: 'TV-FX-03',
    currency: 'CHF',
    tiers: ['92,33', '36,93'],
    base: '129,26',
    tax: '27,15',
    total: '156,41',
  },
  {
    id: 'TV-FX-04',
    currency: 'JPY',
    tiers: ['17.723', '7089'],
    base: '24.812',
    tax: '5211',
    total: '30.023',
  },
  {
    id: 'TV-FX-05',
    currency: 'MXN',
    tiers: ['2068,78', '827,51'],
    base: '2896,29',
    tax: '608,22',
    total: '3504,51',
  },
  {
    id: 'TV-FX-06',
    currency: 'EUR',
    tiers: ['100,00', '40,00'],
    base: '140,00',
    tax: '29,40',
    total: '169,40',
  },
] as const;

test('AC-79 TV-FX-01…06: every currency converts the leaf items, the breakdown adds up and the unit price stays in EUR', async ({
  page,
  request,
}) => {
  const header = currencyHeader(page);
  const simulator = await openSimulator(page, request);
  await expectReferenceRates(header);
  await simulator.usersField.fill('15');
  const note = page.getByTestId('projection-note');

  for (const vector of VECTORS) {
    await test.step(`${vector.id} ${vector.currency}`, async () => {
      await header.select.selectOption(vector.currency);

      await expect(simulator.projectionLine(/^Tramo 1/)).toHaveText(amount(vector.tiers[0], vector.currency));
      await expect(simulator.projectionLine(/^Tramo 2/)).toHaveText(amount(vector.tiers[1], vector.currency));
      await expect(simulator.projectionLine('Base mensual')).toHaveText(amount(vector.base, vector.currency));
      await expect(simulator.projectionLine(/^Impuesto/)).toHaveText(amount(vector.tax, vector.currency));
      await expect(simulator.total).toHaveText(amount(vector.total, vector.currency));
      await expect(page.getByText('Tramo 1 · usuarios 1–10 · 10 × 10,00 €')).toBeVisible();
      if (vector.currency === 'EUR') await expect(note).toBeHidden();
      else
        await expect(note).toHaveText(`Importes orientativos en ${vector.currency} con tipos del 12/11/2026`);
    });
  }
});

test('AC-87 / D-19 the history in USD: the D-20 rule, the stored tax rate and the note', async ({
  page,
  request,
}) => {
  const customer = await createCustomer(request);
  const saved = await request.post('/api/simulations', {
    data: { customerId: customer.id, activeUsers: 15, storageGb: 0, apiCallsPerMonth: 0 },
  });
  expect(saved.status()).toBe(201);
  const header = currencyHeader(page);
  await page.goto(`/customers/${customer.id}`);
  await expectReferenceRates(header);
  const card = page.locator('app-simulation-card').first();
  const value = (label: string | RegExp) =>
    card.locator('.data-list > div').filter({ hasText: label }).locator('dd');
  const conversionNote = page.getByTestId('history-conversion-note');
  await expect(value('Base mensual')).toHaveText(amount('140,00', 'EUR'));
  await expect(conversionNote).toBeHidden();

  await header.select.selectOption('USD');

  await expect(value('Base mensual')).toHaveText(amount('155,58', 'USD'));
  await expect(value('Impuesto (21 %)')).toHaveText(amount('32,67', 'USD'));
  await expect(card.locator('p.amount')).toContainText('≈ 188,25');
  await expect(conversionNote).toHaveText(
    'Convertido al tipo de cambio actual, no al de la fecha de la simulación.',
  );
});

test('AC-88 / CL-33 / D-142 GBP and then JPY during a refresh: JPY with the new rates when they arrive', async ({
  page,
  request,
}) => {
  const customer = await createCustomer(request);
  const updatedAt = REFERENCE_RATES.time_last_update_unix * 1000;
  // A first visit leaves older rates in the cache: JPY at 100.
  const rates = await simulateRatesApi(page, { rates: { JPY: 100 } });
  await page.clock.install({ time: updatedAt + 60 * 60_000 });
  await page.goto(`/customers/${customer.id}`);
  const header = currencyHeader(page);
  await expect(header.status).toHaveText('Tipos del 12/11/2026');

  rates.serve('reference');
  const slow = rates.hold();
  await page.clock.setSystemTime(updatedAt + 3 * 60 * 60_000);
  await page.reload();
  await expect(header.status).toContainText('Actualizando…');
  const total = page.getByTestId('projection-total');
  await page.getByRole('textbox', { name: 'Usuarios activos' }).fill('15');
  await header.select.selectOption('GBP');
  await header.select.selectOption('JPY');
  await expect(total).toHaveText(amount('16.940', 'JPY')); // still the old rate

  slow.release();

  await expect(header.status).toHaveText('Tipos del 12/11/2026');
  await expect(header.select).toHaveValue('JPY');
  await expect(total).toHaveText(amount('30.023', 'JPY')); // TV-FX-04
});
