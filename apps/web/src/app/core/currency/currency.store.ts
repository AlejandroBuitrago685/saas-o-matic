import { computed, inject, Injectable, signal, type Signal } from '@angular/core';
import {
  type ConversionTarget,
  type ConvertedPricing,
  type ConvertibleAmounts,
  convertPricing,
  type Currency,
  CURRENCIES,
  EUR_TARGET,
} from '@saas-o-matic/domain';

import { ExchangeRatesStore } from './exchange-rates.store';
import { snapshotOf } from './rates-state';

/** Amounts ready to show: in the effective currency, and with the date of the rates when they are approximate. */
export interface DisplayAmounts {
  readonly pricing: ConvertedPricing;
  /** When the provider updated the rates used; only outside EUR, where amounts are approximate (D-19). */
  readonly ratesUpdatedAt: number | undefined;
}

/**
 * Selected currency (06-frontend §3, spec 05 §4.1). The user's choice is kept (D-143): the **effective** currency is
 * that choice while it has a valid rate, and EUR otherwise. So the amounts fall back to EUR without rates, and come
 * back to the last currency chosen as soon as there are rates again (CL-33, AC-88).
 */
@Injectable({ providedIn: 'root' })
export class CurrencyStore {
  private readonly ratesStore = inject(ExchangeRatesStore);
  private readonly chosenCurrency = signal<Currency>('EUR');
  /** The currency the user chose last, whether or not it can be shown now. */
  readonly chosen: Signal<Currency> = this.chosenCurrency.asReadonly();

  private readonly rates = computed(() => snapshotOf(this.ratesStore.state())?.rates);

  /** EUR always (it needs no rate); any other currency only with a valid rate (spec 05 §4.3 and §4.4). */
  readonly available: Signal<readonly Currency[]> = computed(() => {
    const rates = this.rates()?.rates ?? {};
    return CURRENCIES.filter((currency) => currency === 'EUR' || rates[currency] !== undefined);
  });

  readonly effective: Signal<Currency> = computed(() => {
    const chosen = this.chosen();
    return this.available().includes(chosen) ? chosen : 'EUR';
  });

  private readonly target: Signal<ConversionTarget> = computed(() => {
    const currency = this.effective();
    const rate = currency === 'EUR' ? undefined : this.rates()?.rates[currency];
    return currency === 'EUR' || rate === undefined ? EUR_TARGET : { currency, rate };
  });

  select(currency: Currency): void {
    this.chosenCurrency.set(currency);
  }

  /**
   * The amounts in the effective currency with the rule of every view (D-20). Reactive: read inside a `computed`, it
   * follows both the currency and the rates. If a rate, valid but absurd, takes an amount out of the safe range, the
   * amounts stay in EUR: the provider never leaves a view without amounts. Undefined only if EUR itself is out of
   * range (D-91).
   */
  convert(amounts: ConvertibleAmounts): DisplayAmounts | undefined {
    const target = this.target();
    const converted = convertPricing(amounts, target);
    if (converted.ok && target.currency !== 'EUR')
      return { pricing: converted.value, ratesUpdatedAt: this.rates()?.updatedAt };
    const inEuros = convertPricing(amounts, EUR_TARGET);
    return inEuros.ok ? { pricing: inEuros.value, ratesUpdatedAt: undefined } : undefined;
  }
}
