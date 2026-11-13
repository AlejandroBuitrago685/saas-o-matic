import { describe, expect, it } from 'vitest';

import type { ForeignCurrency } from './currencies.js';
import { convertAmount, convertPricing, EUR_TARGET, type ForeignTarget } from './convert-pricing.js';
import { toExchangeRate } from './exchange-rate.js';

/** Reference rates of the tests (02-reglas-negocio §4.1): the real answer of the provider on 2026-11-12. */
const REFERENCE_RATES: Readonly<Record<ForeignCurrency, number>> = {
  USD: 1.111287,
  GBP: 0.835919,
  CHF: 0.923315,
  JPY: 177.234212,
  MXN: 20.687802,
};

function target(currency: ForeignCurrency, value = REFERENCE_RATES[currency]): ForeignTarget {
  const rate = toExchangeRate(value);
  if (!rate.ok) throw new Error(`test rate is invalid: ${String(value)}`);
  return { currency, rate: rate.value };
}

/** 15 users, ES (02-reglas §6.5): tier 1 = 100,00 €, tier 2 = 40,00 €, tax = 29,40 €. */
const FIFTEEN_USERS_ES = { tiers: [{ subtotalCents: 10_000 }, { subtotalCents: 4000 }], taxCents: 2940 };

describe('D-20 conversion of the leaf items (02-reglas §4, AC-79)', () => {
  it.each([
    {
      id: 'TV-FX-01',
      currency: 'USD',
      tierSubtotals: [11_113, 4445],
      base: 15_558,
      tax: 3267,
      total: 18_825,
    },
    { id: 'TV-FX-02', currency: 'GBP', tierSubtotals: [8359, 3344], base: 11_703, tax: 2458, total: 14_161 },
    { id: 'TV-FX-03', currency: 'CHF', tierSubtotals: [9233, 3693], base: 12_926, tax: 2715, total: 15_641 },
    {
      id: 'TV-FX-04',
      currency: 'JPY',
      tierSubtotals: [17_723, 7089],
      base: 24_812,
      tax: 5211,
      total: 30_023,
    },
    {
      id: 'TV-FX-05',
      currency: 'MXN',
      tierSubtotals: [206_878, 82_751],
      base: 289_629,
      tax: 60_822,
      total: 350_451,
    },
  ] as const)(
    '$id: 15 users in $currency → base $base, tax $tax, total $total (minor units)',
    ({ currency, tierSubtotals, base, tax, total }) => {
      expect(convertPricing(FIFTEEN_USERS_ES, target(currency))).toEqual({
        ok: true,
        value: { currency, tierSubtotals, base, tax, total },
      });
    },
  );

  it('TV-FX-06: in EUR nothing is converted (02-reglas §4, step 4)', () => {
    expect(convertPricing(FIFTEEN_USERS_ES, EUR_TARGET)).toEqual({
      ok: true,
      value: { currency: 'EUR', tierSubtotals: [10_000, 4000], base: 14_000, tax: 2940, total: 16_940 },
    });
  });

  it('TV-FX-02 / TV-FX-04, CL-55: converting the total or the base directly would not add up', () => {
    expect(convertAmount(16_940, target('GBP'))).toEqual({ ok: true, value: 14_160 }); // the breakdown gives 141,61
    expect(convertAmount(14_000, target('JPY'))).toEqual({ ok: true, value: 24_813 }); // the breakdown gives 24 812
  });
});

describe('D-144 exact arithmetic of a conversion (D-10, D-91)', () => {
  it.each([
    { case: 'half a cent rounds up', cents: 1, currency: 'USD', rate: 0.5, expected: 1 },
    { case: 'one and a half cents round up', cents: 3, currency: 'USD', rate: 0.5, expected: 2 },
    { case: 'just below half rounds down', cents: 1, currency: 'USD', rate: 0.499_999, expected: 0 },
    { case: 'half a yen rounds up (no decimals, CL-34)', cents: 50, currency: 'JPY', rate: 1, expected: 1 },
    // 100 × 1.005 is 100.49999999999999 in floating point: Math.round would give 100.
    { case: 'an inexact product in floating point', cents: 100, currency: 'USD', rate: 1.005, expected: 101 },
    { case: 'an integer rate', cents: 100, currency: 'JPY', rate: 177, expected: 177 },
    { case: 'a rate in exponential notation', cents: 10_000_000, currency: 'USD', rate: 1e-7, expected: 1 },
    { case: 'zero', cents: 0, currency: 'GBP', rate: 0.835919, expected: 0 },
  ] as const)('$case: $cents cents × $rate → $expected', ({ cents, currency, rate, expected }) => {
    expect(convertAmount(cents, target(currency, rate))).toEqual({ ok: true, value: expected });
  });

  it.each([
    ['a negative amount', -1],
    ['a decimal amount', 1.5],
    ['an unsafe amount', Number.MAX_SAFE_INTEGER + 1],
    ['NaN', Number.NaN],
  ])('rejects %s, in EUR as well', (_case, cents) => {
    expect(convertAmount(cents, target('USD'))).toEqual({ ok: false, error: 'INVALID_AMOUNT' });
    expect(convertAmount(cents, EUR_TARGET)).toEqual({ ok: false, error: 'INVALID_AMOUNT' });
  });

  it.each([
    ['twice the largest safe amount', Number.MAX_SAFE_INTEGER, 2],
    ['a rate in exponential notation (1e+21)', 10_000, 1e21],
  ])('rejects a converted amount outside the safe integer range: %s', (_case, cents, rate) => {
    expect(convertAmount(cents, target('USD', rate))).toEqual({
      ok: false,
      error: 'AMOUNT_OUT_OF_RANGE',
    });
  });

  it('rejects a pricing whose converted base or total leaves the safe integer range', () => {
    const half = Math.ceil(Number.MAX_SAFE_INTEGER / 2);
    const unsafeBase = { tiers: [{ subtotalCents: half }, { subtotalCents: half }], taxCents: 0 };
    const unsafeTotal = { tiers: [{ subtotalCents: half }], taxCents: half };

    expect(convertPricing(unsafeBase, target('USD', 1))).toEqual({ ok: false, error: 'AMOUNT_OUT_OF_RANGE' });
    expect(convertPricing(unsafeTotal, EUR_TARGET)).toEqual({ ok: false, error: 'AMOUNT_OUT_OF_RANGE' });
  });

  it('passes on the failure of a leaf item: a tier or the tax', () => {
    const badTier = { tiers: [{ subtotalCents: -1 }], taxCents: 0 };
    const badTax = { tiers: [{ subtotalCents: 1 }], taxCents: 1.5 };

    expect(convertPricing(badTier, target('GBP'))).toEqual({ ok: false, error: 'INVALID_AMOUNT' });
    expect(convertPricing(badTax, target('GBP'))).toEqual({ ok: false, error: 'INVALID_AMOUNT' });
  });
});
