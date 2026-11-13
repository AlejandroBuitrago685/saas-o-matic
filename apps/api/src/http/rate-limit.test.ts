import type { Problem } from '@saas-o-matic/contract';
import { afterEach, describe, expect, it } from 'vitest';

import { buildTestApp, type TestApp } from '../../test/build-test-app.js';
import { registerTestRoutes } from '../../test/test-routes.js';

/** The Compose network (D-130): the container nginx has a fixed address and the host enters through the gateway. */
const CONTAINER_NGINX = '172.30.0.10';
const HOST_GATEWAY = '172.30.0.1';
/** D-130, demo: the gateway is the host nginx, which replaces X-Forwarded-For with the real client (D-105). */
const DEMO_TRUST = ['loopback', HOST_GATEWAY, CONTAINER_NGINX];
/** D-130, local Compose: the gateway is the user of the machine, not a proxy, so only the container nginx is trusted. */
const LOCAL_TRUST = ['loopback', CONTAINER_NGINX];
const CLIENT = '203.0.113.7';
const OTHER_CLIENT = '198.51.100.20';

let testApp: TestApp | undefined;

afterEach(async () => {
  await testApp?.close();
  testApp = undefined;
});

async function appWith(
  perMinute: number,
  writesPerMinute: number,
  trustProxy = DEMO_TRUST,
): Promise<TestApp> {
  testApp = await buildTestApp({
    config: { rateLimit: { perMinute, writesPerMinute }, trustProxy },
    routes: registerTestRoutes,
  });
  return testApp;
}

/** A request as the container nginx forwards it: the client, then the host gateway (D-105). */
const through = (client: string) => ({
  remoteAddress: CONTAINER_NGINX,
  headers: { 'x-forwarded-for': `${client}, ${HOST_GATEWAY}` },
});

const get = (app: TestApp, url: string, client = CLIENT) =>
  app.app.inject({ method: 'GET', url, ...through(client) });

const write = (app: TestApp, client = CLIENT) =>
  app.app.inject({
    method: 'POST',
    url: '/__test/echo',
    payload: { name: 'Acme', units: 1 },
    ...through(client),
  });

describe('AC-51 rate limit per client IP', () => {
  it('a client over the write limit gets 429 RATE_LIMITED with Retry-After; another client does not', async () => {
    const app = await appWith(100, 2);
    await write(app);
    await write(app);

    const limited = await write(app);
    const other = await write(app, OTHER_CLIENT);

    expect(limited.statusCode).toBe(429);
    expect(limited.json<Problem>()).toMatchObject({ code: 'RATE_LIMITED', status: 429 });
    expect(Number(limited.headers['retry-after'])).toBeGreaterThanOrEqual(1);
    expect(Number(limited.headers['retry-after'])).toBeLessThanOrEqual(60);
    expect(other.statusCode).toBe(200);
  });

  it('every request counts towards the global limit, writes and unknown routes included', async () => {
    const app = await appWith(4, 10);
    await write(app);
    await get(app, '/health');
    await get(app, '/debug');
    await get(app, '/catalog');

    const limited = await get(app, '/health');

    expect(limited.statusCode).toBe(429);
    expect(limited.headers['retry-after']).toBeDefined();
  });

  it('reports the remaining requests, which the P11 check reads from two networks', async () => {
    const app = await appWith(10, 10);

    const first = await get(app, '/health');
    const second = await get(app, '/health');

    expect(first.headers['x-ratelimit-remaining']).toBe('9');
    expect(second.headers['x-ratelimit-remaining']).toBe('8');
  });
});

describe('D-105 the API sees the real client IP behind the two nginx', () => {
  const whoami = async (app: TestApp, options: { remoteAddress: string; headers?: Record<string, string> }) =>
    (await app.app.inject({ method: 'GET', url: '/__test/whoami', ...options })).json<{ ip: string }>().ip;

  it('takes the first address from the right that is not a trusted proxy', async () => {
    expect(await whoami(await appWith(100, 20), through(CLIENT))).toBe(CLIENT);
  });

  it('ignores fake addresses that the client prepends', async () => {
    const spoofed = {
      remoteAddress: CONTAINER_NGINX,
      headers: { 'x-forwarded-for': `6.6.6.6, ${CLIENT}, ${HOST_GATEWAY}` },
    };

    expect(await whoami(await appWith(100, 20), spoofed)).toBe(CLIENT);
  });

  it('ignores X-Forwarded-For from a client that connects directly, not through a trusted proxy', async () => {
    const direct = { remoteAddress: OTHER_CLIENT, headers: { 'x-forwarded-for': CLIENT } };

    expect(await whoami(await appWith(100, 20), direct)).toBe(OTHER_CLIENT);
  });

  it('with TRUST_PROXY=false uses the socket address whatever the header says', async () => {
    testApp = await buildTestApp({ config: { trustProxy: false }, routes: registerTestRoutes });

    expect(await whoami(testApp, through(CLIENT))).toBe(CONTAINER_NGINX);
  });

  it('two real clients have their own bucket, while the same client shares it', async () => {
    const app = await appWith(2, 20);
    await get(app, '/health');
    await get(app, '/health');

    expect((await get(app, '/health')).statusCode).toBe(429);
    expect((await get(app, '/health', OTHER_CLIENT)).statusCode).toBe(200);
  });

  it('groups IPv6 clients by their /64, so rotating addresses inside it does not reset the limit', async () => {
    const app = await appWith(2, 20);
    await get(app, '/health', '2001:db8:1:1::1');
    await get(app, '/health', '2001:db8:1:1::2');

    expect((await get(app, '/health', '2001:db8:1:1::3')).statusCode).toBe(429);
    expect((await get(app, '/health', '2001:db8:1:2::1')).statusCode).toBe(200);
  });
});

describe('D-130 local Compose: only the container nginx is trusted', () => {
  /** What the container nginx forwards when a local process sends its own X-Forwarded-For. */
  const spoofing = (fakeIp: string) => ({
    remoteAddress: CONTAINER_NGINX,
    headers: { 'x-forwarded-for': `${fakeIp}, ${HOST_GATEWAY}` },
  });

  it('a fake X-Forwarded-For does not choose the IP: the client is the gateway', async () => {
    const app = await appWith(100, 20, LOCAL_TRUST);

    const reply = await app.app.inject({ method: 'GET', url: '/__test/whoami', ...spoofing('6.6.6.6') });

    expect(reply.json<{ ip: string }>().ip).toBe(HOST_GATEWAY);
  });

  it('two different fake addresses share the bucket of the limit', async () => {
    const app = await appWith(2, 20, LOCAL_TRUST);
    await app.app.inject({ method: 'GET', url: '/health', ...spoofing('6.6.6.6') });
    await app.app.inject({ method: 'GET', url: '/health', ...spoofing('7.7.7.7') });

    const third = await app.app.inject({ method: 'GET', url: '/health', ...spoofing('8.8.8.8') });

    expect(third.statusCode).toBe(429);
  });
});
