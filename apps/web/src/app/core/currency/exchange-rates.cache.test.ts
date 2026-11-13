import { describe, expect, it } from 'vitest';

import { REFERENCE_RATES_PAYLOAD, REFERENCE_UPDATED_AT } from '../testing/exchange-rates.fixture';
import {
  isRateLimited,
  RATE_LIMITED_UNTIL_KEY,
  RATES_CACHE_KEY,
  readCachedRates,
  saveRateLimit,
  writeCachedRates,
} from './exchange-rates.cache';
import type { BrowserStorage } from './rates-environment';
import { RATE_LIMIT_COOLDOWN_MS } from './rates-state';

const NOW = REFERENCE_UPDATED_AT + 60_000;

function memoryStorage(
  initial: Record<string, string> = {},
): BrowserStorage & { items: Map<string, string> } {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
}

const throwing: BrowserStorage = {
  getItem: () => {
    throw new DOMException('denied', 'SecurityError');
  },
  setItem: () => {
    throw new DOMException('full', 'QuotaExceededError');
  },
};

describe('D-146 cache of the rates in localStorage (D-23)', () => {
  it('reads back what it wrote, validated again by the parser', () => {
    const storage = memoryStorage();
    writeCachedRates(storage, NOW, REFERENCE_RATES_PAYLOAD);

    const cached = readCachedRates(storage, NOW);

    expect(cached?.fetchedAt).toBe(NOW);
    expect(cached?.rates.updatedAt).toBe(REFERENCE_UPDATED_AT);
    expect(Object.keys(cached?.rates.rates ?? {})).toHaveLength(5);
  });

  it.each([
    ['nothing saved', {}],
    ['corrupt JSON', { [RATES_CACHE_KEY]: '{"fetchedAt":' }],
    ['a saved value that is not an object', { [RATES_CACHE_KEY]: '42' }],
    [
      'a payload tampered with (base USD)',
      {
        [RATES_CACHE_KEY]: JSON.stringify({
          fetchedAt: NOW,
          payload: { ...REFERENCE_RATES_PAYLOAD, base_code: 'USD' },
        }),
      },
    ],
    ['no fetchedAt', { [RATES_CACHE_KEY]: JSON.stringify({ payload: REFERENCE_RATES_PAYLOAD }) }],
    [
      'a fetchedAt in the future, which would stay current forever',
      { [RATES_CACHE_KEY]: JSON.stringify({ fetchedAt: NOW + 1, payload: REFERENCE_RATES_PAYLOAD }) },
    ],
    [
      'review P3: rates updated in the future, which would stay usable forever',
      {
        [RATES_CACHE_KEY]: JSON.stringify({
          fetchedAt: NOW,
          payload: { ...REFERENCE_RATES_PAYLOAD, time_last_update_unix: NOW / 1000 + 60 },
        }),
      },
    ],
  ])('treats %s as no cache', (_case, items) => {
    expect(readCachedRates(memoryStorage(items), NOW)).toBeUndefined();
  });

  it('works without storage, or with one that throws on every call', () => {
    expect(readCachedRates(undefined, NOW)).toBeUndefined();
    expect(readCachedRates(throwing, NOW)).toBeUndefined();
    expect(() => {
      writeCachedRates(throwing, NOW, REFERENCE_RATES_PAYLOAD);
      saveRateLimit(throwing, NOW);
    }).not.toThrow();
    expect(isRateLimited(throwing, NOW)).toBe(false);
  });
});

describe('D-146 the 20 min block of a 429 survives a reload (spec 05 §4.2)', () => {
  it('blocks automatic attempts until 20 min after the 429, and not one millisecond longer', () => {
    const storage = memoryStorage();
    saveRateLimit(storage, NOW);

    expect(isRateLimited(storage, NOW)).toBe(true);
    expect(isRateLimited(storage, NOW + RATE_LIMIT_COOLDOWN_MS - 1)).toBe(true);
    expect(isRateLimited(storage, NOW + RATE_LIMIT_COOLDOWN_MS)).toBe(false);
  });

  it.each([
    ['nothing saved', undefined],
    ['an end further away than 20 min', String(NOW + RATE_LIMIT_COOLDOWN_MS + 1)],
    ['text', '"soon"'],
  ])('does not block with %s', (_case, value) => {
    const storage = memoryStorage(value === undefined ? {} : { [RATE_LIMITED_UNTIL_KEY]: value });

    expect(isRateLimited(storage, NOW)).toBe(false);
  });
});
