import { afterEach, describe, expect, it } from 'vitest';

import { buildApp, type App } from './app.js';

describe('AC-48 (P0 skeleton) GET /health', () => {
  let app: App | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('answers 200 { status: "ok" } as JSON without starting a server', async () => {
    app = await buildApp({ logger: false });

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toMatch(/^application\/json/);
    expect(response.json()).toEqual({ status: 'ok' });
  });
});
