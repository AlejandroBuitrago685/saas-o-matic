import { describe, expect, it } from 'vitest';

import { CHOSEN_CURRENCY_KEY, readChosenCurrency, writeChosenCurrency } from './chosen-currency.storage';
import type { BrowserStorage } from './rates-environment';

function memoryStorage(initial?: string): BrowserStorage & { readonly items: Map<string, string> } {
  const items = new Map<string, string>(initial === undefined ? [] : [[CHOSEN_CURRENCY_KEY, initial]]);
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
    throw new Error('denied');
  },
  setItem: () => {
    throw new Error('full');
  },
};

describe('spec 05 §4.1 (Could) the chosen currency is remembered across reloads', () => {
  it('reads back the currency it saved', () => {
    const storage = memoryStorage();

    writeChosenCurrency(storage, 'JPY');

    expect(storage.items.get(CHOSEN_CURRENCY_KEY)).toBe('JPY');
    expect(readChosenCurrency(storage)).toBe('JPY');
  });

  it.each([
    ['nothing saved', undefined],
    ['a currency that is not offered', 'KWD'],
    ['a lowercase code', 'usd'],
    ['JSON instead of a code', '"USD"'],
  ])('EUR with %s (storage is not trusted, D-146)', (_case, saved) => {
    expect(readChosenCurrency(memoryStorage(saved))).toBe('EUR');
  });

  it('EUR without storage, and a storage that throws neither breaks reading nor writing', () => {
    expect(readChosenCurrency(undefined)).toBe('EUR');
    expect(readChosenCurrency(throwing)).toBe('EUR');
    expect(() => {
      writeChosenCurrency(throwing, 'USD');
    }).not.toThrow();
    expect(() => {
      writeChosenCurrency(undefined, 'USD');
    }).not.toThrow();
  });
});
