import {
  customerSchema,
  simulationSchema,
  type CustomerResponse,
  type SimulationResponse,
} from '@saas-o-matic/contract';
import type { LightMyRequestResponse } from 'fastify';

import type { TestApp } from './build-test-app.js';
import { expectBody } from './expect-response.js';

/** A valid body for POST /customers; the tax id is a CIF with a correct check digit (TV-ES). */
export function customerBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    companyName: 'Acme Ibérica S.L.',
    taxId: 'B12345674',
    country: 'ES',
    contactEmail: 'compras@acme-iberica.example',
    plan: 'BUSINESS',
    ...overrides,
  };
}

export const postCustomer = (
  { app }: TestApp,
  body: unknown = customerBody(),
): Promise<LightMyRequestResponse> =>
  app.inject({ method: 'POST', url: '/customers', payload: body as object });

/** Creates a customer that must succeed and returns it. */
export async function createCustomer(
  testApp: TestApp,
  overrides: Record<string, unknown> = {},
): Promise<CustomerResponse> {
  return expectBody(await postCustomer(testApp, customerBody(overrides)), 201, customerSchema);
}

export const postSimulation = ({ app }: TestApp, body: unknown): Promise<LightMyRequestResponse> =>
  app.inject({ method: 'POST', url: '/simulations', payload: body as object });

/** A valid body for POST /simulations of an existing customer. */
export function simulationBody(
  customerId: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return { customerId, activeUsers: 15, storageGb: 250, apiCallsPerMonth: 1_200_000, ...overrides };
}

/** Creates a simulation that must succeed and returns it. */
export async function createSimulation(
  testApp: TestApp,
  customerId: string,
  overrides: Record<string, unknown> = {},
): Promise<SimulationResponse> {
  return expectBody(
    await postSimulation(testApp, simulationBody(customerId, overrides)),
    201,
    simulationSchema,
  );
}

/** Rows of a table: «nothing is saved» is checked by counting, not by trusting the response. */
export function countRows(testApp: TestApp, table: 'customers' | 'simulations' | 'simulation_tiers'): number {
  const row = testApp.database.db.$client.prepare(`select count(*) as total from ${table}`).get() as {
    total: number;
  };
  return row.total;
}
