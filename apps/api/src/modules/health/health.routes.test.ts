import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildTestApp, type TestApp } from '../../../test/build-test-app.js';

let testApp: TestApp;

beforeEach(async () => {
  testApp = await buildTestApp();
});

afterEach(async () => {
  await testApp.close();
});

describe('AC-48 GET /health', () => {
  it('answers 200 { status: "ok" } while the database answers', async () => {
    const response = await testApp.app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('answers 503 without internal details when the database is gone, and logs why', async () => {
    testApp.database.close();

    const response = await testApp.app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ status: 'unavailable' });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(testApp.logs()).toContain('database unavailable');
  });
});
