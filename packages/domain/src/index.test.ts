import { describe, expect, it } from 'vitest';

import * as domain from './index.js';

describe('ADR-001 public API of the domain: only what other packages need', () => {
  it('exports the functions and constants of P1, and nothing internal', () => {
    expect(Object.keys(domain).sort()).toEqual(
      [
        'COUNTRIES',
        'MAX_ACTIVE_USERS',
        'MAX_COMPANY_NAME_LENGTH',
        'MAX_SLIDER_POSITION',
        'MAX_TAX_RATE_BPS',
        'MIN_ACTIVE_USERS',
        'MIN_COMPANY_NAME_LENGTH',
        'MIN_SLIDER_POSITION',
        'MIN_TAX_RATE_BPS',
        'PLANS',
        'TAX_ID_TYPES',
        'calculatePricing',
        'err',
        'normalizeCompanyName',
        'normalizeForSearch',
        'ok',
        'positionToUsers',
        'tariffForPlan',
        'taxRateFor',
        'usersToPosition',
        'validateCatalog',
        'validateTariff',
      ].sort(),
    );
  });
});
