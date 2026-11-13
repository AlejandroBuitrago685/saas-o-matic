import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildTestApp, type TestApp } from '../../test/build-test-app.js';
import { registerTestRoutes } from '../../test/test-routes.js';
import { API_SECURITY_HEADERS } from './security-headers.js';

const ALLOWED = 'https://app.example.com';
const FORBIDDEN = 'https://evil.example.net';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

let testApp: TestApp;

beforeAll(async () => {
  testApp = await buildTestApp({
    config: { corsOrigins: [ALLOWED, 'http://localhost:4200'] },
    routes: registerTestRoutes,
  });
});

afterAll(async () => {
  await testApp.close();
});

const inject = (method: 'GET' | 'POST' | 'OPTIONS', url: string, headers: Record<string, string> = {}) =>
  testApp.app.inject({
    method,
    url,
    headers,
    ...(method === 'POST' ? { payload: { name: 'Acme', units: 1 } } : {}),
  });

describe('AC-52 security headers on every response, with nothing that reveals the technology', () => {
  it.each([
    ['a 200', 'GET', '/catalog'],
    ['a 400', 'GET', '/catalog?x=1'],
    ['a 404', 'GET', '/debug'],
    ['a 404 rejected before routing', 'GET', '/customers/%E0'],
    ['a 500', 'GET', '/__test/database-failure'],
  ] as const)('%s', async (_case, method, url) => {
    const response = await inject(method, url);

    expect(response.headers).toMatchObject(API_SECURITY_HEADERS);
    expect(response.headers).not.toHaveProperty('x-powered-by');
    expect(response.headers).not.toHaveProperty('server');
    expect(response.headers).not.toHaveProperty('strict-transport-security');
  });

  it('adds HSTS in production only', async () => {
    const production = await buildTestApp({ config: { environment: 'production' } });
    try {
      const routed = await production.app.inject({ method: 'GET', url: '/health' });
      const beforeRouting = await production.app.inject({ method: 'GET', url: '/customers/%E0' });

      for (const response of [routed, beforeRouting]) {
        expect(response.headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains');
      }
    } finally {
      await production.close();
    }
  });
});

describe('AC-52 Cache-Control: no-store everywhere except a successful GET /catalog', () => {
  it.each([
    ['GET /catalog → 200', '/catalog', 'max-age=300'],
    ['GET /catalog with a query → 400', '/catalog?x=1', 'no-store'],
    ['GET /health', '/health', 'no-store'],
    ['an unknown route', '/debug', 'no-store'],
    ['a route rejected before routing', '/customers/%E0', 'no-store'],
  ])('%s: %s', async (_case, url, expected) => {
    expect((await inject('GET', url)).headers['cache-control']).toBe(expected);
  });
});

describe('D-107 the server always generates the request id', () => {
  it('sends a new UUID in X-Request-Id and ignores the one the client sends', async () => {
    const forged = 'forged\nline';
    const first = await inject('GET', '/health', { 'x-request-id': forged });
    const second = await inject('GET', '/health', { 'x-request-id': forged });

    expect(first.headers['x-request-id']).toMatch(UUID);
    expect(second.headers['x-request-id']).toMatch(UUID);
    expect(first.headers['x-request-id']).not.toBe(second.headers['x-request-id']);
    expect(testApp.logs()).not.toContain('forged');
  });
});

describe('AC-53 CORS with a closed list of origins', () => {
  const preflight = (origin: string) =>
    inject('OPTIONS', '/__test/echo', {
      origin,
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type',
    });

  it('an allowed origin gets its preflight and its POST answered with its own origin', async () => {
    const options = await preflight(ALLOWED);
    const post = await inject('POST', '/__test/echo', { origin: ALLOWED });

    expect(options.statusCode).toBe(204);
    expect(options.headers).toMatchObject({
      'access-control-allow-origin': ALLOWED,
      'access-control-allow-methods': 'GET, POST',
      'access-control-allow-headers': 'Content-Type',
    });
    expect(options.headers).not.toHaveProperty('access-control-allow-credentials');
    expect(post.headers['access-control-allow-origin']).toBe(ALLOWED);
    expect(post.headers['access-control-expose-headers']).toBe('Retry-After');
  });

  it('an origin outside the list gets no CORS header at all and its preflight is rejected', async () => {
    const options = await preflight(FORBIDDEN);
    const post = await inject('POST', '/__test/echo', { origin: FORBIDDEN });

    expect(options.statusCode).toBe(404);
    for (const response of [options, post]) {
      const corsHeaders = Object.keys(response.headers).filter((name) => name.startsWith('access-control-'));
      expect(corsHeaders).toEqual([]);
    }
  });

  it('an OPTIONS from an allowed origin without a requested method never gets a text/plain error', async () => {
    const options = await inject('OPTIONS', '/__test/echo', { origin: ALLOWED });

    expect(options.statusCode).toBe(204);
    expect(options.headers['access-control-allow-origin']).toBe(ALLOWED);
  });

  it('an origin that only looks like an allowed one is not allowed', async () => {
    const options = await preflight(`${ALLOWED}.evil.example.net`);

    expect(options.headers).not.toHaveProperty('access-control-allow-origin');
  });
});
