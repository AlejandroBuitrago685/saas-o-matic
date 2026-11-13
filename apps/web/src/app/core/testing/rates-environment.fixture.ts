import type { Provider } from '@angular/core';
import { vi } from 'vitest';

import { BROWSER_STORAGE, FETCH, NOW, type BrowserStorage } from '../currency/rates-environment';
import { ratesResponse, REFERENCE_UPDATED_AT } from './exchange-rates.fixture';

/** A controllable clock, a `fetch` that answers with the reference rates and a storage in memory. */
export interface RatesEnvironment {
  readonly clock: { now: number };
  readonly fetch: ReturnType<typeof vi.fn<typeof fetch>>;
  readonly storage: BrowserStorage & { readonly items: Map<string, string> };
  readonly providers: Provider[];
}

/** By default the clock is one minute after the provider updated the reference rates. */
export function ratesEnvironment(now = REFERENCE_UPDATED_AT + 60_000): RatesEnvironment {
  const clock = { now };
  const items = new Map<string, string>();
  const storage = {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
  };
  const fetchFn = vi.fn<typeof fetch>().mockImplementation(() => Promise.resolve(ratesResponse()));
  return {
    clock,
    fetch: fetchFn,
    storage,
    providers: [
      { provide: NOW, useValue: () => clock.now },
      { provide: FETCH, useValue: fetchFn },
      { provide: BROWSER_STORAGE, useValue: storage },
    ],
  };
}
