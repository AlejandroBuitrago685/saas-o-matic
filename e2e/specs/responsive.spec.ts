import type { APIRequestContext } from '@playwright/test';
import type { CreateCustomerRequest } from '@saas-o-matic/contract';

import { fillCustomerForm } from '../fixtures/customer-form.js';
import { createCustomer, newCustomer, syntheticDni } from '../fixtures/customers.js';
import { expectNoHorizontalScroll, expectTextFullyVisible, NARROW_VIEWPORT } from '../fixtures/layout.js';
import { expect, test } from '../fixtures/test.js';

test.use({ viewport: NARROW_VIEWPORT });

/** AC-84, CL-50: the longest values the contract accepts, with no space to break on. */
function longestCustomer(): CreateCustomerRequest {
  const taxId = syntheticDni();
  const companyName = `Empresa${taxId}`.padEnd(200, 'X');
  // 64 + 1 + 189 = 254 characters: the longest local part (64) and labels of at most 63.
  const contactEmail = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(57)}.com`;
  return newCustomer({ taxId, companyName, contactEmail });
}

async function saveSimulation(request: APIRequestContext, customerId: string): Promise<void> {
  const response = await request.post('/api/simulations', {
    data: { customerId, activeUsers: 51, storageGb: 0, apiCallsPerMonth: 0 },
  });
  expect(response.status(), await response.text()).toBe(201);
}

test('AC-84: with a 200-character name and a 254-character email, the dashboard, the form and the detail fit in 360 px', async ({
  page,
  request,
}) => {
  const data = longestCustomer();
  expect(data.companyName).toHaveLength(200);
  expect(data.contactEmail).toHaveLength(254);
  const customer = await createCustomer(request, data);
  await saveSimulation(request, customer.id);

  await page.goto('/');
  await page
    .getByRole('searchbox', { name: 'Buscar por empresa o identificador fiscal' })
    .fill(customer.taxId);
  const card = page.getByRole('list', { name: 'Clientes' }).getByRole('link');
  await expect(card).toHaveCount(1);
  await expectTextFullyVisible(card.getByText(customer.companyName, { exact: true }));
  await expectNoHorizontalScroll(page);

  await page.goto('/customers/new');
  await fillCustomerForm(
    page,
    newCustomer({ companyName: data.companyName, contactEmail: data.contactEmail }),
  );
  await expectNoHorizontalScroll(page);

  await page.goto(`/customers/${customer.id}`);
  await expectTextFullyVisible(page.getByRole('heading', { level: 1 }));
  await expectTextFullyVisible(page.getByText(customer.contactEmail, { exact: true }));
  await expect(page.getByRole('slider', { name: 'Usuarios activos' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Simulaciones guardadas' })).toBeVisible();
  await expectNoHorizontalScroll(page);
});
