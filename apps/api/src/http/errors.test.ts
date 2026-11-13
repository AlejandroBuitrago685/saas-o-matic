import { PROBLEM_CODES, type Problem } from '@saas-o-matic/contract';
import type { LightMyRequestResponse } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildTestApp, type TestApp } from '../../test/build-test-app.js';
import { registerTestRoutes, TEST_CUSTOMER_ID } from '../../test/test-routes.js';

let testApp: TestApp;
const covered = new Set<string>();

beforeAll(async () => {
  // Many writes from one client: limits high enough not to interfere (they have their own tests).
  testApp = await buildTestApp({
    config: { rateLimit: { perMinute: 1_000, writesPerMinute: 1_000 } },
    routes: registerTestRoutes,
  });
});

afterAll(async () => {
  await testApp.close();
});

/** Checks the RFC 9457 envelope (04-contrato-api §2.1) and records the code for the exhaustiveness test. */
function problemOf(response: LightMyRequestResponse, status: number): Problem {
  expect(response.statusCode).toBe(status);
  expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
  const problem = response.json<Problem>();
  expect(problem.status).toBe(status);
  expect(problem.instance).toBe(`urn:uuid:${String(response.headers['x-request-id'])}`);
  covered.add(problem.code);
  return problem;
}

/** `null`: no Content-Type header at all. */
const post = (payload: string, contentType: string | null = 'application/json') =>
  testApp.app.inject({
    method: 'POST',
    url: '/__test/echo',
    payload,
    headers: contentType === null ? {} : { 'content-type': contentType },
  });

describe('D-109 schema errors keep every issue, with REQUIRED and INVALID_TYPE told apart', () => {
  it('reports all the problems of a body at once, each with its pointer', async () => {
    const response = await post(JSON.stringify({ name: 'x', units: 'three', extra: 1, tags: [7] }));

    expect(problemOf(response, 400)).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(response.json<Problem>().errors).toEqual(
      expect.arrayContaining([
        { location: 'body', pointer: '/name', code: 'TOO_SHORT' },
        { location: 'body', pointer: '/units', code: 'INVALID_TYPE' },
        { location: 'body', pointer: '/tags/0', code: 'INVALID_TYPE' },
        { location: 'body', pointer: '/extra', code: 'UNKNOWN_FIELD' },
      ]),
    );
  });

  it.each([
    ['missing', {}, 'REQUIRED'],
    ['null', { units: null }, 'REQUIRED'],
    ['of another type', { units: '2' }, 'INVALID_TYPE'],
    ['out of range', { units: 6 }, 'OUT_OF_RANGE'],
  ])('a field %s is %s', async (_case, units, code) => {
    const response = await post(JSON.stringify({ name: 'Acme', ...units }));

    expect(problemOf(response, 400).errors).toEqual([{ location: 'body', pointer: '/units', code }]);
  });

  it('locates query errors in the query', async () => {
    const response = await testApp.app.inject({ method: 'GET', url: '/__test/search?q=a&page=2' });

    expect(problemOf(response, 400).errors).toEqual([
      { location: 'query', pointer: '/page', code: 'UNKNOWN_FIELD' },
    ]);
  });
});

describe('D-106 prototype keys are unknown fields and never reach Object.prototype', () => {
  it.each([
    ['__proto__', '{"name": "Acme", "units": 1, "__proto__": {"polluted": true}}', '/__proto__'],
    [
      'constructor',
      '{"name": "Acme", "units": 1, "constructor": {"prototype": {"polluted": true}}}',
      '/constructor',
    ],
  ])('%s → 400 UNKNOWN_FIELD and a clean prototype', async (_key, payload, pointer) => {
    const response = await post(payload);

    expect(problemOf(response, 400).errors).toEqual([{ location: 'body', pointer, code: 'UNKNOWN_FIELD' }]);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    expect(Object.prototype).not.toHaveProperty('polluted');
  });
});

