import { simulationSchema } from '@saas-o-matic/contract';
import { MAX_API_CALLS_PER_MONTH, MAX_STORAGE_GB } from '@saas-o-matic/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { countRows, createCustomer, postSimulation, simulationBody } from '../../../test/api-helpers.js';
import { buildApiTestApp, type TestApp } from '../../../test/build-test-app.js';
import { expectBody, expectProblem } from '../../../test/expect-response.js';

const UNKNOWN_CUSTOMER = '019a7a3c-0000-7000-8000-0000000000ff';

let testApp: TestApp;
let customerId: string;

beforeAll(async () => {
  testApp = await buildApiTestApp();
  customerId = (await createCustomer(testApp)).id;
});

afterAll(async () => {
  await testApp.close();
});

const simulations = (): number => countRows(testApp, 'simulations');

describe('AC-41 / TV-PR-10…15 invalid numbers of users are 400 and nothing is saved', () => {
  it.each([
    { vector: 'TV-PR-10', value: 0, code: 'OUT_OF_RANGE' },
    { vector: 'TV-PR-11', value: 10_001, code: 'OUT_OF_RANGE' },
    { vector: 'TV-PR-12', value: -1, code: 'OUT_OF_RANGE' },
    { vector: 'TV-PR-13', value: 10.5, code: 'INVALID_TYPE' },
    { vector: 'TV-PR-14', value: '15', code: 'INVALID_TYPE' },
    { vector: 'TV-PR-15', value: null, code: 'REQUIRED' },
  ] as const)('$vector: $value → $code', async ({ value, code }) => {
    const before = simulations();

    const response = await postSimulation(testApp, simulationBody(customerId, { activeUsers: value }));

    expectProblem(response, 'VALIDATION_ERROR', [{ location: 'body', pointer: '/activeUsers', code }]);
    expect(simulations()).toBe(before);
  });

  it('TV-PR-15: an absent activeUsers is REQUIRED too', async () => {
    const body = Object.fromEntries(
      Object.entries(simulationBody(customerId)).filter(([field]) => field !== 'activeUsers'),
    );

    expectProblem(await postSimulation(testApp, body), 'VALIDATION_ERROR', [
      { location: 'body', pointer: '/activeUsers', code: 'REQUIRED' },
    ]);
  });
});

describe('AC-42 the client never sends an amount', () => {
  it.each(['totalCents', 'baseCents', 'pricing'])(
    '%s → 400 UNKNOWN_FIELD and nothing is saved',
    async (field) => {
      const before = simulations();

      const response = await postSimulation(testApp, simulationBody(customerId, { [field]: 1 }));

      expectProblem(response, 'VALIDATION_ERROR', [
        { location: 'body', pointer: `/${field}`, code: 'UNKNOWN_FIELD' },
      ]);
      expect(simulations()).toBe(before);
    },
  );
});

describe('AC-43 the customer of a simulation', () => {
  it('a UUID that does not exist is 422 CUSTOMER_NOT_FOUND on /customerId', async () => {
    const before = simulations();

    const response = await postSimulation(testApp, simulationBody(UNKNOWN_CUSTOMER));

    expectProblem(response, 'BUSINESS_RULE_VIOLATION', [
      { location: 'body', pointer: '/customerId', code: 'CUSTOMER_NOT_FOUND' },
    ]);
    expect(simulations()).toBe(before);
  });

  it('a value that is not a UUID is 400 INVALID_FORMAT', async () => {
    expectProblem(await postSimulation(testApp, simulationBody('not-a-uuid')), 'VALIDATION_ERROR', [
      { location: 'body', pointer: '/customerId', code: 'INVALID_FORMAT' },
    ]);
  });
});

describe('AC-45 storage and API calls: the limits of the catalog, and they never change the price (D-06)', () => {
  const baseline = async (): Promise<number> =>
    expectBody(await postSimulation(testApp, simulationBody(customerId)), 201, simulationSchema).pricing
      .totalCents;

  it.each([
    { field: 'storageGb', accepted: [0, MAX_STORAGE_GB], rejected: [MAX_STORAGE_GB + 1, -1] },
    {
      field: 'apiCallsPerMonth',
      accepted: [0, MAX_API_CALLS_PER_MONTH],
      rejected: [MAX_API_CALLS_PER_MONTH + 1, -1],
    },
  ])('$field accepts $accepted and rejects $rejected', async ({ field, accepted, rejected }) => {
    const expectedTotal = await baseline();
    for (const value of accepted) {
      const response = await postSimulation(testApp, simulationBody(customerId, { [field]: value }));
      expect(expectBody(response, 201, simulationSchema).pricing.totalCents).toBe(expectedTotal);
    }
    const before = simulations();
    for (const value of rejected) {
      const response = await postSimulation(testApp, simulationBody(customerId, { [field]: value }));
      expectProblem(response, 'VALIDATION_ERROR', [
        { location: 'body', pointer: `/${field}`, code: 'OUT_OF_RANGE' },
      ]);
    }
    expect(simulations()).toBe(before);
  });
});
