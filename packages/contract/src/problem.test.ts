import { describe, expect, it } from 'vitest';

import { codesOf, errorsOf } from '../test/errors-of.js';
import { API_ROUTES } from './routes.js';
import { PROBLEM_CODES, PROBLEMS } from './problem.js';
import { idParamsSchema, noQuerySchema } from './shared.js';

describe('RNF-SEC-10 error catalog of 04-contrato-api §2.2 (RFC 9457)', () => {
  it('has the nine codes of the contract with their status', () => {
    expect(Object.fromEntries(PROBLEM_CODES.map((code) => [code, PROBLEMS[code].status]))).toEqual({
      MALFORMED_JSON: 400,
      VALIDATION_ERROR: 400,
      NOT_FOUND: 404,
      CUSTOMER_ALREADY_EXISTS: 409,
      PAYLOAD_TOO_LARGE: 413,
      UNSUPPORTED_MEDIA_TYPE: 415,
      BUSINESS_RULE_VIOLATION: 422,
      RATE_LIMITED: 429,
      INTERNAL_ERROR: 500,
    });
  });

  it('gives every code a stable, distinct relative type URI', () => {
    const types = PROBLEM_CODES.map((code) => PROBLEMS[code].type);

    expect(new Set(types).size).toBe(types.length);
    expect(types.every((type) => /^\/problems\/[a-z-]+$/.test(type))).toBe(true);
  });
});

describe('RNF-SEC-17 closed inventory of the API', () => {
  it('lists exactly the endpoints of 04-contrato-api §3', () => {
    expect(API_ROUTES.map(({ method, url }) => `${method} ${url}`)).toEqual([
      'GET /catalog',
      'POST /customers',
      'GET /customers',
      'GET /customers/:id',
      'GET /customers/:id/simulations',
      'POST /simulations',
      'GET /simulations/:id',
      'GET /stats',
      'GET /health',
    ]);
  });
});

describe('RF-20 endpoints without parameters, and ids in the path', () => {
  it('rejects any query parameter where there are none (GET /catalog, GET /stats)', () => {
    expect(codesOf(errorsOf(noQuerySchema, { lang: 'es' }, 'query'))).toEqual(['/lang UNKNOWN_FIELD']);
  });

  it('rejects an id that is not a UUID as INVALID_FORMAT in the path', () => {
    expect(errorsOf(idParamsSchema, { id: '42' }, 'path')).toEqual([
      { location: 'path', pointer: '/id', code: 'INVALID_FORMAT' },
    ]);
  });
});
