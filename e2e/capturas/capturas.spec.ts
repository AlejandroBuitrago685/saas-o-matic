import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import type { APIRequestContext, Page } from '@playwright/test';
import type { CustomerPage } from '@saas-o-matic/contract';

import { currencyHeader, expectReferenceRates } from '../fixtures/exchange-rates-api.js';
import { NARROW_VIEWPORT } from '../fixtures/layout.js';
import { expect, test } from '../fixtures/test.js';
import { encodeWebp } from './webp-encoder.js';

/** Where the README looks for them (D-180). */
const OUTPUT_DIR = resolve(import.meta.dirname, '../../docs/capturas');
const API_URL = 'http://127.0.0.1:3100';
/** The customer of the sample data that has simulations and pays the Spanish VAT. */
const CUSTOMER_QUERY = 'Acme Ibérica';
/** Sixty users: the three tiers of the tariff show up in the breakdown. */
const SHOWN_USERS = '60';
const DESKTOP_VIEWPORT = { width: 1280, height: 800 } as const;
/** Tall enough to show the whole projection: tiers, base, tax and total. */
const SIMULATOR_VIEWPORT = { width: 1280, height: 1000 } as const;
/** The sticky header covers the top of the window: the projection is scrolled to just below it. */
const HEADER_ALLOWANCE_PX = 150;
const WEBP_QUALITY = 0.9;

test.beforeAll(() => {
  mkdirSync(OUTPUT_DIR, { recursive: true });
});

/** Takes the screenshot of the page as it is now and saves it as a WebP in `docs/capturas`. */
async function capture(page: Page, name: string): Promise<void> {
  // Webfonts finished and the first frame painted: the same picture on every run.
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot({ animations: 'disabled' });
  const scratch = await page.context().newPage();
  const webp = await encodeWebp(scratch, png, WEBP_QUALITY);
  await scratch.close();
  writeFileSync(join(OUTPUT_DIR, `${name}.webp`), webp);
}

async function openAcme(page: Page, request: APIRequestContext) {
  const found = await request.get(`${API_URL}/customers`, { params: { q: CUSTOMER_QUERY } });
  expect(found.status()).toBe(200);
  const [customer] = ((await found.json()) as CustomerPage).items;
  expect(customer?.companyName).toContain(CUSTOMER_QUERY);
  await page.goto(`/customers/${customer?.id ?? ''}`);
  const header = currencyHeader(page);
  await expectReferenceRates(header);
  await page.getByRole('textbox', { name: 'Usuarios activos' }).fill(SHOWN_USERS);
  await expect(page.getByRole('slider', { name: 'Usuarios activos' })).toHaveAttribute(
    'aria-valuetext',
    `${SHOWN_USERS} usuarios`,
  );
  // Without the focus ring of the field the picture shows the page, not the typing.
  await page.getByRole('textbox', { name: 'Usuarios activos' }).blur();
  return header;
}

test('D-180: the dashboard with the sample data', async ({ page }) => {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto('/');
  await expectReferenceRates(currencyHeader(page));
  await expect(page.getByRole('list', { name: 'Clientes' }).getByRole('link')).toHaveCount(20);
  await capture(page, 'dashboard');
});

test('D-180: the simulator with the breakdown by tier, in pounds sterling', async ({ page, request }) => {
  await page.setViewportSize(SIMULATOR_VIEWPORT);
  const header = await openAcme(page, request);
  await header.select.selectOption('GBP');
  await expect(page.getByTestId('projection-total')).toContainText('GBP');
  await capture(page, 'simulador');
});

test('D-180: the same simulator at 360 px', async ({ page, request }) => {
  await page.setViewportSize(NARROW_VIEWPORT);
  await openAcme(page, request);
  const projection = page.getByTestId('projection-total').locator('xpath=..');
  await expect(projection).toBeVisible();
  await projection.evaluate((element, allowance) => {
    window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - allowance);
  }, HEADER_ALLOWANCE_PX);
  await capture(page, 'movil-360');
});
