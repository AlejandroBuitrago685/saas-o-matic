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

/** The text of each line an element wraps into, measured with a range over each of its characters. */
function renderedLines(element: Element): string[] {
  const lines = new Map<number, string>();
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const content = node.textContent ?? '';
    for (let index = 0; index < content.length; index += 1) {
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + 1);
      const top = Math.round(range.getBoundingClientRect().top);
      lines.set(top, (lines.get(top) ?? '') + content.charAt(index));
    }
  }
  return [...lines.values()];
}

/** 73 characters whose parts all fit in a line of 360 px, so every break is a natural one (D-159). */
const LONG_EMAIL = 'direccion.compras.internacionales@industriasatlanticasdelnorte.example.com';

test('D-159: a long email wraps only after «@» and the dots, never in the middle of a part', async ({
  page,
  request,
}) => {
  const customer = await createCustomer(request, { contactEmail: LONG_EMAIL });

  await page.goto(`/customers/${customer.id}`);
  const email = page.getByRole('link', { name: LONG_EMAIL });
  await expectTextFullyVisible(email);

  const lines = await email.evaluate(renderedLines);
  expect(lines.length).toBeGreaterThan(1);
  expect(lines.join('')).toBe(LONG_EMAIL);
  for (const line of lines.slice(0, -1)) expect(line, `«${line}» ends at a natural break`).toMatch(/[@.]$/);
});

test('D-159: on a desktop a usual email fits in one line', async ({ page, request }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const contactEmail = 'ventas@acmeindustrial.es';
  const customer = await createCustomer(request, { contactEmail });

  await page.goto(`/customers/${customer.id}`);

  expect(await page.getByRole('link', { name: contactEmail }).evaluate(renderedLines)).toEqual([
    contactEmail,
  ]);
});
