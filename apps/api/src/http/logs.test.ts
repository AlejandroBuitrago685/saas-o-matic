import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildTestApp, type TestApp } from '../../test/build-test-app.js';
import { registerTestRoutes } from '../../test/test-routes.js';

const CLIENT_IP = '203.0.113.77';

let testApp: TestApp;

beforeAll(async () => {
  testApp = await buildTestApp({ config: { trustProxy: ['172.18.0.0/16'] }, routes: registerTestRoutes });
});

afterAll(async () => {
  await testApp.close();
});

interface LogLine {
  readonly reqId?: string;
  readonly msg: string;
  readonly [field: string]: unknown;
}

const linesOf = (requestId: string): LogLine[] =>
  testApp
    .logs()
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => JSON.parse(line) as LogLine)
    .filter((line) => line.reqId === requestId);

const fromClient = {
  remoteAddress: '172.18.0.3',
  headers: { 'x-forwarded-for': `${CLIENT_IP}, 172.18.0.1` },
};

describe('RNF-SEC-11 one log line per request, with the route pattern and nothing personal', () => {
  it('logs method, route pattern, status and duration, without the query nor the client IP', async () => {
    const response = await testApp.app.inject({
      method: 'GET',
      url: '/__test/search?q=Acme%20Corporation',
      ...fromClient,
      headers: { ...fromClient.headers, 'user-agent': 'Secret-Agent/1.0' },
    });
    const lines = linesOf(String(response.headers['x-request-id']));

    expect(lines).toEqual([
      expect.objectContaining({
        msg: 'request completed',
        method: 'GET',
        route: '/__test/search',
        statusCode: 200,
        durationMs: expect.any(Number) as number,
      }),
    ]);
    expect(testApp.logs()).not.toMatch(/Acme|q=|203\.0\.113\.77|Secret-Agent/);
  });

  it('a rejected body logs only the contract code, never the values sent', async () => {
    const response = await testApp.app.inject({
      method: 'POST',
      url: '/__test/echo',
      payload: { name: 'x', units: 1, contactEmail: 'ana@acme.example', taxId: 'B12345678' },
      ...fromClient,
    });
    const lines = linesOf(String(response.headers['x-request-id']));

    expect(lines.map(({ msg }) => msg)).toEqual(['request rejected', 'request completed']);
    expect(lines[0]).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(testApp.logs()).not.toMatch(/ana@acme|B12345678|203\.0\.113\.77/);
  });

  it('an unknown route logs no URL: the pattern of a 404 is null', async () => {
    const response = await testApp.app.inject({
      method: 'GET',
      url: '/admin/customers?q=Acme',
      ...fromClient,
    });
    const lines = linesOf(String(response.headers['x-request-id']));

    expect(lines).toEqual([
      expect.objectContaining({ msg: 'request completed', route: null, statusCode: 404 }),
    ]);
    expect(testApp.logs()).not.toContain('/admin');
  });

  it('redacts personal fields if a line ever carries them', () => {
    testApp.app.log.info(
      {
        customer: { contactEmail: 'ana@acme.example', taxId: 'B12345678', companyName: 'Acme' },
        search: { q: 'Acme' },
      },
      'redaction probe',
    );
    testApp.app.log.info(
      { contactEmail: 'ana@acme.example', taxId: 'B12345678', companyName: 'Acme', q: 'Acme' },
      'redaction probe at the top level',
    );
    const probes = testApp
      .logs()
      .split('\n')
      .filter((line) => line.includes('redaction probe'));

    expect(probes).toHaveLength(2);
    for (const probe of probes) {
      expect(probe).not.toMatch(/ana@acme|B12345678|Acme/);
      expect(probe.match(/\[redacted\]/g)).toHaveLength(4);
    }
  });
});
