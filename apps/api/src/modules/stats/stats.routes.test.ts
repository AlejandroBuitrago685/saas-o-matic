import { statsResponseSchema } from '@saas-o-matic/contract';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createCustomer, createSimulation } from '../../../test/api-helpers.js';
import { buildApiTestApp, type TestApp } from '../../../test/build-test-app.js';
import { expectBody } from '../../../test/expect-response.js';

let testApp: TestApp;

beforeEach(async () => {
  testApp = await buildApiTestApp();
});

afterEach(async () => {
  await testApp.close();
});

const stats = (query = '') => testApp.app.inject({ method: 'GET', url: `/stats${query}` });

/** Users that give each base of the vectors (TV-PR-01, TV-PR-03 and TV-PR-04): 1 → 1 000, 11 → 10 800, 15 → 14 000. */
async function simulate(activeUsersList: readonly number[]): Promise<void> {
  const customer = await createCustomer(testApp);
  for (const activeUsers of activeUsersList) await createSimulation(testApp, customer.id, { activeUsers });
}

describe('AC-47 GET /stats', () => {
  it('TV-ST-01 bases 14 000 and 10 800: two simulations, average 12 400, in EUR', async () => {
    await simulate([15, 11]);

    expect(expectBody(await stats(), 200, statsResponseSchema)).toEqual({
      customersCount: 1,
      simulationsCount: 2,
      averageBaseCents: 12_400,
      currency: 'EUR',
    });
  });

  it('TV-ST-02 bases 1 000, 1 000 and 10 800: the average 4 266,67 is rounded half up to 4 267', async () => {
    await simulate([1, 1, 11]);

    expect(expectBody(await stats(), 200, statsResponseSchema)).toMatchObject({
      simulationsCount: 3,
      averageBaseCents: 4_267,
    });
  });

  it('TV-ST-03 without simulations: the average is null, and customers are counted anyway', async () => {
    await createCustomer(testApp);
    await createCustomer(testApp, { country: 'PT', taxId: '123456789' });

    expect(expectBody(await stats(), 200, statsResponseSchema)).toEqual({
      customersCount: 2,
      simulationsCount: 0,
      averageBaseCents: null,
      currency: 'EUR',
    });
  });

  it('counts the simulations of every customer, not of one', async () => {
    await simulate([15]);
    const other = await createCustomer(testApp, { country: 'PT', taxId: '123456789' });
    await createSimulation(testApp, other.id, { activeUsers: 11 });

    expect(expectBody(await stats(), 200, statsResponseSchema)).toMatchObject({
      customersCount: 2,
      simulationsCount: 2,
      averageBaseCents: 12_400,
    });
  });

  it('is never cached, and logs the route pattern', async () => {
    const response = await stats();

    expect(response.headers['cache-control']).toBe('no-store');
    expect(testApp.logs()).toContain('"/stats"');
  });

  it('rejects any query parameter with 400 UNKNOWN_FIELD (04-contrato-api §3.8)', async () => {
    const response = await stats('?currency=USD');

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      code: 'VALIDATION_ERROR',
      errors: [{ location: 'query', pointer: '/currency', code: 'UNKNOWN_FIELD' }],
    });
  });
});
