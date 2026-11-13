import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable, signal, type Signal } from '@angular/core';

import { isRateLimited, readCachedRates, saveRateLimit, writeCachedRates } from './exchange-rates.cache';
import { fetchExchangeRates } from './exchange-rates.client';
import { BROWSER_STORAGE, FETCH, NOW } from './rates-environment';
import { isFresh, isRequesting, nextRatesState, type RatesEvent, type RatesState } from './rates-state';

/**
 * State of the exchange rates (06-frontend §4, D-23, D-51): what the cache holds, one request at a time, and the
 * pure transitions of `nextRatesState`. Read by the header indicator whatever the selected currency, so an error is
 * visible in EUR too. There is no polling (spec 05 §4.2); a refresh happens on start, on «Reintentar» and when the
 * tab becomes visible again with expired rates (D-147).
 */
@Injectable({ providedIn: 'root' })
export class ExchangeRatesStore {
  private readonly now = inject(NOW);
  private readonly fetchFn = inject(FETCH);
  private readonly storage = inject(BROWSER_STORAGE);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  private readonly current = signal<RatesState>({ status: 'loading' });
  readonly state: Signal<RatesState> = this.current.asReadonly();
  private hasStarted = false;

  /** Once, when the application starts. It does not wait for the provider: EUR works from the first moment. */
  start(): Promise<void> {
    if (this.hasStarted) return Promise.resolve();
    this.hasStarted = true;
    const now = this.now();
    this.apply({
      type: 'started',
      cached: readCachedRates(this.storage, now),
      isRateLimited: isRateLimited(this.storage, now),
    });
    const onVisibilityChange = (): void => {
      if (this.document.visibilityState === 'visible') void this.refreshIfExpired();
    };
    this.document.addEventListener('visibilitychange', onVisibilityChange);
    this.destroyRef.onDestroy(() => {
      this.document.removeEventListener('visibilitychange', onVisibilityChange);
    });
    return isRequesting(this.current()) ? this.fetch() : Promise.resolve();
  }

  /** «Reintentar»: always asks the provider, even within the 20 min after a 429 (spec 05 §4.4). */
  retry(): Promise<void> {
    return isRequesting(this.current()) ? Promise.resolve() : this.request();
  }

  /**
   * Automatic refresh (D-147): current rates that have expired, or stale ones, when the tab becomes visible again.
   * Within the block of a 429 nothing is asked, but the state is still re-evaluated, so rates older than 48 h stop
   * being used in a tab left open for days. An error already shows «Reintentar», so it is left to the user.
   */
  refreshIfExpired(): Promise<void> {
    const state = this.current();
    const now = this.now();
    const isDue = state.status === 'stale' || (state.status === 'fresh' && !isFresh(state.snapshot, now));
    if (!isDue) return Promise.resolve();
    if (isRateLimited(this.storage, now)) {
      this.apply({ type: 'failed', failure: 'RATE_LIMITED' });
      return Promise.resolve();
    }
    return this.request();
  }

  private request(): Promise<void> {
    this.apply({ type: 'requested' });
    return this.fetch();
  }

  private async fetch(): Promise<void> {
    const result = await fetchExchangeRates(this.fetchFn);
    const now = this.now();
    if (result.ok) {
      writeCachedRates(this.storage, now, result.value.payload);
      this.apply({ type: 'succeeded', snapshot: { rates: result.value.rates, fetchedAt: now } });
      return;
    }
    if (result.error === 'RATE_LIMITED') saveRateLimit(this.storage, now);
    this.apply({ type: 'failed', failure: result.error });
  }

  private apply(event: RatesEvent): void {
    this.current.update((state) => nextRatesState(state, event, this.now()));
  }
}
