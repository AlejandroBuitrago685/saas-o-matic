import { describe, expect, it } from 'vitest';

import { healthResponseSchema } from './health.js';

describe('AC-48 GET /health response schema', () => {
  it('accepts { status: "ok" }', () => {
    expect(healthResponseSchema.parse({ status: 'ok' })).toEqual({ status: 'ok' });
  });

  it('rejects unknown fields so no internal detail can leak (RNF-SEC-10)', () => {
    const result = healthResponseSchema.safeParse({ status: 'ok', version: '1.2.3' });

    expect(result.success).toBe(false);
  });

  it('rejects any other status value', () => {
    expect(healthResponseSchema.safeParse({ status: 'degraded' }).success).toBe(false);
  });
});
