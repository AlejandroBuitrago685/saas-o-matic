import { InjectionToken } from '@angular/core';

/** The browser's storage as the rates cache uses it: the part of `Storage` it needs. */
export type RatesStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Current time in ms. Injected so the unit tests of the rates control the clock (06-frontend §4). */
export const NOW = new InjectionToken<() => number>('NOW', {
  providedIn: 'root',
  factory: () => () => Date.now(),
});

/**
 * `fetch`, injected so unit tests answer for the exchange-rate API. Wrapped in an arrow: a bare `fetch` called as a
 * method of another object throws «Illegal invocation».
 */
export const FETCH = new InjectionToken<typeof fetch>('FETCH', {
  providedIn: 'root',
  factory: () => (input, init) => fetch(input, init),
});

/**
 * `localStorage`, or nothing when the browser denies it: reading the property itself throws in some private modes
 * and with storage blocked. Without storage the rates work the same, only without cache (D-146).
 */
export const RATES_STORAGE = new InjectionToken<RatesStorage | undefined>('RATES_STORAGE', {
  providedIn: 'root',
  factory: () => {
    try {
      return globalThis.localStorage;
    } catch {
      return undefined; // Storage denied by the browser: the cache is optional.
    }
  },
});
