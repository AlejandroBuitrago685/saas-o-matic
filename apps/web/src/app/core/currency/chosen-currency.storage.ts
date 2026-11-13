import { type Currency, isCurrency } from '@saas-o-matic/domain';

import type { BrowserStorage } from './rates-environment';

/** Versioned like the rates cache: a change of format only needs a new version. */
export const CHOSEN_CURRENCY_KEY = 'saas-o-matic.currency.v1';

/**
 * The currency chosen before the reload (spec 05 §4.1, Could), or EUR. Storage is not trusted (D-146): only a code
 * of the offered list counts, and a storage that throws is the same as an empty one.
 */
export function readChosenCurrency(storage: BrowserStorage | undefined): Currency {
  try {
    const saved = storage?.getItem(CHOSEN_CURRENCY_KEY) ?? null;
    return isCurrency(saved) ? saved : 'EUR';
  } catch {
    return 'EUR'; // Storage denied: the choice is simply not remembered.
  }
}

export function writeChosenCurrency(storage: BrowserStorage | undefined, currency: Currency): void {
  try {
    storage?.setItem(CHOSEN_CURRENCY_KEY, currency);
  } catch {
    // Full or denied storage: the choice still holds until the reload, which starts in EUR again (D-146).
  }
}
