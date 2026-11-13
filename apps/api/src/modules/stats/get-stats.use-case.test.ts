import { describe, expect, it } from 'vitest';

import { createGetStats } from './get-stats.use-case.js';
import type { StatsTotals } from './stats.types.js';

const reading = (totals: StatsTotals) => createGetStats({ totals: () => totals });

describe('AC-47 / D-26 getStats', () => {
  it('turns the totals into the metrics of the contract, in EUR', () => {
    expect(reading({ customersCount: 3, simulationsCount: 2, baseCentsSum: 24_800 })()).toEqual({
      customersCount: 3,
      simulationsCount: 2,
      averageBaseCents: 12_400,
      currency: 'EUR',
    });
  });

  it.each([
    ['a sum without simulations', { customersCount: 1, simulationsCount: 0, baseCentsSum: 100 }],
    ['a negative sum', { customersCount: 1, simulationsCount: 1, baseCentsSum: -1 }],
  ])('treats %s as damaged data: an error, a 500, never a made-up average', (_case, totals) => {
    expect(() => reading(totals)()).toThrow('The stored simulations give impossible totals');
  });
});
