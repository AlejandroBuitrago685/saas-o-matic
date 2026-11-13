import { describe, expect, it } from 'vitest';

import { healthResponseSchema, healthUnavailableResponseSchema } from './health.js';

describe('RNF-24 GET /health response schemas', () => {
  it('accepts { status: "ok" } and { status: "unavailable" }', () => {
    expect(healthResponseSchema.parse({ status: 'ok' })).toEqual({ status: 'ok' });
    expect(healthUnavailableResponseSchema.parse({ status: 'unavailable' })).toEqual({
      status: 'unavailable',
    });
  });

  it('drops any undeclared field, so no internal detail reaches the response (RNF-SEC-10)', () => {
    expect(healthResponseSchema.parse({ status: 'ok', version: '1.2.3', error: 'SQLITE_BUSY' })).toEqual({
      status: 'ok',
    });
  });

  it('rejects any other status value', () => {
    expect(healthResponseSchema.safeParse({ status: 'degraded' }).success).toBe(false);
  });
});
