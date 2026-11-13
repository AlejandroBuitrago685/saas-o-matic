import { randomInt } from 'node:crypto';

import { type APIRequestContext, expect } from '@playwright/test';
import type { CreateCustomerRequest, CustomerResponse, SimulationPage } from '@saas-o-matic/contract';

const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';

/**
 * A synthetic Spanish DNI: 8 digits and the mod-23 check letter (03-validacion-fiscal), drawn from the 99 million
 * block so it stays apart from everyday numbers. Every test creates its own customers (07-tests §1.3), and the stack
 * of the e2e starts with an empty database, so two tests never share one.
 */
export function syntheticDni(): string {
  const digits = randomInt(99_000_000, 100_000_000);
  return `${String(digits)}${DNI_LETTERS.charAt(digits % DNI_LETTERS.length)}`;
}

/** Valid data of a Spanish customer; the name carries the identifier, so it is unique too. */
export function newCustomer(overrides: Partial<CreateCustomerRequest> = {}): CreateCustomerRequest {
  const taxId = overrides.taxId ?? syntheticDni();
  return {
    companyName: `Pruebas E2E ${taxId}, S.L.`,
    taxId,
    country: 'ES',
    contactEmail: `compras.${taxId.toLowerCase()}@example.com`,
    plan: 'BUSINESS',
    ...overrides,
  };
}

/** Creates a customer through the API of the stack (through nginx), for the tests that start from one. */
export async function createCustomer(
  request: APIRequestContext,
  overrides: Partial<CreateCustomerRequest> = {},
): Promise<CustomerResponse> {
  const response = await request.post('/api/customers', { data: newCustomer(overrides) });
  expect(response.status(), await response.text()).toBe(201);
  return (await response.json()) as CustomerResponse;
}

/** The saved simulations of a customer, as the API returns them. */
export async function listSimulations(
  request: APIRequestContext,
  customerId: string,
): Promise<SimulationPage> {
  const response = await request.get(`/api/customers/${customerId}/simulations`);
  expect(response.status()).toBe(200);
  return (await response.json()) as SimulationPage;
}
