import { describe, expect, it } from 'vitest';

import {
  COUNTRY_TAX_BASE_CENTS,
  COUNTRY_TAX_VECTORS,
  ROUNDING_VECTORS,
} from '../../test/vectors/tax.vectors.js';
import { calculateTax } from './calculate-tax.js';

describe('AC-04 tax per country on the base (RF-09)', () => {
  it.each(COUNTRY_TAX_VECTORS)('$id: $country at $taxRateBps bps → tax $taxCents', (vector) => {
    const tax = calculateTax(COUNTRY_TAX_BASE_CENTS, vector.taxRateBps);

    expect(tax).toEqual({ ok: true, value: vector.taxCents });
    expect(COUNTRY_TAX_BASE_CENTS + vector.taxCents).toBe(vector.totalCents);
  });
});

describe('AC-05 commercial rounding of the tax, half up, without floating point (RNF-04)', () => {
  it.each(ROUNDING_VECTORS)('$id: $baseCents at $taxRateBps bps → $taxCents', (vector) => {
    expect(calculateTax(vector.baseCents, vector.taxRateBps)).toEqual({ ok: true, value: vector.taxCents });
  });

  it('TV-RD-01 is 3 443, not the 3 442 that banker’s rounding gives', () => {
    const tax = calculateTax(42_500, 810);

    expect(tax.ok && tax.value).toBe(3443);
  });
});

describe('D-10 tax inputs', () => {
  it.each([-1, 10_001, 2100.5, Number.NaN])(
    'rejects a rate outside 0–10 000 bps or not an integer: %d',
    (bps) => {
      expect(calculateTax(14_000, bps)).toEqual({ ok: false, error: 'INVALID_TAX_RATE' });
    },
  );

  it.each([-1, 0.5, Number.MAX_SAFE_INTEGER])(
    'rejects a base that is negative, decimal or too large: %d',
    (base) => {
      expect(calculateTax(base, 2100)).toEqual({ ok: false, error: 'INVALID_BASE' });
    },
  );

  it('accepts the 0 % and 100 % ends of the range', () => {
    expect(calculateTax(14_000, 0)).toEqual({ ok: true, value: 0 });
    expect(calculateTax(14_000, 10_000)).toEqual({ ok: true, value: 14_000 });
  });
});
