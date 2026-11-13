import { readFileSync } from 'node:fs';

import { API_ROUTES } from '@saas-o-matic/contract';
import { describe, expect, it } from 'vitest';

import { openApiDocument } from '../scripts/openapi-document.js';

const VERSIONED = new URL('../openapi.json', import.meta.url);

interface Operation {
  readonly responses: Record<string, { readonly content?: Record<string, unknown> }>;
}
interface OpenApi {
  readonly paths: Record<string, Record<string, Operation>>;
}

/** Errors are `application/problem+json`; the 503 of `/health` is its own body, not a problem (AC-48). */
const mediaTypeOf = (status: string): string =>
  Number(status) >= 400 && status !== '503' ? 'application/problem+json' : 'application/json';

/** Fastify's `:id` is OpenAPI's `{id}`. */
const openApiPath = (url: string): string => url.replace(/:(\w+)/g, '{$1}');

const documented = async (): Promise<OpenApi> => JSON.parse(await openApiDocument()) as OpenApi;

/**
 * The statuses each operation documents (04-contrato-api §2.3 and §3): the success, the errors of the schema (400), of
 * the body (413, 415), of the business rules (422), of the resource (404), of the duplicates (409), the limit (429)
 * and the generic 500. `GET /stats` is a Could of P10 and is not registered yet.
 */
const STATUSES: Readonly<Record<string, readonly number[]>> = {
  'GET /catalog': [200, 400, 429, 500],
  'GET /health': [200, 400, 429, 500, 503],
  'POST /customers': [201, 400, 409, 413, 415, 422, 429, 500],
  'GET /customers': [200, 400, 429, 500],
  'GET /customers/:id': [200, 400, 404, 429, 500],
  'GET /customers/:id/simulations': [200, 400, 404, 429, 500],
  'POST /simulations': [201, 400, 413, 415, 422, 429, 500],
  'GET /simulations/:id': [200, 400, 404, 429, 500],
};

describe('D-110 the versioned OpenAPI document matches the schemas', () => {
  it('apps/api/openapi.json is up to date (regenerate it with `npm run openapi`)', async () => {
    const generated = await openApiDocument();

    expect(readFileSync(VERSIONED, 'utf8')).toBe(generated);
  });

  it('documents the routes of the contract that are registered, and nothing else', async () => {
    const { paths } = await documented();

    const expected = API_ROUTES.filter(({ method, url }) => `${method} ${url}` in STATUSES)
      .map(({ method, url }) => `${method.toLowerCase()} ${openApiPath(url)}`)
      .sort();
    const actual = Object.entries(paths)
      .flatMap(([path, operations]) => Object.keys(operations).map((method) => `${method} ${path}`))
      .sort();
    expect(actual).toEqual(expected);
    expect(Object.keys(STATUSES)).toHaveLength(expected.length);
  });
});

describe('RNF-SEC-17 every operation documents the responses the contract gives it, the errors as problem+json', () => {
  it.each(Object.entries(STATUSES))('%s', async (route, statuses) => {
    const [method = '', url = ''] = route.split(' ');
    const { paths } = await documented();

    const responses = paths[openApiPath(url)]?.[method.toLowerCase()]?.responses ?? {};

    expect(Object.keys(responses).map(Number).sort()).toEqual([...statuses].sort());
    for (const [status, response] of Object.entries(responses)) {
      expect(Object.keys(response.content ?? {}), `${route} ${status}`).toEqual([mediaTypeOf(status)]);
    }
  });
});
