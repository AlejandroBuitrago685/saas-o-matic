import { customerSchema } from '@saas-o-matic/contract';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { countRows, customerBody, postCustomer } from '../../../test/api-helpers.js';
import { buildApiTestApp, type TestApp } from '../../../test/build-test-app.js';
import { customerExamples } from '../../../test/contract-examples.js';
import { expectBody, expectProblem } from '../../../test/expect-response.js';

let testApp: TestApp;

beforeAll(async () => {
  testApp = await buildApiTestApp();
});

afterAll(async () => {
  await testApp.close();
});

/** The triggers of 04-base-de-datos §2.4 forbid DELETE, so each test works with its own tax id instead. */
let sequence = 0;
const freshBody = (overrides: Record<string, unknown> = {}): Record<string, unknown> => {
  sequence += 1;
  return customerBody({ country: 'US', taxId: `12-${String(1_000_000 + sequence)}`, ...overrides });
};

describe('AC-20 POST /customers creates a customer', () => {
  it('answers 201 with Location and the example of the contract, and GET returns the same', async () => {
    const { request, created } = customerExamples();

    const response = await postCustomer(testApp, request);
    const customer = expectBody(response, 201, customerSchema);

    expect(response.headers.location).toBe(`/customers/${customer.id}`);
    expect(customer).toEqual({ ...created, id: customer.id });
    expect(customer.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    const fetched = await testApp.app.inject({ method: 'GET', url: `/customers/${customer.id}` });
    expect(expectBody(fetched, 200, customerSchema)).toEqual(customer);
  });
});

describe('AC-21 schema errors: all of them, with their pointer, and nothing is saved', () => {
  const rows = (): number => countRows(testApp, 'customers');

  it.each([
    ['companyName missing', { companyName: undefined }, { pointer: '/companyName', code: 'REQUIRED' }],
    ['country XX', { country: 'XX' }, { pointer: '/country', code: 'INVALID_ENUM' }],
    ['plan GOLD', { plan: 'GOLD' }, { pointer: '/plan', code: 'INVALID_ENUM' }],
    [
      'malformed email',
      { contactEmail: 'not-an-email' },
      { pointer: '/contactEmail', code: 'INVALID_FORMAT' },
    ],
    ['company name of 1 character', { companyName: 'A' }, { pointer: '/companyName', code: 'TOO_SHORT' }],
    ['tax id of 33 characters', { taxId: 'B'.repeat(33) }, { pointer: '/taxId', code: 'TOO_LONG' }],
  ] as const)('%s → 400 VALIDATION_ERROR', async (_name, overrides, expected) => {
    const before = rows();

    const response = await postCustomer(testApp, freshBody(overrides));

    expectProblem(response, 'VALIDATION_ERROR', [{ location: 'body', ...expected }]);
    expect(rows()).toBe(before);
  });

  it('a combined request reports every error at once', async () => {
    const before = rows();

    const response = await postCustomer(
      testApp,
      freshBody({
        companyName: 'A',
        country: 'XX',
        plan: 'GOLD',
        contactEmail: 'not-an-email',
        taxId: 'B'.repeat(33),
      }),
    );

    const problem = expectProblem(response, 'VALIDATION_ERROR');
    expect(problem.errors).toHaveLength(5);
    expect(problem.errors?.map(({ pointer, code }) => `${pointer} ${code}`).sort()).toEqual([
      '/companyName TOO_SHORT',
      '/contactEmail INVALID_FORMAT',
      '/country INVALID_ENUM',
      '/plan INVALID_ENUM',
      '/taxId TOO_LONG',
    ]);
    expect(rows()).toBe(before);
  });
});

describe('AC-22 unknown fields are rejected', () => {
  it.each(['id', 'createdAt', 'isAdmin'])('%s → 400 UNKNOWN_FIELD at that field', async (field) => {
    const before = countRows(testApp, 'customers');

    const response = await postCustomer(testApp, freshBody({ [field]: 'x' }));

    expectProblem(response, 'VALIDATION_ERROR', [
      { location: 'body', pointer: `/${field}`, code: 'UNKNOWN_FIELD' },
    ]);
    expect(countRows(testApp, 'customers')).toBe(before);
  });

  it('__proto__ → 400 UNKNOWN_FIELD, as a raw JSON key', async () => {
    const before = countRows(testApp, 'customers');
    const body = JSON.stringify(freshBody()).replace(/}$/, ',"__proto__":{"isAdmin":true}}');

    const response = await testApp.app.inject({
      method: 'POST',
      url: '/customers',
      headers: { 'content-type': 'application/json' },
      payload: body,
    });

    expectProblem(response, 'VALIDATION_ERROR', [
      { location: 'body', pointer: '/__proto__', code: 'UNKNOWN_FIELD' },
    ]);
    expect(countRows(testApp, 'customers')).toBe(before);
  });
});
