import type { Page } from '@playwright/test';

import { fillCustomerForm } from '../fixtures/customer-form.js';
import { expect, test } from '../fixtures/test.js';
import { capture, DESKTOP_VIEWPORT, ensureOutputDir, openAcme, SIMULATOR_VIEWPORT } from './capture.js';

/**
 * The pictures of the product flow of the evaluator walkthrough (D-183): a full screenshot of each step, linked from
 * the page, and a close-up of what matters in it. The close-ups are taken from the mobile layout at twice the pixel
 * density, so they stay legible at 1280 and at 360 px.
 */
const CLOSE_UP_VIEWPORT = { width: 400, height: 900 } as const;
/** One hundred users: test vector TV-PR-07 (670 € of base, 140,70 € of tax, 810,70 € in total). */
const TIER_VECTOR_USERS = '100';

// The dates of the history are drawn in the time zone of the browser: the same picture on every machine.
test.use({ timezoneId: 'Europe/Madrid' });

test.beforeAll(ensureOutputDir);

async function submitWrongDni(page: Page): Promise<void> {
  await page.goto('/customers/new');
  await fillCustomerForm(page, {
    country: 'ES',
    companyName: 'Nueva Empresa S.L.',
    taxId: '12345678A',
    contactEmail: 'compras@nueva-empresa.example',
    plan: 'BUSINESS',
  });
  await page.getByRole('button', { name: 'Crear cliente' }).click();
  await expect(page.locator('#customer-tax-id-error')).toBeVisible();
  await page.locator('#customer-tax-id').blur();
  // Without the pointer on the button, it is drawn at rest and not in its hover colour.
  await page.mouse.move(0, 0);
}

test.describe('full screenshots', () => {
  test('D-183: the create form rejects a DNI whose control letter is wrong (TV-ES-04)', async ({ page }) => {
    await page.setViewportSize(SIMULATOR_VIEWPORT);
    await submitWrongDni(page);
    await capture(page, 'alta-cliente', [page.locator('form')]);
  });

  test('D-183: the detail of a customer, with its cards and the simulator', async ({ page, request }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await openAcme(page, request);
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await capture(page, 'detalle');
  });

  test('D-183: the projection of 100 users in three tiers, in euros (TV-PR-07)', async ({
    page,
    request,
  }) => {
    await page.setViewportSize(SIMULATOR_VIEWPORT);
    await openAcme(page, request, TIER_VECTOR_USERS);
    await expect(page.getByTestId('projection-total')).toContainText('810,70');
    await capture(page, 'tramos', [page.locator('.card-highlight')]);
  });

  test('D-183: the history of the customer, with the simulations of the sample data', async ({
    page,
    request,
  }) => {
    await page.setViewportSize(SIMULATOR_VIEWPORT);
    await openAcme(page, request);
    // The sample data has fixed dates (SEED_START): saving one here would print today's date in the picture.
    const history = page.getByRole('list', { name: 'Simulaciones guardadas' });
    await expect(history.getByRole('listitem')).not.toHaveCount(0);
    await capture(page, 'historial', [history.locator('xpath=..')]);
  });
});

test.describe('close-ups', () => {
  test.use({ viewport: CLOSE_UP_VIEWPORT, deviceScaleFactor: 2 });

  test('D-183: the search finds «Telefonía Ñandú S.A.» with «nandu»', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('searchbox').fill('nandu');
    const results = page.getByRole('list', { name: 'Clientes' }).getByRole('listitem');
    await expect(results).toHaveCount(1);
    await expect(results.first()).toContainText('Telefonía Ñandú');
    await page.getByRole('searchbox').blur();
    await capture(page, 'recorte-buscador', [page.getByRole('search'), results.first()]);
  });

  test('D-183: the error of a DNI whose control letter is wrong (TV-ES-04)', async ({ page }) => {
    await submitWrongDni(page);
    const label = page.locator('label[for="customer-tax-id"]');
    await capture(page, 'recorte-alta', [label, page.locator('#customer-tax-id-error')]);
  });

  test('D-183: the card of the customer', async ({ page, request }) => {
    await openAcme(page, request);
    await capture(page, 'recorte-cliente', [page.locator('section[aria-labelledby="customer-card-title"]')]);
  });

  test('D-183: the breakdown of 100 users in euros (TV-PR-07)', async ({ page, request }) => {
    await openAcme(page, request, TIER_VECTOR_USERS);
    await expect(page.getByTestId('projection-total')).toContainText('810,70');
    await capture(page, 'recorte-tramos', [page.locator('.card-highlight')]);
  });

  test('D-183: the breakdown of 60 users converted to pounds sterling', async ({ page, request }) => {
    const header = await openAcme(page, request);
    await header.select.selectOption('GBP');
    await expect(page.getByTestId('projection-total')).toContainText('GBP');
    await capture(page, 'recorte-divisa', [page.locator('.card-highlight')]);
  });

  test('D-183: a saved simulation in the history', async ({ page, request }) => {
    await openAcme(page, request);
    const card = page.getByRole('list', { name: 'Simulaciones guardadas' }).getByRole('listitem').first();
    await capture(page, 'recorte-historial', [card]);
  });
});
