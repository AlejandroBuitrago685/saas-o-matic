import { isRecord, parseExchangeRates } from './exchange-rates.parser';
import type { RatesStorage } from './rates-environment';
import { RATE_LIMIT_COOLDOWN_MS, type RatesSnapshot } from './rates-state';

/** Versioned keys: a change of format only needs a new version, and an old entry is simply ignored. */
export const RATES_CACHE_KEY = 'saas-o-matic.exchange-rates.v1';
export const RATE_LIMITED_UNTIL_KEY = 'saas-o-matic.exchange-rates.rate-limited-until.v1';

function readItem(storage: RatesStorage | undefined, key: string): unknown {
  try {
    const text = storage?.getItem(key) ?? null;
    return text === null ? undefined : (JSON.parse(text) as unknown);
  } catch {
    return undefined; // Unreadable storage or corrupt JSON: as if there were no cache (D-146).
  }
}

function writeItem(storage: RatesStorage | undefined, key: string, value: unknown): void {
  try {
    storage?.setItem(key, JSON.stringify(value));
  } catch {
    // Full or denied storage: the rates in memory are still used; only the next reload asks again (D-146).
  }
}

function isTimeUpTo(value: unknown, latest: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= latest;
}

/**
 * The saved rates, or nothing. Storage is not trusted (D-146): the raw answer is validated again with the same
 * parser as a fresh one, and a `fetchedAt` or an `updatedAt` in the future (which would keep it «current» or
 * «usable» forever) is rejected.
 */
export function readCachedRates(storage: RatesStorage | undefined, now: number): RatesSnapshot | undefined {
  const entry = readItem(storage, RATES_CACHE_KEY);
  if (!isRecord(entry)) return undefined;
  const { fetchedAt, payload } = entry;
  if (!isTimeUpTo(fetchedAt, now)) return undefined;
  const rates = parseExchangeRates(payload);
  // Rates «updated» in the future would never reach the 48 h limit.
  return rates.ok && rates.value.updatedAt <= now ? { rates: rates.value, fetchedAt } : undefined;
}

/** Saves the answer as it came, so reading it back goes through the parser again. */
export function writeCachedRates(
  storage: RatesStorage | undefined,
  fetchedAt: number,
  payload: unknown,
): void {
  writeItem(storage, RATES_CACHE_KEY, { fetchedAt, payload });
}

/** Whether a 429 still blocks automatic attempts. An end further away than the 20 min is not believed. */
export function isRateLimited(storage: RatesStorage | undefined, now: number): boolean {
  const until = readItem(storage, RATE_LIMITED_UNTIL_KEY);
  return isTimeUpTo(until, now + RATE_LIMIT_COOLDOWN_MS) && until > now;
}

/** After a 429, kept across reloads so a reload cannot skip the provider's block (D-146). */
export function saveRateLimit(storage: RatesStorage | undefined, now: number): void {
  writeItem(storage, RATE_LIMITED_UNTIL_KEY, now + RATE_LIMIT_COOLDOWN_MS);
}
