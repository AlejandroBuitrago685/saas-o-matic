import { describe, expect, it } from 'vitest';

import { REFERENCE_RATES_PAYLOAD, REFERENCE_UPDATED_AT } from '../testing/exchange-rates.fixture';
import { parseExchangeRates } from './exchange-rates.parser';

function withField(field: string, value: unknown): Record<string, unknown> {
  return { ...REFERENCE_RATES_PAYLOAD, [field]: value };
}

function withRates(rates: Record<string, unknown>): Record<string, unknown> {
  return { ...REFERENCE_RATES_PAYLOAD, rates: { ...REFERENCE_RATES_PAYLOAD.rates, ...rates } };
}

describe('RNF-SEC-13 validation of the exchange-rate API answer (spec 05 §4.3, AC-80)', () => {
  it('accepts the reference answer and reads every offered currency as an exact decimal', () => {
    const parsed = parseExchangeRates(REFERENCE_RATES_PAYLOAD);

    expect(parsed).toEqual({
      ok: true,
      value: {
        updatedAt: REFERENCE_UPDATED_AT,
        rates: {
          USD: { digits: 1_111_287n, scale: 6 },
          GBP: { digits: 835_919n, scale: 6 },
          CHF: { digits: 923_315n, scale: 6 },
          JPY: { digits: 177_234_212n, scale: 6 },
          MXN: { digits: 20_687_802n, scale: 6 },
        },
      },
    });
  });

  it.each([
    ['CL-29: a 200 with "result": "error"', withField('result', 'error')],
    ['a missing result', withField('result', undefined)],
    ['base_code "USD"', withField('base_code', 'USD')],
    ['time_last_update_unix as text', withField('time_last_update_unix', '1762905751')],
    ['time_last_update_unix with decimals', withField('time_last_update_unix', 1_762_905_751.5)],
    ['time_last_update_unix = 0', withField('time_last_update_unix', 0)],
    ['a negative time_last_update_unix', withField('time_last_update_unix', -1)],
    ['rates that are not an object', withField('rates', [1, 2])],
    ['rates.EUR ≠ 1', withRates({ EUR: 1.01 })],
    ['rates without EUR', withRates({ EUR: undefined })],
    ['an answer that is not an object', 'success'],
    ['null', null],
    ['an array', [REFERENCE_RATES_PAYLOAD]],
  ])('discards the whole answer with %s', (_case, payload) => {
    expect(parseExchangeRates(payload)).toEqual({ ok: false, error: 'INVALID_RESPONSE' });
  });

  it.each([
    ['missing', undefined],
    ['zero', 0],
    ['negative', -0.83],
    ['text', '0.835919'],
    ['null', null],
  ])('CL-31: a GBP rate that is %s only leaves GBP out', (_case, gbp) => {
    const parsed = parseExchangeRates(withRates({ GBP: gbp }));

    expect(parsed.ok && Object.keys(parsed.value.rates).sort()).toEqual(['CHF', 'JPY', 'MXN', 'USD']);
  });

  it('ignores the fields it does not use and the currencies it does not offer', () => {
    const parsed = parseExchangeRates({
      ...withRates({ KWD: 0.33 }),
      documentation: 'x',
      extra: { nested: 1 },
    });

    expect(parsed.ok && Object.keys(parsed.value.rates).sort()).toEqual(['CHF', 'GBP', 'JPY', 'MXN', 'USD']);
  });
});
