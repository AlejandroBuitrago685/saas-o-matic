import { describe, expect, it } from 'vitest';

import { roundHalfUpDivide, roundHalfUpDivideBig } from './round-half-up.js';

describe('D-10 / D-91 commercial rounding with integers only (RNF-04)', () => {
  it.each([
    [10, 5, 2],
    [34_425, 10, 3443], // exactly half → up
    [34_424, 10, 3442],
    [34_426, 10, 3443],
    [5, 10_000, 0],
    [5000, 10_000, 1], // the half of the smallest unit rounds up
    [0, 7, 0],
  ])('%i / %i → %i', (numerator, denominator, expected) => {
    expect(roundHalfUpDivide(numerator, denominator)).toEqual({ ok: true, value: expected });
  });

  it('stays exact at the edge of the safe integer range, where a float division would round', () => {
    const numerator = Number.MAX_SAFE_INTEGER; // 9 007 199 254 740 991 = 2 × 4 503 599 627 370 495 + 1

    expect(roundHalfUpDivide(numerator, 2)).toEqual({ ok: true, value: 4_503_599_627_370_496 });
  });

  it.each([
    ['a decimal numerator', 10.5, 1],
    ['a decimal denominator', 10, 1.5],
    ['an unsafe numerator', Number.MAX_SAFE_INTEGER + 1, 1],
    ['NaN', Number.NaN, 1],
  ])('rejects %s: only safe integers', (_case, numerator, denominator) => {
    expect(roundHalfUpDivide(numerator, denominator)).toEqual({ ok: false, error: 'NOT_A_SAFE_INTEGER' });
  });

  it.each([
    ['a negative numerator', -1, 10],
    ['a zero denominator', 10, 0],
    ['a negative denominator', 10, -2],
  ])('rejects %s: amounts are never negative', (_case, numerator, denominator) => {
    expect(roundHalfUpDivide(numerator, denominator)).toEqual({ ok: false, error: 'OUT_OF_RANGE' });
  });
});

describe('D-144 the same rounding with bigint, beyond the safe integer range', () => {
  it.each([
    [34_425n, 10n, 3443n],
    [34_424n, 10n, 3442n],
    [0n, 7n, 0n],
    // 2^64 + 1 halves up, where a float would already have lost the last unit.
    [18_446_744_073_709_551_617n, 2n, 9_223_372_036_854_775_809n],
  ])('%s / %s → %s', (numerator, denominator, expected) => {
    expect(roundHalfUpDivideBig(numerator, denominator)).toBe(expected);
  });
});