describe('AC-23 body size and JSON shape', () => {
  it('a body shorter than its Content-Length → 400 MALFORMED_JSON', async () => {
    const response = await testApp.app.inject({
      method: 'POST',
      url: '/__test/echo',
      payload: '{"name":"Acme","units":1}',
      headers: { 'content-type': 'application/json', 'content-length': '100' },
    });

    expect(problemOf(response, 400).code).toBe('MALFORMED_JSON');
  });

  it.each([
    ['not JSON', '{"name": '],
    ['an array', '[]'],
    ['a string', '"x"'],
    ['null', 'null'],
    ['empty', ''],
  ])('a body that is %s → 400 MALFORMED_JSON', async (_case, payload) => {
    expect(problemOf(await post(payload), 400).code).toBe('MALFORMED_JSON');
  });

  it('a body over 16 KiB → 413 PAYLOAD_TOO_LARGE; exactly 16 KiB is parsed', async () => {
    const json = (size: number): string => {
      const skeleton = JSON.stringify({ name: 'Acme', units: 1, tags: [''] });
      return skeleton.replace('[""]', `["${'a'.repeat(size - skeleton.length)}"]`);
    };

    expect(problemOf(await post(json(16_385)), 413).code).toBe('PAYLOAD_TOO_LARGE');
    expect((await post(json(16_384))).statusCode).toBe(200);
  });
});

describe('AC-24 only application/json bodies', () => {
  it.each([
    'text/plain',
    'application/x-www-form-urlencoded',
    'multipart/form-data; boundary=x',
    'application/xml',
  ])('Content-Type %s → 415 UNSUPPORTED_MEDIA_TYPE', async (contentType) => {
    expect(problemOf(await post('{"name":"Acme","units":1}', contentType), 415).code).toBe(
      'UNSUPPORTED_MEDIA_TYPE',
    );
  });

  it('a body without Content-Type → 415 UNSUPPORTED_MEDIA_TYPE', async () => {
    expect(problemOf(await post('{"name":"Acme","units":1}', null), 415).code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('accepts application/json with a charset', async () => {
    expect((await post('{"name":"Acme","units":1}', 'application/json; charset=utf-8')).statusCode).toBe(200);
  });
});

describe('ADR-009 application errors keep their status and code', () => {
  it('BusinessRuleError → 422 with its errors', async () => {
    const response = await testApp.app.inject({ method: 'GET', url: '/__test/business-rule' });

    expect(problemOf(response, 422)).toMatchObject({
      code: 'BUSINESS_RULE_VIOLATION',
      errors: [{ location: 'body', pointer: '/taxId', code: 'TAX_ID_INVALID_CHECK' }],
    });
  });

  it('ConflictError → 409 with the existing customer', async () => {
    const response = await testApp.app.inject({ method: 'GET', url: '/__test/conflict' });

    expect(problemOf(response, 409)).toMatchObject({
      code: 'CUSTOMER_ALREADY_EXISTS',
      existingCustomerId: TEST_CUSTOMER_ID,
    });
  });

  it('NotFoundError and unknown routes → 404 NOT_FOUND', async () => {
    const thrown = await testApp.app.inject({ method: 'GET', url: '/__test/not-found' });
    const unknown = await testApp.app.inject({ method: 'GET', url: '/nothing-here?q=x' });
    const badUrl = await testApp.app.inject({ method: 'GET', url: '/customers/%E0' });

    for (const response of [thrown, unknown, badUrl]) expect(problemOf(response, 404).code).toBe('NOT_FOUND');
  });
});

describe('AC-50 an internal error is generic and correlated with the logs', () => {
  it('answers 500 INTERNAL_ERROR without internal details, and logs the stack with the same request id', async () => {
    const response = await testApp.app.inject({ method: 'GET', url: '/__test/database-failure' });
    const problem = problemOf(response, 500);
    const requestId = String(response.headers['x-request-id']);

    expect(problem).toMatchObject({ code: 'INTERNAL_ERROR', detail: 'An unexpected error occurred.' });
    expect(response.body).not.toMatch(/constraint|sqlite|insert|customers|\.ts|stack/i);
    const line = testApp
      .logs()
      .split('\n')
      .find((entry) => entry.includes('"request failed"'));
    expect(line).toContain(`"reqId":"${requestId}"`);
    expect(line).toContain('SQLITE_CONSTRAINT');
  });
});

describe('ADR-009 the translation table covers every code of the contract', () => {
  // RATE_LIMITED is covered in rate-limit.test.ts, with its own app and limits.
  it('every problem code has a case in this file', () => {
    expect([...covered, 'RATE_LIMITED'].sort()).toEqual([...PROBLEM_CODES].sort());
  });
});
