import { customerSchema } from '@saas-o-matic/contract';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { countRows, customerBody, postCustomer } from '../../../test/api-helpers.js';
import { buildApiTestApp, type TestApp } from '../../../test/build-test-app.js';
import { expectBody, expectProblem } from '../../../test/expect-response.js';

let testApp: TestApp;

beforeAll(async () => {
  testApp = await buildApiTestApp();
});

afterAll(async () => {
  await testApp.close();
});

describe('AC-25 / TV-ES-04, TV-ES-28, TV-INT-27: a tax id that is not valid for the country is a 422 on /taxId', () => {
  it.each([
    { vector: 'TV-ES-04', country: 'ES', taxId: '12345678A', code: 'TAX_ID_INVALID_CHECK' },
    { vector: 'TV-ES-28', country: 'ES', taxId: 'K1234567L', code: 'TAX_ID_UNSUPPORTED_TYPE' },
    { vector: 'TV-INT-27', country: 'US', taxId: '00-1234567', code: 'TAX_ID_INVALID_FORMAT' },
  ] as const)('$vector: $country $taxId → $code', async ({ country, taxId, code }) => {
    const before = countRows(testApp, 'customers');

    const response = await postCustomer(testApp, customerBody({ country, taxId }));

    expectProblem(response, 'BUSINESS_RULE_VIOLATION', [{ location: 'body', pointer: '/taxId', code }]);
    expect(countRows(testApp, 'customers')).toBe(before);
  });
});

describe('AC-26 duplicates: the same country and the same normalized tax id', () => {
  it('answers 409 with the id of the first customer, whatever the format of the second tax id', async () => {
    const first = expectBody(
      await postCustomer(testApp, customerBody({ taxId: '12345678Z' })),
      201,
      customerSchema,
    );

    const response = await postCustomer(testApp, customerBody({ taxId: '12.345.678-z' }));

    const problem = expectProblem(response, 'CUSTOMER_ALREADY_EXISTS');
    expect(problem.existingCustomerId).toBe(first.id);
  });

  it('the same identifier in another country is another customer (PT and DE)', async () => {
    const portugal = await postCustomer(testApp, customerBody({ country: 'PT', taxId: '123456789' }));
    const germany = await postCustomer(testApp, customerBody({ country: 'DE', taxId: '123456789' }));

    expect([portugal.statusCode, germany.statusCode]).toEqual([201, 201]);
  });

  it('ten identical requests at once: one 201 and nine 409 that name the same customer (RF-01, D-17)', async () => {
    const body = customerBody({ country: 'US', taxId: '12-3456789' });

    const responses = await Promise.all(Array.from({ length: 10 }, () => postCustomer(testApp, body)));

    const created = responses.filter(({ statusCode }) => statusCode === 201);
    const conflicts = responses.filter(({ statusCode }) => statusCode === 409);
    expect([created.length, conflicts.length]).toEqual([1, 9]);
    const [winnerResponse] = created;
    if (winnerResponse === undefined) throw new Error('no request created the customer');
    const winner = expectBody(winnerResponse, 201, customerSchema);
    for (const conflict of conflicts) {
      expect(expectProblem(conflict, 'CUSTOMER_ALREADY_EXISTS').existingCustomerId).toBe(winner.id);
    }
  });
});
