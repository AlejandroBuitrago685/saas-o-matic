import { describe, expect, it } from 'vitest';

import { CURRENCIES, CURRENCY_DECIMALS, FOREIGN_CURRENCIES, isCurrency } from './currencies.js';
import { toExchangeRate } from './exchange-rate.js';

describe('D-21 currencies offered and their ISO 4217 decimals (02-reglas §4)', () => {
  it('offers EUR, USD, GBP, CHF, JPY and MXN, with two decimals except JPY (CL-34)', () => {
    expect(CURRENCIES).toEqual(['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'MXN']);
    expect(CURRENCY_DECIMALS).toEqual({ EUR: 2, USD: 2, GBP: 2, CHF: 2, JPY: 0, MXN: 2 });
    expect(FOREIGN_CURRENCIES).toEqual(['USD', 'GBP', 'CHF', 'JPY', 'MXN']);
  });

  it.each([
    ['EUR', true],
    ['JPY', true],
    ['KWD', false],
    ['eur', false],
    [1, false],
    [undefined, false],
  ])('isCurrency(%j) → %s', (value, expected) => {
    expect(isCurrency(value)).toBe(expected);
  });
});

describe('D-144 a rate as an exact decimal, from its shortest representation', () => {
  it.each([
    ['six decimals', 1.111287, { digits: 1_111_287n, scale: 6 }],
    ['an integer', 177, { digits: 177n, scale: 0 }],
    ['a small rate in exponential notation', 1.5e-7, { digits: 15n, scale: 8 }],
    ['a large rate in exponential notation', 1e21, { digits: 1_000_000_000_000_000_000_000n, scale: 0 }],
  ])('reads %s', (_case, value, expected) => {
    expect(toExchangeRate(value)).toEqual({ ok: true, value: expected });
  });

  it.each([
    ['zero', 0],
    ['a negative rate', -1.2],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
  ])('rejects %s (spec 05 §4.3: a finite number greater than 0)', (_case, value) => {
    expect(toExchangeRate(value)).toEqual({ ok: false, error: 'INVALID_RATE' });
  });
});
