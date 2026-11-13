import { expect, test } from '../fixtures/test.js';

/** A well-formed UUID v7 that no customer has: the stack starts with an empty database. */
const UNKNOWN_CUSTOMER_ID = '019a7b2c-0000-7000-8000-000000000000';

for (const [label, id] of [
  ['an unknown UUID (404)', UNKNOWN_CUSTOMER_ID],
  ['a malformed id (400)', 'abc'],
] as const) {
  test(`AC-75: ${label} shows «Cliente no encontrado» with a link to the start`, async ({ page }) => {
    await page.goto(`/customers/${id}`);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cliente no encontrado');
    await expect(page.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
  });
}

test('AC-83: the footer credits the exchange-rate provider', async ({ page }) => {
  await page.goto('/customers/new');

  await expect(
    page.getByRole('contentinfo').getByRole('link', { name: 'Rates By Exchange Rate API' }),
  ).toHaveAttribute('href', 'https://www.exchangerate-api.com');
});
