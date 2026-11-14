import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import type { APIRequestContext, Locator, Page } from '@playwright/test';
import type { CustomerPage } from '@saas-o-matic/contract';

import { currencyHeader, type CurrencyHeader, expectReferenceRates } from '../fixtures/exchange-rates-api.js';
import { expect } from '../fixtures/test.js';
import { encodeWebp } from './webp-encoder.js';

/** Where the README and the evaluator walkthrough look for the pictures (D-180, D-183). */
const OUTPUT_DIR = resolve(import.meta.dirname, '../../docs/capturas');
const API_URL = 'http://127.0.0.1:3100';
/** The customer of the sample data that has simulations and pays the Spanish VAT. */
const CUSTOMER_QUERY = 'Acme Ibérica';
/** Sixty users: the three tiers of the tariff show up in the breakdown. */
export const SHOWN_USERS = '60';
export const DESKTOP_VIEWPORT = { width: 1280, height: 800 } as const;
/** Tall enough to show the whole projection: tiers, base, tax and total. */
export const SIMULATOR_VIEWPORT = { width: 1280, height: 1000 } as const;
const WEBP_QUALITY = 0.9;
/** Margin around a cropped region, so the crop keeps the air of the page around it. */
const CROP_MARGIN_PX = 16;

/** The box that holds every region plus a margin, inside the viewport; nothing when the whole viewport is wanted. */
async function clipOf(page: Page, regions: readonly Locator[]) {
  const [first] = regions;
  if (first === undefined) return {};
  await first.scrollIntoViewIfNeeded();
  const boxes = await Promise.all(regions.map((region) => region.boundingBox()));
  if (boxes.some((box) => box === null)) throw new Error('capture: a region is not visible');
  const visible = boxes.filter((box) => box !== null);
  const left = Math.min(...visible.map((box) => box.x));
  const top = Math.min(...visible.map((box) => box.y));
  const right = Math.max(...visible.map((box) => box.x + box.width));
  const bottom = Math.max(...visible.map((box) => box.y + box.height));
  const size = page.viewportSize() ?? DESKTOP_VIEWPORT;
  const x = Math.max(0, left - CROP_MARGIN_PX);
  const y = Math.max(0, top - CROP_MARGIN_PX);
  return {
    clip: {
      x,
      y,
      width: Math.min(size.width - x, right - left + 2 * CROP_MARGIN_PX),
      height: Math.min(size.height - y, bottom - top + 2 * CROP_MARGIN_PX),
    },
  };
}

/**
 * Takes the screenshot of the page as it is now (or of the box that holds `regions`) and saves it as a WebP in
 * `docs/capturas`.
 */
export async function capture(page: Page, name: string, regions: readonly Locator[] = []): Promise<void> {
  // Webfonts finished and the first frame painted: the same picture on every run.
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot({ animations: 'disabled', ...(await clipOf(page, regions)) });
  const scratch = await page.context().newPage();
  try {
    writeFileSync(join(OUTPUT_DIR, `${name}.webp`), await encodeWebp(scratch, png, WEBP_QUALITY));
  } finally {
    await scratch.close();
  }
}

export function ensureOutputDir(): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

/** Opens «Acme Ibérica S.L.» with the reference rates loaded and `users` in the simulator. */
export async function openAcme(
  page: Page,
  request: APIRequestContext,
  users = SHOWN_USERS,
): Promise<CurrencyHeader> {
  const found = await request.get(`${API_URL}/customers`, { params: { q: CUSTOMER_QUERY } });
  expect(found.status()).toBe(200);
  const [customer] = ((await found.json()) as CustomerPage).items;
  expect(customer?.companyName).toContain(CUSTOMER_QUERY);
  await page.goto(`/customers/${customer?.id ?? ''}`);
  const header = currencyHeader(page);
  await expectReferenceRates(header);
  await page.getByRole('textbox', { name: 'Usuarios activos' }).fill(users);
  await expect(page.getByRole('slider', { name: 'Usuarios activos' })).toHaveAttribute(
    'aria-valuetext',
    `${users} usuarios`,
  );
  // Without the focus ring of the field the picture shows the page, not the typing.
  await page.getByRole('textbox', { name: 'Usuarios activos' }).blur();
  return header;
}
