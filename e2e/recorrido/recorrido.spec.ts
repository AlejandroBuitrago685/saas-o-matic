import type { Page } from '@playwright/test';

import { expectNoSeriousA11yViolations } from '../fixtures/a11y.js';
import { expectNoHorizontalScroll, NARROW_VIEWPORT } from '../fixtures/layout.js';
import {
  LOCAL_URL,
  openAllDetails,
  PUBLISHED_PATH,
  serveDocs,
  watchErrors,
} from '../fixtures/recorrido-site.js';
import { expect, test } from '../fixtures/test.js';

/**
 * The evaluator walkthrough (D-183, D-184, D-192): it loads without errors published and from a clone, it passes axe,
 * it works at 360 px and with the keyboard, its system map shows a card per piece and plays its flows, and its live
 * simulator computes with the compiled domain package.
 */

test.beforeEach(async ({ page, baseURL }) => {
  await serveDocs(page, baseURL ?? '');
});

async function openPublished(page: Page): Promise<string[]> {
  const errors = watchErrors(page);
  await page.goto(PUBLISHED_PATH);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  return errors;
}

test('D-183: published, the page loads with no console error, failed request or CSP violation', async ({
  page,
}) => {
  const errors = await openPublished(page);
  await openAllDetails(page);
  await expect(page.locator('[data-simulator]')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  expect(errors).toEqual([]);
});

test('D-184: opened from file://, the page loads with no error and the tier step keeps its picture and its notice', async ({
  page,
}) => {
  const errors = watchErrors(page);
  // The network guard of the e2e only lets the test origin through; the page on disk is not the network.
  await page.route(
    (url) => url.protocol === 'file:',
    (route) => route.continue(),
  );
  await page.goto(LOCAL_URL);
  await page.locator('#paso-tramos summary').click();

  await expect(page.locator('[data-simulator]')).toBeHidden();
  await expect(page.locator('[data-simulator-fallback] img')).toBeVisible();
  await expect(page.locator('[data-simulator-fallback] .notice')).toContainText('versión publicada');
  expect(errors).toEqual([]);
});

test('AC-86 D-183: no serious or critical axe violation, with every disclosure open', async ({ page }) => {
  await openPublished(page);
  // Folded content keeps its entrance animations paused: axe waits for animations to end, so it runs unfolded.
  await openAllDetails(page);
  await expectNoSeriousA11yViolations(page, 'recorrido, todo desplegado');
});

test('AC-84 D-192: at 360 px nothing scrolls sideways and the zones of the map stack in a column', async ({
  page,
}) => {
  await page.setViewportSize(NARROW_VIEWPORT);
  await openPublished(page);
  await openAllDetails(page);
  await expectNoHorizontalScroll(page);

  const lefts = await page
    .locator('.sys-zone')
    .evaluateAll((zones) => zones.map((zone) => Math.round(zone.getBoundingClientRect().left)));
  expect(new Set(lefts).size, 'every zone of the map starts at the same x').toBe(1);
  // The strip of steps scrolls inside its own box, never the page.
  const strip = page.locator('.flow-strip');
  expect(await strip.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
});

test('D-192: at 1280 px the map is a grid of zones, joined by its lines, with the card beside it', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openPublished(page);
  const box = async (selector: string) =>
    (await page.locator(selector).boundingBox()) ?? { x: 0, y: 0, width: 0 };

  const [browser, internet] = [await box('[data-zone="navegador"]'), await box('[data-zone="internet"]')];
  expect(Math.round(browser.y), 'the browser and the internet share a row').toBe(Math.round(internet.y));
  const [map, card] = [await box('[data-sys-map]'), await box('#esquema-idea')];
  expect(card.x, 'the card sits to the right of the map').toBeGreaterThan(map.x + map.width);
  await expect(page.locator('.sys-wire')).toHaveCount(9);
});

test('D-183: with the keyboard, the strip opens its step and a piece of the architecture shows its card', async ({
  page,
}) => {
  await openPublished(page);
  await page
    .getByRole('navigation', { name: 'Pasos del flujo' })
    .getByRole('link', { name: /Divisa/ })
    .focus();
  await page.keyboard.press('Enter');

  await expect(page.locator('#paso-divisa')).toHaveAttribute('open', '');
  await expect(page.locator('#paso-divisa summary')).toBeFocused();
  await expect(
    page.getByRole('navigation', { name: 'Pasos del flujo' }).getByRole('link', { name: /Divisa/ }),
  ).toHaveAttribute('aria-current', 'step');

  const sqlite = page.locator('.sys-piece[data-piece="sqlite"]');
  await sqlite.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#pieza-sqlite')).toBeVisible();
  await expect(page.locator('#esquema-idea')).toBeHidden();
  await expect(sqlite).toHaveAttribute('aria-current', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('#esquema-idea')).toBeVisible();
});

test('D-192 AC-10: a flow lights the pieces of each step and sends its request along their lines', async ({
  page,
}) => {
  await openPublished(page);
  await page.getByRole('button', { name: 'Alta con NIF' }).click();
  await expect(page.locator('#flujo-alta-1')).toBeVisible();
  await expect(page.locator('[data-sys-count]')).toHaveText('Paso 1 de 6');
  await expect(page.locator('.sys-piece.is-lit')).toHaveCount(1);

  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#flujo-alta-2')).toBeVisible();
  await expect(page.locator('#flujo-alta-1')).toBeHidden();
  await expect(page.locator('.sys-piece.is-lit')).toHaveCount(4);
  await expect(page.locator('.sys-wire.is-lit')).toHaveCount(3);
  await expect(page.locator('[data-sys-label]')).toHaveText('POST /api/customers');

  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await expect(page.locator('#flujo-alta-4')).toContainText('12345678 mod 23 = 14');
  await page.getByRole('button', { name: 'Explorar' }).click();
  await expect(page.locator('#esquema-idea')).toBeVisible();
  await expect(page.locator('.sys-piece.is-lit')).toHaveCount(0);
});

test('D-192: the arrow keys step a flow only from inside the map, never from a control elsewhere', async ({
  page,
}) => {
  await openPublished(page);
  await page.getByRole('button', { name: 'Simular y guardar' }).click();
  await expect(page.locator('[data-sys-count]')).toHaveText('Paso 1 de 6');

  await page.locator('#paso-tramos summary').click();
  const country = page.getByRole('combobox', { name: 'País del cliente' });
  await country.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-sys-count]')).toHaveText('Paso 1 de 6');
  await expect(page.locator('#flujo-simular-1')).toBeVisible();
});

