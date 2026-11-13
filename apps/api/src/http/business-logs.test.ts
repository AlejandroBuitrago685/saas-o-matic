import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { customerBody, simulationBody } from '../../test/api-helpers.js';
import { buildApiTestApp, type TestApp } from '../../test/build-test-app.js';

const CLIENT_IP = '203.0.113.77';
const PERSONAL_DATA = /Acme|Ibérica|Iberica|compras@|B12345674|12345678A|203\.0\.113\.77/;

let testApp: TestApp;
let statuses: number[];

afterAll(async () => {
  await testApp.close();
});

const fromClient = {
  remoteAddress: '172.18.0.3',
  headers: { 'x-forwarded-for': `${CLIENT_IP}, 172.18.0.1` },
};

const send = (method: 'GET' | 'POST', url: string, payload: object = {}) =>
  testApp.app.inject({ method, url, ...(method === 'POST' ? { payload } : {}), ...fromClient });

interface LogLine {
  readonly msg: string;
  readonly [field: string]: unknown;
}

/** One scenario, run once: every test reads the same log, so no test depends on another one having run. */
async function runScenario(): Promise<number[]> {
  const created = await send('POST', '/customers', customerBody());
  const customerId = created.json<{ id: string }>().id;
  await send('POST', '/customers', customerBody({ taxId: '12345678A' }));
  await send('POST', '/customers', customerBody());
  const simulated = await send('POST', '/simulations', simulationBody(customerId));
  await send('GET', `/customers/${customerId}`);
  await send('GET', `/customers/${customerId}/simulations`);
  const searched = await send('GET', '/customers?q=Acme');
  if (searched.json<{ page: { total: number } }>().page.total !== 1)
    throw new Error('The search found nothing');
  return [created.statusCode, simulated.statusCode];
}

beforeAll(async () => {
  testApp = await buildApiTestApp({ config: { trustProxy: ['172.18.0.0/16'] } });
  statuses = await runScenario();
});

const lines = (): LogLine[] =>
  testApp
    .logs()
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => JSON.parse(line) as LogLine);

describe('AC-54 / RNF-SEC-11 the logs of a create, a search and a simulation hold no personal data', () => {
  it('a customer, a business error, a duplicate, a simulation, a history and a search leave no name, email, tax id, q or IP', () => {
    expect(statuses).toEqual([201, 201]);
    expect(testApp.logs()).not.toMatch(PERSONAL_DATA);
  });

  it('records the business events with the id only (03-backend §6) and the route pattern of every request', () => {
    const events = lines().filter(({ msg }) => msg.endsWith('.created'));

    expect(events.map(({ msg }) => msg)).toEqual(['customer.created', 'simulation.created']);
    expect(events[0]).toMatchObject({ customerId: expect.stringMatching(/^[0-9a-f-]{36}$/) as string });
    expect(events[1]).toMatchObject({ simulationId: expect.stringMatching(/^[0-9a-f-]{36}$/) as string });
    const routes = lines()
      .filter(({ msg }) => msg === 'request completed')
      .map(({ route }) => route);
    expect(routes).toContain('/customers/:id');
    expect(routes).toContain('/customers/:id/simulations');
    expect(routes).toContain('/customers');
  });
});
