/**
 * Reference answer of `open.er-api.com/v6/latest/EUR` on 2026-11-12 (02-reglas-negocio §4.1), the same the e2e tests
 * serve (`e2e/fixtures/exchange-rates.ts`). Unit tests never reach the real API.
 */
export const REFERENCE_UPDATED_AT = Date.UTC(2026, 10, 12, 0, 2, 31);

export const REFERENCE_RATES_PAYLOAD = {
  result: 'success',
  provider: 'https://www.exchangerate-api.com',
  base_code: 'EUR',
  time_last_update_utc: 'Thu, 12 Nov 2026 00:02:31 +0000',
  time_last_update_unix: REFERENCE_UPDATED_AT / 1000,
  rates: { EUR: 1, USD: 1.111287, GBP: 0.835919, CHF: 0.923315, JPY: 177.234212, MXN: 20.687802 },
} as const;

/** A `Response` of the exchange-rate API, as `fetch` would give it. */
export function ratesResponse(body: unknown = REFERENCE_RATES_PAYLOAD, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
