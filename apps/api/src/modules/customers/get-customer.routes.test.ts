import { customerSchema } from '@saas-o-matic/contract';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createCustomer } from '../../../test/api-helpers.js';
import { buildApiTestApp, type TestApp } from '../../../test/build-test-app.js';
import { expectBody, expectProblem } from '../../../test/expect-response.js';

const UNKNOWN_ID = '019a7a3c-0000-7000-8000-0000000000ff';

let testApp: TestApp;

beforeAll(async () => {
  testApp = await buildApiTestApp();
});

afterAll(async () => {
  await testApp.close();
});

const get = (id: string) => testApp.app.inject({ method: 'GET', url: `/customers/${id}` });

describe('AC-27 GET /customers/{id}', () => {
  it('returns the whole customer, the email included', async () => {
    const created = await createCustomer(testApp);

    const customer = expectBody(await get(created.id), 200, customerSchema);

    expect(customer).toEqual(created);
    expect(customer.contactEmail).toBe('compras@acme-iberica.example');
  });

  it('an unknown UUID is 404 NOT_FOUND', async () => {
    expectProblem(await get(UNKNOWN_ID), 'NOT_FOUND');
  });

  it('an id that is not a UUID is 400 on the path', async () => {
    expectProblem(await get('abc'), 'VALIDATION_ERROR', [
      { location: 'path', pointer: '/id', code: 'INVALID_FORMAT' },
    ]);
  });
});
