import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApiTestApp, type TestApp } from '../../test/build-test-app.js';
import { expectProblem } from '../../test/expect-response.js';

const SOME_ID = '019a7a3c-0000-7000-8000-000000000001';
const POST_ROUTES = ['/customers', '/simulations'] as const;

let testApp: TestApp;

beforeAll(async () => {
  testApp = await buildApiTestApp();
});

afterAll(async () => {
  await testApp.close();
});

const post = (url: string, payload: string, contentType: string | null = 'application/json') =>
  testApp.app.inject({
    method: 'POST',
    url,
    payload,
    headers: contentType === null ? {} : { 'content-type': contentType },
  });

describe.each(POST_ROUTES)(
  'AC-23 / AC-24 the body of POST %s goes through 415, 413 and 400 before the schema',
  (url) => {
    it.each(['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data; boundary=x', null])(
      'content type %s → 415 UNSUPPORTED_MEDIA_TYPE',
      async (contentType) => {
        expectProblem(await post(url, '{}', contentType), 'UNSUPPORTED_MEDIA_TYPE');
      },
    );

    it('a body over 16 KiB → 413 PAYLOAD_TOO_LARGE', async () => {
      expectProblem(await post(url, JSON.stringify({ padding: 'x'.repeat(16 * 1024) })), 'PAYLOAD_TOO_LARGE');
    });

    it.each(['{"companyName":', '[]', '"x"'])('%s → 400 MALFORMED_JSON', async (body) => {
      expectProblem(await post(url, body), 'MALFORMED_JSON');
    });
  },
);

describe('GET by id takes no query string (04-contrato-api §3.4, §3.7)', () => {
  it.each([`/customers/${SOME_ID}?x=1`, `/simulations/${SOME_ID}?x=1`])(
    '%s → 400 UNKNOWN_FIELD',
    async (url) => {
      const response = await testApp.app.inject({ method: 'GET', url });

      expectProblem(response, 'VALIDATION_ERROR', [
        { location: 'query', pointer: '/x', code: 'UNKNOWN_FIELD' },
      ]);
    },
  );

  it('the history takes only limit and offset', async () => {
    const response = await testApp.app.inject({
      method: 'GET',
      url: `/customers/${SOME_ID}/simulations?q=a`,
    });

    expectProblem(response, 'VALIDATION_ERROR', [
      { location: 'query', pointer: '/q', code: 'UNKNOWN_FIELD' },
    ]);
    expect(response.headers['cache-control']).toBe('no-store');
  });
});
