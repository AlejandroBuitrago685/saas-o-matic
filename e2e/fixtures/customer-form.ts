import type { Page } from '@playwright/test';
import type { CreateCustomerRequest } from '@saas-o-matic/contract';

/** Fills every field of the create form (V2) with `customer`. */
export async function fillCustomerForm(page: Page, customer: CreateCustomerRequest): Promise<void> {
  await page.getByLabel('País').selectOption(customer.country);
  await page.getByLabel('Nombre de empresa').fill(customer.companyName);
  await page.locator('#customer-tax-id').fill(customer.taxId);
  await page.getByLabel('Email de contacto').fill(customer.contactEmail);
  await page.getByLabel('Plan').selectOption(customer.plan);
}
