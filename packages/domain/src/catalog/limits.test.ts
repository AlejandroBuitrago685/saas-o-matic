import { describe, expect, it } from 'vitest';

import { CATALOG_LIMITS } from './limits.js';

describe('D-108 the limits GET /catalog publishes are domain constants (RF-20, ADR-001)', () => {
  it('are exactly the limits of the example in 04-contrato-api §3.1', () => {
    expect(CATALOG_LIMITS).toEqual({
      activeUsers: { min: 1, max: 10000 },
      storageGb: { min: 0, max: 100000 },
      apiCallsPerMonth: { min: 0, max: 1000000000 },
      companyName: { min: 2, max: 200 },
      contactEmail: { max: 254 },
      taxId: { min: 1, max: 32 },
      searchQuery: { max: 100 },
      pageSize: { default: 20, max: 100 },
    });
  });

  it('cannot be changed at runtime', () => {
    expect(Object.isFrozen(CATALOG_LIMITS)).toBe(true);
    expect(Object.isFrozen(CATALOG_LIMITS.activeUsers)).toBe(true);
  });
});
