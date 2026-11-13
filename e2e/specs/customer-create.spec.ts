import { fillCustomerForm } from '../fixtures/customer-form.js';
import { createCustomer, newCustomer } from '../fixtures/customers.js';
import { expect, test } from '../fixtures/test.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/customers/new');
});

test('AC-72: a valid Spanish customer opens its detail with «Cliente creado»', async ({ page }) => {
  const customer = newCustomer();
  await fillCustomerForm(page, customer);

  await page.getByRole('button', { name: 'Crear cliente' }).click();

  await expect(page).toHaveURL(/\/customers\/[0-9a-f-]{36}$/);
  await expect(page.getByText('Cliente creado')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(customer.companyName);
});

test('AC-73 TV-ES-04: a wrong check letter is shown under the field, which gets the focus', async ({
  page,
}) => {
  const customer = newCustomer({ taxId: '12345678A' });
  await fillCustomerForm(page, customer);

  await page.getByRole('button', { name: 'Crear cliente' }).click();

  await expect(page.locator('#customer-tax-id-error')).toHaveText(
    'El carácter de control no es correcto. Revisa el identificador.',
  );
  await expect(page.locator('#customer-tax-id')).toBeFocused();
  await expect(page.getByLabel('Nombre de empresa')).toHaveValue(customer.companyName);
  await expect(page.getByLabel('Email de contacto')).toHaveValue(customer.contactEmail);
  await expect(page).toHaveURL(/\/customers\/new$/);
});

test('AC-74: a duplicate says so and «Ver cliente» opens the existing customer', async ({
  page,
  request,
}) => {
  const existing = await createCustomer(request);
  await fillCustomerForm(page, newCustomer({ taxId: existing.taxId }));

  await page.getByRole('button', { name: 'Crear cliente' }).click();

  await expect(page.getByRole('alert')).toContainText('Ya existe un cliente con este identificador fiscal');
  await page.getByRole('link', { name: 'Ver cliente' }).click();
  await expect(page).toHaveURL(`/customers/${existing.id}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(existing.companyName);
});
