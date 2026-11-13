import { takeApiDown } from '../fixtures/api-down.js';
import { fillCustomerForm } from '../fixtures/customer-form.js';
import { createCustomer, newCustomer } from '../fixtures/customers.js';
import { expect, test } from '../fixtures/test.js';

/** AC-85 in both targets: the browser cannot reach the API at all (see `api-down-nginx.spec.ts` for nginx itself). */
const RETRY = { name: 'Reintentar' } as const;

test('AC-85: the dashboard shows its error with «Reintentar» and recovers', async ({ page }) => {
  const bringApiBack = await takeApiDown(page);
  await page.goto('/');

  await expect(page.getByRole('alert')).toContainText('No se ha podido cargar el listado.');
  await expect(page.getByRole('heading', { level: 1, name: 'Clientes' })).toBeVisible();
  await bringApiBack();
  await page.getByRole('button', RETRY).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('list', { name: 'Clientes' })).toBeVisible();
});

test('AC-85: the create form shows its error with «Reintentar» and recovers', async ({ page }) => {
  const bringApiBack = await takeApiDown(page);
  await page.goto('/customers/new');

  await expect(page.getByRole('alert')).toContainText('No se ha podido cargar el catálogo.');
  await bringApiBack();
  await page.getByRole('button', RETRY).click();
  await expect(page.getByRole('button', { name: 'Crear cliente' })).toBeVisible();
});

test('AC-85: the create form keeps the data when the API goes down before sending it', async ({ page }) => {
  const customer = newCustomer();
  await page.goto('/customers/new');
  await fillCustomerForm(page, customer);
  await takeApiDown(page);

  await page.getByRole('button', { name: 'Crear cliente' }).click();

  await expect(page.getByRole('alert')).toContainText(
    'No se ha podido crear el cliente. Inténtalo de nuevo.',
  );
  await expect(page.getByLabel('Nombre de empresa')).toHaveValue(customer.companyName);
  await expect(page).toHaveURL(/\/customers\/new$/);
});

test('AC-85: the detail shows its error with «Reintentar» and recovers', async ({ page, request }) => {
  const customer = await createCustomer(request);
  const bringApiBack = await takeApiDown(page);
  await page.goto(`/customers/${customer.id}`);

  await expect(page.getByRole('alert')).toContainText('No se ha podido cargar el cliente.');
  await bringApiBack();
  await page.getByRole('button', RETRY).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(customer.companyName);
});
