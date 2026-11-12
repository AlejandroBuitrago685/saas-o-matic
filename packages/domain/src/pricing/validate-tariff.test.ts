import { describe, expect, it } from 'vitest';

import { STANDARD_TARIFF } from '../../test/vectors/pricing.vectors.js';
import { validateTariff, type TariffInput } from './validate-tariff.js';

const tariff = (tiers: TariffInput['tiers']): TariffInput => ({ code: 'BROKEN', tiers });

function issuesOf(input: TariffInput): string[] {
  const result = validateTariff(input);
  return result.ok ? [] : result.error.map((issue) => `${issue.path}: ${issue.message}`);
}

describe('AC-07 an invalid tariff is rejected with the datum that fails (RNF-SEC-12, RNF-25)', () => {
  it('accepts the STANDARD tariff of the statement', () => {
    expect(validateTariff(STANDARD_TARIFF).ok).toBe(true);
  });

  it.each([
    [
      'does not start at user 1',
      tariff([{ tier: 1, fromUser: 2, toUser: null, unitPriceCents: 1000 }]),
      'tariffs[BROKEN].tiers[0].fromUser: must be 1 (the first tier starts at user 1)',
    ],
    [
      'has a gap between tiers',
      tariff([
        { tier: 1, fromUser: 1, toUser: 10, unitPriceCents: 1000 },
        { tier: 2, fromUser: 12, toUser: null, unitPriceCents: 800 },
      ]),
      'tariffs[BROKEN].tiers[1].fromUser: must be 11 (contiguous with the previous tier)',
    ],
    [
      'has an open tier before the last one',
      tariff([
        { tier: 1, fromUser: 1, toUser: null, unitPriceCents: 1000 },
        { tier: 2, fromUser: 11, toUser: null, unitPriceCents: 800 },
      ]),
      'tariffs[BROKEN].tiers[0].toUser: only the last tier can be open (null)',
    ],
    [
      'closes the last tier',
      tariff([{ tier: 1, fromUser: 1, toUser: 10, unitPriceCents: 1000 }]),
      'tariffs[BROKEN].tiers[0].toUser: the last tier must be open (null)',
    ],
    [
      'has a decimal price',
      tariff([{ tier: 1, fromUser: 1, toUser: null, unitPriceCents: 999.5 }]),
      'tariffs[BROKEN].tiers[0].unitPriceCents: must be an integer > 0 (cents, D-98)',
    ],
    [
      'has a negative price',
      tariff([{ tier: 1, fromUser: 1, toUser: null, unitPriceCents: -1 }]),
      'tariffs[BROKEN].tiers[0].unitPriceCents: must be an integer > 0 (cents, D-98)',
    ],
    [
      'has a free tier (D-98: prices must be > 0 in this delivery, PN-05)',
      tariff([
        { tier: 1, fromUser: 1, toUser: 10, unitPriceCents: 1000 },
        { tier: 2, fromUser: 11, toUser: null, unitPriceCents: 0 },
      ]),
      'tariffs[BROKEN].tiers[1].unitPriceCents: must be an integer > 0 (cents, D-98)',
    ],
    [
      'ends a tier before it starts',
      tariff([
        { tier: 1, fromUser: 1, toUser: 0, unitPriceCents: 1000 },
        { tier: 2, fromUser: 1, toUser: null, unitPriceCents: 800 },
      ]),
      'tariffs[BROKEN].tiers[0].toUser: must be an integer ≥ fromUser',
    ],
    [
      'numbers its tiers out of order',
      tariff([{ tier: 2, fromUser: 1, toUser: null, unitPriceCents: 1000 }]),
      'tariffs[BROKEN].tiers[0].tier: must be 1 (tiers are numbered in order)',
    ],
    ['has no tiers', tariff([]), 'tariffs[BROKEN].tiers: must have at least one tier'],
  ])('rejects a tariff that %s', (_case, input, issue) => {
    expect(issuesOf(input)).toContain(issue);
  });

  it('reports every problem at once, not only the first', () => {
    const input = tariff([
      { tier: 1, fromUser: 2, toUser: 10, unitPriceCents: -5 },
      { tier: 2, fromUser: 12, toUser: 20, unitPriceCents: 800 },
    ]);

    expect(issuesOf(input)).toHaveLength(4);
  });
});
