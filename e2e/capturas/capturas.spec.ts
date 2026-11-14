import { currencyHeader, expectReferenceRates } from '../fixtures/exchange-rates-api.js';
import { NARROW_VIEWPORT } from '../fixtures/layout.js';
import { expect, test } from '../fixtures/test.js';
import { capture, DESKTOP_VIEWPORT, ensureOutputDir, openAcme, SIMULATOR_VIEWPORT } from './capture.js';

/** The sticky header covers the top of the window: the projection is scrolled to just below it. */
const HEADER_ALLOWANCE_PX = 150;

// The dates of the history are drawn in the time zone of the browser: the same picture on every machine.
test.use({ timezoneId: 'Europe/Madrid' });

test.beforeAll(ensureOutputDir);

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
