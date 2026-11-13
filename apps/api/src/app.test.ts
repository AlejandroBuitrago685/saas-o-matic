import { API_ROUTES } from '@saas-o-matic/contract';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildTestApp, type TestApp } from '../test/build-test-app.js';
import type { AppConfig } from './config/env.js';

const swaggerUiImports = vi.hoisted(() => vi.fn());

// Counts the imports of the Swagger UI package, which must only happen in development (D-110).
vi.mock('@fastify/swagger-ui', async (importOriginal) => {
  swaggerUiImports();
  return importOriginal();
});

const PRODUCTION: Partial<AppConfig> = { environment: 'production' };
const DEMO: Partial<AppConfig> = { environment: 'production', isDemoMode: true };
const DEVELOPMENT: Partial<AppConfig> = { environment: 'development' };

let testApp: TestApp | undefined;

afterEach(async () => {
  await testApp?.close();
  testApp = undefined;
});

async function appWith(config: Partial<AppConfig>): Promise<TestApp> {
  testApp = await buildTestApp({ config });
  return testApp;
}

describe('AC-58 closed inventory of routes', () => {
  it('registers no route outside the contract (CORS preflight aside)', async () => {
    const app = await appWith(PRODUCTION);
    const contract = API_ROUTES.map(({ method, url }) => `${method} ${url}`);

    const registered = app.app
      .routeInventory()
      .filter(({ method, url }) => !(method === 'OPTIONS' && url === '*'))
      .map(({ method, url }) => `${method} ${url}`);

    expect(registered.length).toBeGreaterThan(0);
    expect(contract).toEqual(expect.arrayContaining(registered));
  });

  it.each([
    ['DELETE', '/customers/019a7a3c-0000-7000-8000-000000000001'],
    ['PUT', '/simulations/019a7a3c-0000-7000-8000-000000000001'],
    ['GET', '/debug'],
    ['DELETE', '/catalog'],
    ['HEAD', '/catalog'],
    ['PATCH', '/health'],
  ] as const)('%s %s → 404 NOT_FOUND', async (method, url) => {
    const app = await appWith(PRODUCTION);

    const response = await app.app.inject({ method, url });

    expect(response.statusCode).toBe(404);
    if (method !== 'HEAD') expect(response.json()).toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('D-110 Swagger UI only in development, loaded on demand', () => {
  it('production does not even import @fastify/swagger-ui, and development does', async () => {
    await appWith(PRODUCTION);
    await testApp?.close();
    await appWith(DEMO);

    expect(swaggerUiImports).not.toHaveBeenCalled();

    await testApp?.close();
    await appWith(DEVELOPMENT);

    expect(swaggerUiImports).toHaveBeenCalledOnce();
  });

  it.each([
    ['production', PRODUCTION],
    ['the demo', DEMO],
  ])('in %s, /docs and /docs/json do not exist', async (_name, config) => {
    const app = await appWith(config);

    for (const url of ['/docs', '/docs/json', '/docs/static/index.html']) {
      expect((await app.app.inject({ method: 'GET', url })).statusCode).toBe(404);
    }
  });

  it('in development serves the UI and the document, with its own CSP only on /docs', async () => {
    const app = await appWith(DEVELOPMENT);

    const page = await app.app.inject({ method: 'GET', url: '/docs' });
    const document = await app.app.inject({ method: 'GET', url: '/docs/json' });
    const api = await app.app.inject({ method: 'GET', url: '/catalog' });

    expect(page.statusCode).toBe(200);
    expect(page.headers['content-type']).toMatch(/^text\/html/);
    expect(page.headers['content-security-policy']).toContain("script-src 'self'");
    expect(page.headers['content-security-policy']).not.toContain('upgrade-insecure-requests');
    expect(document.json()).toMatchObject({ openapi: '3.1.0', paths: { '/catalog': {}, '/health': {} } });
    expect(api.headers['content-security-policy']).toBe("default-src 'none';frame-ancestors 'none'");
  });
});
