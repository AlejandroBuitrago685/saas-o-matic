import { simulationPageSchema, simulationSchema } from '@saas-o-matic/contract';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createCustomer, createSimulation } from '../../../test/api-helpers.js';
import { buildApiTestApp, settableClock, type TestApp } from '../../../test/build-test-app.js';
import { expectBody, expectProblem } from '../../../test/expect-response.js';

const UNKNOWN_ID = '019a7a3c-0000-7000-8000-0000000000ff';
const FIRST_INSTANT = new Date('2026-11-12T10:00:00.000Z');
const LATER_INSTANT = new Date('2026-11-12T11:00:00.000Z');

const clock = settableClock(FIRST_INSTANT);

let testApp: TestApp;

beforeAll(async () => {
  testApp = await buildApiTestApp({ clock });
});

afterAll(async () => {
  await testApp.close();
});

const history = (id: string, query = '') =>
  testApp.app.inject({ method: 'GET', url: `/customers/${id}/simulations${query}` });

describe('AC-44 GET /customers/{id}/simulations', () => {
  it('lists the simulations from the most recent to the oldest, and by id when the instant is the same', async () => {
    const customer = await createCustomer(testApp);
    clock.set(FIRST_INSTANT);
    const oldest = await createSimulation(testApp, customer.id, { activeUsers: 1 });
    clock.set(LATER_INSTANT);
    const tiedFirst = await createSimulation(testApp, customer.id, { activeUsers: 2 });
    const tiedSecond = await createSimulation(testApp, customer.id, { activeUsers: 3 });

    const page = expectBody(await history(customer.id), 200, simulationPageSchema);

    expect(page.items.map(({ id }) => id)).toEqual([tiedSecond.id, tiedFirst.id, oldest.id]);
    expect(page.page).toEqual({ limit: 20, offset: 0, total: 3 });
    expect(page.items[0]).toEqual(tiedSecond);
  });

  it('paginates with limit and offset and reports the total', async () => {
    const customer = await createCustomer(testApp, { country: 'PT', taxId: '123456789' });
    for (const activeUsers of [1, 2, 3]) await createSimulation(testApp, customer.id, { activeUsers });

    const page = expectBody(await history(customer.id, '?limit=2&offset=2'), 200, simulationPageSchema);

    expect(page.items).toHaveLength(1);
    expect(page.page).toEqual({ limit: 2, offset: 2, total: 3 });
  });

  it('a customer without simulations gets an empty list and a total of 0', async () => {
    const customer = await createCustomer(testApp, { country: 'DE', taxId: '123456789' });

    const page = expectBody(await history(customer.id), 200, simulationPageSchema);

    expect(page).toEqual({ items: [], page: { limit: 20, offset: 0, total: 0 } });
  });

  it('an id that does not exist is 404: the customer is the resource of the URL', async () => {
    expectProblem(await history(UNKNOWN_ID), 'NOT_FOUND');
  });

  it('invalid pagination is 400 on the query', async () => {
    const customer = await createCustomer(testApp, { country: 'FR', taxId: '12345678901' });

    expectProblem(await history(customer.id, '?limit=0'), 'VALIDATION_ERROR', [
      { location: 'query', pointer: '/limit', code: 'OUT_OF_RANGE' },
    ]);
  });

  it('D-117: when the path and the query are both invalid, the answer reports the first part that fails', async () => {
    expectProblem(await history('abc', '?limit=0'), 'VALIDATION_ERROR', [
      { location: 'path', pointer: '/id', code: 'INVALID_FORMAT' },
    ]);
  });
});

describe('GET /simulations/{id} (04-contrato-api §3.7)', () => {
  it('returns the simulation as POST answered it', async () => {
    const customer = await createCustomer(testApp, { country: 'GB', taxId: '123456789' });
    const created = await createSimulation(testApp, customer.id);

    const response = await testApp.app.inject({ method: 'GET', url: `/simulations/${created.id}` });

    expect(expectBody(response, 200, simulationSchema)).toEqual(created);
  });

  it('an unknown UUID is 404 and something that is not a UUID is 400', async () => {
    const unknown = await testApp.app.inject({ method: 'GET', url: `/simulations/${UNKNOWN_ID}` });
    const malformed = await testApp.app.inject({ method: 'GET', url: '/simulations/abc' });

    expectProblem(unknown, 'NOT_FOUND');
    expectProblem(malformed, 'VALIDATION_ERROR', [
      { location: 'path', pointer: '/id', code: 'INVALID_FORMAT' },
    ]);
  });
});
