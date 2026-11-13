import type { ExchangeRates } from './exchange-rates.parser';

/** Rates are current for 1 h after they were fetched, also after a reload (D-23, spec 05 §4.2). */
export const FRESH_FOR_MS = 60 * 60 * 1000;
/** After a failed refresh, saved rates are still used while they are less than 48 h old (`updatedAt`, D-23). */
export const USABLE_FOR_MS = 48 * 60 * 60 * 1000;
/** After a 429 there are no automatic attempts for 20 min: the provider blocks that long (spec 05 §4.2). */
export const RATE_LIMIT_COOLDOWN_MS = 20 * 60 * 1000;

export type RatesFailure = 'NETWORK' | 'TIMEOUT' | 'RATE_LIMITED' | 'HTTP' | 'INVALID_RESPONSE';

/** Validated rates and when this browser fetched them. */
export interface RatesSnapshot {
  readonly rates: ExchangeRates;
  readonly fetchedAt: number;
}

/** The five states of spec 05 §4.4 (06-frontend §4). */
export type RatesState =
  | { readonly status: 'loading' }
  | { readonly status: 'fresh'; readonly snapshot: RatesSnapshot }
  | { readonly status: 'refreshing'; readonly snapshot: RatesSnapshot }
  | { readonly status: 'stale'; readonly snapshot: RatesSnapshot; readonly failure: RatesFailure }
  | { readonly status: 'error'; readonly failure: RatesFailure };

export type RatesEvent =
  /** The application starts with what the cache held and whether a 429 still blocks automatic attempts. */
  | { readonly type: 'started'; readonly cached: RatesSnapshot | undefined; readonly isRateLimited: boolean }
  /** A request leaves: «Reintentar» or an automatic refresh. */
  | { readonly type: 'requested' }
  | { readonly type: 'succeeded'; readonly snapshot: RatesSnapshot }
  | { readonly type: 'failed'; readonly failure: RatesFailure };

export function isFresh(snapshot: RatesSnapshot, now: number): boolean {
  return now - snapshot.fetchedAt < FRESH_FOR_MS;
}

function usable(snapshot: RatesSnapshot | undefined, now: number): RatesSnapshot | undefined {
  return snapshot !== undefined && now - snapshot.rates.updatedAt < USABLE_FOR_MS ? snapshot : undefined;
}

/** The rates a state holds, if any. */
export function snapshotOf(state: RatesState): RatesSnapshot | undefined {
  return state.status === 'loading' || state.status === 'error' ? undefined : state.snapshot;
}

/** A request is in flight in these two states, and only in them. */
export function isRequesting(state: RatesState): boolean {
  return state.status === 'loading' || state.status === 'refreshing';
}

function start(cached: RatesSnapshot | undefined, isRateLimited: boolean, now: number): RatesState {
  if (cached !== undefined && isFresh(cached, now)) return { status: 'fresh', snapshot: cached };
  const saved = usable(cached, now);
  if (isRateLimited)
    return saved === undefined
      ? { status: 'error', failure: 'RATE_LIMITED' }
      : { status: 'stale', snapshot: saved, failure: 'RATE_LIMITED' };
  return saved === undefined ? { status: 'loading' } : { status: 'refreshing', snapshot: saved };
}

/**
 * Transitions of the rates (spec 05 §4.4), pure so they are tested without Angular and with any clock
 * (06-frontend §4). The fallback never hides the error: a failure with usable saved rates is «stale», not «fresh».
 */
export function nextRatesState(state: RatesState, event: RatesEvent, now: number): RatesState {
  switch (event.type) {
    case 'started':
      return start(event.cached, event.isRateLimited, now);
    case 'requested': {
      const saved = usable(snapshotOf(state), now);
      return saved === undefined ? { status: 'loading' } : { status: 'refreshing', snapshot: saved };
    }
    case 'succeeded':
      return { status: 'fresh', snapshot: event.snapshot };
    case 'failed': {
      const saved = usable(snapshotOf(state), now);
      return saved === undefined
        ? { status: 'error', failure: event.failure }
        : { status: 'stale', snapshot: saved, failure: event.failure };
    }
  }
}
