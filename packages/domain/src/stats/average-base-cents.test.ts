import { describe, expect, it } from 'vitest';

import { averageBaseCents } from './average-base-cents.js';

const sum = (bases: readonly number[]): number => bases.reduce((total, base) => total + base, 0);

describe('RF-19 average simulated amount (02-reglas §5, D-26)', () => {
  it.each([
    ['TV-ST-01', [14_000, 10_800], 12_400],
    ['TV-ST-02', [1_000, 1_000, 10_800], 4_267],
    ['TV-ST-03', [], null],
  ] as const)('%s bases %j → %j', (_id, bases, expected) => {
    expect(averageBaseCents(sum(bases), bases.length)).toEqual({ ok: true, value: expected });
  });

  it('rounds an exact half up (D-10): 3 / 2 → 2', () => {
    expect(averageBaseCents(3, 2)).toEqual({ ok: true, value: 2 });
  });

  it.each([
    ['a negative sum', -1, 1],
    ['a negative count', 100, -1],
    ['a sum that is not an integer', 10.5, 1],
    ['a count that is not an integer', 100, 1.5],
    ['an unsafe sum', Number.MAX_SAFE_INTEGER + 1, 1],
    ['a sum without simulations', 100, 0],
  ])('rejects %s', (_case, sumCents, count) => {
    expect(averageBaseCents(sumCents, count)).toEqual({ ok: false, error: 'INVALID_TOTALS' });
  });
});
