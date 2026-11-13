import { readFileSync } from 'node:fs';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildTestApp, type TestApp } from '../../../test/build-test-app.js';

const CONTRACT = new URL('../../../../../ai-workspace/02-especificacion/04-contrato-api.md', import.meta.url);

/** The JSON example of §3.1 of the contract, read from the document itself so both cannot drift apart. */
function contractExample(): unknown {
  const text = readFileSync(CONTRACT, 'utf8');
  const section = text.slice(text.indexOf('### 3.1'), text.indexOf('### 3.2'));
  const json = /```json\n([\s\S]*?)\n```/.exec(section)?.[1];
  if (json === undefined) throw new Error('The catalog example is missing from 04-contrato-api.md §3.1');
  return JSON.parse(json);
}

let testApp: TestApp;

beforeAll(async () => {
  testApp = await buildTestApp();
});

afterAll(async () => {
  await testApp.close();
});

describe('AC-34 GET /catalog', () => {
  it('answers exactly the example of the contract, cacheable for five minutes', async () => {
    const response = await testApp.app.inject({ method: 'GET', url: '/catalog' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(contractExample());
    expect(response.headers['cache-control']).toBe('max-age=300');
  });

  it('rejects any query parameter with 400 UNKNOWN_FIELD', async () => {
    const response = await testApp.app.inject({ method: 'GET', url: '/catalog?lang=es' });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      code: 'VALIDATION_ERROR',
      errors: [{ location: 'query', pointer: '/lang', code: 'UNKNOWN_FIELD' }],
    });
  });
});