test('D-183: the requirements table finds a requirement', async ({ page }) => {
  await openPublished(page);
  const search = page.getByRole('searchbox', { name: /Buscar un requisito/ });
  await search.fill('divisa');
  const rows = page.locator('.req-table tbody tr:visible');
  await expect(rows).not.toHaveCount(0);
  for (const text of await rows.allTextContents()) expect(text.toLowerCase()).toContain('divisa');
  await search.fill('nada-que-coincida');
  await expect(page.getByText('Ningún requisito coincide con la búsqueda.')).toBeVisible();
});

test('D-184 TV-PR-07 TV-PR-04 TV-TX-07: the live simulator computes with the compiled domain package', async ({
  page,
}) => {
  await openPublished(page);
  await page.locator('#paso-tramos summary').click();
  const total = page.locator('[data-simulator] [data-field="total"]');
  await expect(total).toHaveText('810,70 €');

  // Position 14 of the slider is 15 users (05-frontend §3.4.1): 100 € + 40 € of base and the Spanish VAT.
  await page.getByRole('slider', { name: 'Usuarios activos' }).fill('14');
  await expect(page.locator('#sim-usuarios-valor')).toHaveText('15');
  await expect(total).toHaveText('169,40 €');

  await page.getByRole('combobox', { name: 'País del cliente' }).selectOption('US');
  await expect(total).toHaveText('140,00 €');
});
