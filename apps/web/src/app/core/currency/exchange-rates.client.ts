import { err, ok, type Result } from '@saas-o-matic/domain';

import { type ExchangeRates, parseExchangeRates } from './exchange-rates.parser';
import type { RatesFailure } from './rates-state';

/** Straight from the browser, never through our API (D-22); the CSP allows it in `connect-src` (ADR-012). */
export const EXCHANGE_RATES_URL = 'https://open.er-api.com/v6/latest/EUR';
export const REQUEST_TIMEOUT_MS = 5000;

/** A valid answer: the raw body (what the cache saves) and its validated form. */
export interface FetchedRates {
  readonly payload: unknown;
  readonly rates: ExchangeRates;
}

function isTimeout(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === 'TimeoutError';
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch (error: unknown) {
    // The 5 s limit also covers the body: that is a timeout. Anything else is a body that is not JSON, which the
    // validation turns into INVALID_RESPONSE.
    if (isTimeout(error)) throw error;
    return undefined;
  }
}

/**
 * One request for the rates (D-148): `fetch`, so none of the `/api` interceptors apply; 5 s at most (spec 05 §4.2);
 * no cookies and no referrer for a third party; no HTTP cache, because the 1 h cache is ours (D-23). Every outcome
 * is a value: the state machine decides what the user sees.
 */
export async function fetchExchangeRates(fetchFn: typeof fetch): Promise<Result<FetchedRates, RatesFailure>> {
  try {
    const response = await fetchFn(EXCHANGE_RATES_URL, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
    });
    if (response.status === 429) return err('RATE_LIMITED');
    if (!response.ok) return err('HTTP');
    const payload = await readJson(response);
    const rates = parseExchangeRates(payload);
    return rates.ok ? ok({ payload, rates: rates.value }) : err('INVALID_RESPONSE');
  } catch (error: unknown) {
    return err(isTimeout(error) ? 'TIMEOUT' : 'NETWORK');
  }
}
