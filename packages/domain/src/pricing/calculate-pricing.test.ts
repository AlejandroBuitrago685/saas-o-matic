import { describe, expect, it } from 'vitest';

import {
  ES_TAX_RATE_BPS,
  INVALID_USERS_VECTORS,
  PRICING_VECTORS,
  STANDARD_TARIFF,
} from '../../test/vectors/pricing.vectors.js';
import { calculatePricing, type Pricing } from './calculate-pricing.js';
import { MAX_ACTIVE_USERS, MIN_ACTIVE_USERS } from './active-users.js';
import { validateTariff, type TariffTierInput, type ValidTariff } from './validate-tariff.js';

function valid(tariff: Parameters<typeof validateTariff>[0]): ValidTariff {
  const result = validateTariff(tariff);
  if (!result.ok) throw new Error(`test tariff is invalid: ${JSON.stringify(result.error)}`);
  return result.value;
}

const standard = valid(STANDARD_TARIFF);

function priced(users: number, tariff: ValidTariff = standard, bps = ES_TAX_RATE_BPS): Pricing {
  const result = calculatePricing(tariff, users, bps);
  if (!result.ok) throw new Error(`pricing failed for ${String(users)} users: ${result.error}`);
  return result.value;
}

describe('AC-01 base, tax and total by tiers (RF-08, RF-09)', () => {
  it.each(PRICING_VECTORS)(
    '$id: $users users → base $baseCents, tax $taxCents, total $totalCents',
    (vector) => {
      const pricing = priced(vector.users);
      const expectedLines = vector.units
        .map((units, index) => ({ tier: index + 1, units }))
        .filter((line) => line.units > 0);

      expect(pricing.tiers.map(({ tier, units }) => ({ tier, units }))).toEqual(expectedLines);
      expect(pricing).toMatchObject({
        tariffCode: 'STANDARD',
        baseCents: vector.baseCents,
        taxRateBps: ES_TAX_RATE_BPS,
        taxCents: vector.taxCents,
        totalCents: vector.totalCents,
      });
    },
  );

  it('TV-PR-04: each line carries its tier range, unit price and subtotal', () => {
    expect(priced(15).tiers).toEqual([
      { tier: 1, fromUser: 1, toUser: 10, units: 10, unitPriceCents: 1000, subtotalCents: 10_000 },
      { tier: 2, fromUser: 11, toUser: 50, units: 5, unitPriceCents: 800, subtotalCents: 4000 },
    ]);
  });

  it('TV-PR-06: the open last tier keeps toUser null', () => {
    expect(priced(51).tiers[2]).toMatchObject({ tier: 3, fromUser: 51, toUser: null, units: 1 });
  });
});

describe('AC-02 cumulative pricing, not volume pricing (CL-11)', () => {
  it('TV-PR-04: 15 users cost 14 000 (10 × 1 000 + 5 × 800), not 12 000 (15 × 800)', () => {
    expect(priced(15).baseCents).toBe(14_000);
    expect(priced(15).baseCents).not.toBe(15 * 800);
  });
});

describe('AC-03 properties for every n from 2 to 10 000 (CL-10), exhaustive (D-90)', () => {
  const tierPriceOf = (n: number): number => (n <= 10 ? 1000 : n <= 50 ? 800 : 500);

  it('the cost of user n is the price of its tier, and the base always grows', () => {
    let previous = priced(MIN_ACTIVE_USERS).baseCents;
    for (let n = MIN_ACTIVE_USERS + 1; n <= MAX_ACTIVE_USERS; n += 1) {
      const current = priced(n).baseCents;

      expect(current - previous, `user ${String(n)}`).toBe(tierPriceOf(n));
      previous = current;
    }
  });
});

describe('AC-06 a plan changes the price only through data (RNF-25, D-08)', () => {
  it('an alternative tariff (1–5 at 2 000, from 6 at 1 000) gives 13 000 for 8 users with the same function', () => {
    const alternative = valid({
      code: 'ALTERNATIVE',
      tiers: [
        { tier: 1, fromUser: 1, toUser: 5, unitPriceCents: 2000 },
        { tier: 2, fromUser: 6, toUser: null, unitPriceCents: 1000 },
      ],
    });

    expect(priced(8, alternative)).toMatchObject({ tariffCode: 'ALTERNATIVE', baseCents: 13_000 });
  });
});

describe('D-93 invalid numbers of users reaching the domain (RF-08, D-04)', () => {
  it.each(INVALID_USERS_VECTORS)('$id: $users users → $error', (vector) => {
    expect(calculatePricing(standard, vector.users, ES_TAX_RATE_BPS)).toEqual({
      ok: false,
      error: vector.error,
    });
  });

  it('rejects NaN as INVALID_TYPE', () => {
    expect(calculatePricing(standard, Number.NaN, ES_TAX_RATE_BPS)).toEqual({
      ok: false,
      error: 'INVALID_TYPE',
    });
  });

  it('reports an invalid tax rate instead of a wrong total', () => {
    expect(calculatePricing(standard, 15, 10_001)).toEqual({ ok: false, error: 'INVALID_TAX_RATE' });
  });
});

describe('D-91 amounts never lose precision beyond 2⁵³', () => {
  const pricey = (unitPriceCents: number): ValidTariff =>
    valid({ code: 'PRICEY', tiers: [{ tier: 1, fromUser: 1, toUser: null, unitPriceCents }] });

  it('rejects a base that would exceed the safe integer range', () => {
    expect(calculatePricing(pricey(2 ** 50), 10, 0)).toEqual({ ok: false, error: 'AMOUNT_OUT_OF_RANGE' });
  });

  it('rejects a total that would exceed it even when the base and the tax fit (P1 review)', () => {
    // base = 9 007 000 000 010 000 (safe) · tax at 1 bps = 900 700 000 001 · total = 9 007 900 700 010 001 (unsafe)
    expect(calculatePricing(pricey(900_700_000_001), 10_000, 1)).toEqual({
      ok: false,
      error: 'AMOUNT_OUT_OF_RANGE',
    });
  });

  it('copies only the known tier fields into the result', () => {
    const withExtra = valid({
      code: 'EXTRA',
      tiers: [{ tier: 1, fromUser: 1, toUser: null, unitPriceCents: 100, secret: 'x' } as TariffTierInput],
    });
    const result = calculatePricing(withExtra, 1, 0);

    expect(result.ok && Object.keys(result.value.tiers[0] ?? {})).toEqual([
      'tier',
      'fromUser',
      'toUser',
      'units',
      'unitPriceCents',
      'subtotalCents',
    ]);
  });

  it('rejects a tax computation that would exceed it', () => {
    expect(calculatePricing(pricey(2 ** 40), 1, 10_000)).toEqual({ ok: false, error: 'AMOUNT_OUT_OF_RANGE' });
  });
});
