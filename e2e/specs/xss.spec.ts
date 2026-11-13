import { createCustomer } from '../fixtures/customers.js';
import { expect, test } from '../fixtures/test.js';

/** AC-63, RNF-SEC-14: the name of the acceptance criterion, which would run a script if it were parsed as HTML. */
const MALICIOUS_NAME = '<img src=x onerror=alert(1)>';

test('AC-63: a malicious name is shown as literal text in the listing and the detail, and runs nothing', async ({
  page,
  request,
}) => {
  const dialogs: string[] = [];
  page.on('dialog', (dialog) => {
    dialogs.push(dialog.message());
    void dialog.dismiss();
  });
  const customer = await createCustomer(request, { companyName: MALICIOUS_NAME });
  expect(customer.companyName).toBe(MALICIOUS_NAME);

  await page.goto('/');
  await page
    .getByRole('searchbox', { name: 'Buscar por empresa o identificador fiscal' })
    .fill(customer.taxId);
  const card = page.getByRole('list', { name: 'Clientes' }).getByRole('link');
  await expect(card).toHaveCount(1);
  await expect(card.getByText(MALICIOUS_NAME, { exact: true })).toBeVisible();
  await expect(page.locator('img[src="x"]')).toHaveCount(0);

  await card.click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(MALICIOUS_NAME);
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
  await expect(page).toHaveTitle(/.+/);

  expect(dialogs, 'alert() was called').toEqual([]);
  // The CSP guard of fixtures/test.ts also fails the test if an inline handler was blocked.
});
