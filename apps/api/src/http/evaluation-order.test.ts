import type { Problem } from '@saas-o-matic/contract';
import type { LightMyRequestResponse } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { buildTestApp, type TestApp } from '../../test/build-test-app.js';
import { registerTestRoutes } from '../../test/test-routes.js';
import { API_SECURITY_HEADERS } from './security-headers.js';

const ORIGIN = 'http://localhost:4200';
const SOME_ID = '019a7a3c-0000-7000-8000-000000000001';

let testApp: TestApp | undefined;

afterEach(async () => {
  await testApp?.close();
  testApp = undefined;
});

async function appWith(perMinute: number, writesPerMinute: number): Promise<TestApp> {
  testApp = await buildTestApp({
    config: { rateLimit: { perMinute, writesPerMinute } },
    routes: registerTestRoutes,
  });
  return testApp;
}

const write = (app: TestApp) =>
  app.app.inject({
    method: 'POST',
    url: '/__test/echo',
    payload: { name: 'Acme', units: 1 },
    headers: { origin: ORIGIN },
  });

const preflight = (app: TestApp) =>
  app.app.inject({
    method: 'OPTIONS',
    url: '/__test/echo',
    headers: { origin: ORIGIN, 'access-control-request-method': 'POST' },
  });

/** A 429 the interface can read: RFC 9457 envelope, security headers, CORS and Retry-After (05-frontend §6). */
function expectReadable429(response: LightMyRequestResponse): void {
  expect(response.statusCode).toBe(429);
  expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
  expect(response.json<Problem>()).toMatchObject({ code: 'RATE_LIMITED', status: 429 });
  expect(response.json<Problem>().instance).toBe(`urn:uuid:${String(response.headers['x-request-id'])}`);
  expect(response.headers).toMatchObject({ ...API_SECURITY_HEADERS, 'access-control-allow-origin': ORIGIN });
  expect(response.headers['access-control-expose-headers']).toBe('Retry-After');
  expect(response.headers['retry-after']).toMatch(/^\d+$/);
  expect(response.headers['cache-control']).toBe('no-store');
}

describe('AC-52 a 429 carries the same headers as any other response, so the interface can read it', () => {
  it('from the write limit', async () => {
    const app = await appWith(100, 1);
    await write(app);

    expectReadable429(await write(app));
  });

  it('from the global limit', async () => {
    const app = await appWith(1, 100);
    await write(app);

    expectReadable429(await write(app));
  });

  it.each([
    {
      status: 413,
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ tags: ['a'.repeat(17_000)] }),
    },
    { status: 415, headers: { 'content-type': 'text/plain' }, payload: 'hello' },
  ])('and so does a $status', async ({ status, headers, payload }) => {
    const app = await appWith(100, 100);

    const response = await app.app.inject({ method: 'POST', url: '/__test/echo', payload, headers });

    expect(response.statusCode).toBe(status);
    expect(response.headers).toMatchObject(API_SECURITY_HEADERS);
  });

  it('and the 204 of an allowed preflight', async () => {
    const response = await preflight(await appWith(100, 100));

    expect(response.statusCode).toBe(204);
    expect(response.headers).toMatchObject(API_SECURITY_HEADERS);
  });
});

describe('AC-51 preflights count towards the global limit', () => {
  it('the request after the limit is a 429, preflight or not', async () => {
    const app = await appWith(2, 100);
    await preflight(app);
    await preflight(app);

    expect((await preflight(app)).statusCode).toBe(429);
    expect((await app.app.inject({ method: 'GET', url: '/health' })).statusCode).toBe(429);
  });
});

describe('AC-58 the route goes first: 404 before 429 and before the body (04-contrato-api §2.3)', () => {
  it.each([
    {
      name: 'PUT with a text body',
      method: 'PUT',
      url: `/simulations/${SOME_ID}`,
      headers: { 'content-type': 'text/plain' },
      payload: 'hello',
    },
    {
      name: 'PATCH with malformed JSON',
      method: 'PATCH',
      url: '/health',
      headers: { 'content-type': 'application/json' },
      payload: '{"x":',
    },
    {
      name: 'DELETE with a body over 16 KiB',
      method: 'DELETE',
      url: `/customers/${SOME_ID}`,
      headers: { 'content-type': 'application/json' },
      payload: `"${'a'.repeat(17_000)}"`,
    },
  ] as const)('$name → 404 NOT_FOUND', async ({ method, url, headers, payload }) => {
    const response = await (await appWith(100, 100)).app.inject({ method, url, headers, payload });

    expect(response.statusCode).toBe(404);
    expect(response.json<Problem>().code).toBe('NOT_FOUND');
  });

  it('an unknown route stays 404 over the limit, but uses up the requests of the client', async () => {
    const app = await appWith(2, 100);
    const unknown = () => app.app.inject({ method: 'GET', url: '/debug' });
    await unknown();
    await unknown();

    expect((await unknown()).statusCode).toBe(404);
    expect((await app.app.inject({ method: 'GET', url: '/health' })).statusCode).toBe(429);
  });
});

describe('AC-24 a POST without Content-Type is 415 even without a body', () => {
  it('answers 415 UNSUPPORTED_MEDIA_TYPE, not a schema error', async () => {
    const response = await (await appWith(100, 100)).app.inject({ method: 'POST', url: '/__test/echo' });

    expect(response.statusCode).toBe(415);
    expect(response.json<Problem>().code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('the limit still goes before the body: over the write limit it is 429', async () => {
    const app = await appWith(100, 1);
    await app.app.inject({ method: 'POST', url: '/__test/echo' });

    expect((await app.app.inject({ method: 'POST', url: '/__test/echo' })).statusCode).toBe(429);
  });
});
