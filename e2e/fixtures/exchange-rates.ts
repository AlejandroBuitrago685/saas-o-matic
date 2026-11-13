/**
 * Reference exchange rates of the tests (spec 02-reglas-negocio §4.1): the real answer of
 * `open.er-api.com/v6/latest/EUR` on 2026-11-12. The e2e tests always serve these, never the real API (RT-05).
 */
export const EXCHANGE_RATE_URL = 'https://open.er-api.com/v6/latest/EUR';

export const REFERENCE_RATES = {
  result: 'success',
  provider: 'https://www.exchangerate-api.com',
  base_code: 'EUR',
  time_last_update_utc: 'Thu, 12 Nov 2026 00:02:31 +0000',
  time_last_update_unix: Date.UTC(2026, 10, 12, 0, 2, 31) / 1000,
  rates: { EUR: 1, USD: 1.111287, GBP: 0.835919, CHF: 0.923315, JPY: 177.234212, MXN: 20.687802 },
} as const;
