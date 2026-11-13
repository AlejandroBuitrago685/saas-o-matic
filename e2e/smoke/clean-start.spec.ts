import { expect, test } from '../fixtures/test.js';

/** The API of `npm run dev` (README): the web proxies `/api` to it. */
const API_HEALTH_URL = 'http://localhost:3000/health';

test('AC-95: after the README commands the API is healthy and the dashboard shows the sample data', async ({
  page,
  request,
}) => {
  const health = await request.get(API_HEALTH_URL);
  expect(health.status()).toBe(200);
  expect(await health.json()).toEqual({ status: 'ok' });

  await page.goto('/');

  // `npm run setup` seeds 25 fictitious customers (04-base-de-datos §7).
  await expect(page.getByRole('list', { name: 'Clientes' }).getByRole('link')).toHaveCount(20);
  await expect(page.getByRole('navigation', { name: 'Paginación' }).getByText('1–20 de 25')).toBeVisible();
});
