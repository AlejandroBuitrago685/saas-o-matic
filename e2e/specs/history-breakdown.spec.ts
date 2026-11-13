import { expectNoSeriousA11yViolations } from '../fixtures/a11y.js';
import { euros } from '../fixtures/amounts.js';
import { createCustomer } from '../fixtures/customers.js';
import { expectNoHorizontalScroll, NARROW_VIEWPORT } from '../fixtures/layout.js';
import { expect, test } from '../fixtures/test.js';

test('spec 05 §3.5 (Should) TV-PR-06: the breakdown of a saved simulation opens with the keyboard, also in 360 px', async ({
  page,
  request,
}) => {
  await page.setViewportSize(NARROW_VIEWPORT);
  const customer = await createCustomer(request);
  const saved = await request.post('/api/simulations', {
    data: { customerId: customer.id, activeUsers: 51, storageGb: 0, apiCallsPerMonth: 0 },
  });
  expect(saved.status()).toBe(201);

  await page.goto(`/customers/${customer.id}`);
  const card = page.getByRole('list', { name: 'Simulaciones guardadas' }).getByRole('listitem').first();
  const toggle = card.getByText('Desglose por tramo');
  const breakdown = card.locator('details dl > div');
  await expect(toggle).toBeVisible();
  await expect(breakdown.first()).toBeHidden();

  await toggle.focus();
  await page.keyboard.press('Enter');

  await expect(breakdown).toHaveCount(3);
  await expect(breakdown.nth(0).locator('dd')).toHaveText(euros('100,00'));
  await expect(breakdown.nth(1).locator('dd')).toHaveText(euros('320,00'));
  await expect(breakdown.nth(2)).toContainText('Tramo 3 · usuarios desde 51 · 1 × 5,00');
  await expect(breakdown.nth(2).locator('dd')).toHaveText(euros('5,00'));
  await expectNoHorizontalScroll(page);
  await expectNoSeriousA11yViolations(page, 'history with the breakdown open');
});
