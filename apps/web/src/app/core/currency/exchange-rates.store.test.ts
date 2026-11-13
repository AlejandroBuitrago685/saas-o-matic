import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { ratesResponse, REFERENCE_RATES_PAYLOAD } from '../testing/exchange-rates.fixture';
import { ratesEnvironment, type RatesEnvironment } from '../testing/rates-environment.fixture';
import { RATES_CACHE_KEY, saveRateLimit } from './exchange-rates.cache';
import { ExchangeRatesStore } from './exchange-rates.store';
import { FRESH_FOR_MS, RATE_LIMIT_COOLDOWN_MS } from './rates-state';

const HOUR = 60 * 60 * 1000;

/** A `fetch` answer the test releases when it wants (AC-81: a slow provider). */
function deferred(): { promise: Promise<Response>; resolve: (response: Response) => void } {
  let resolve: (response: Response) => void = () => undefined;
  const promise = new Promise<Response>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('D-23 / D-51 ExchangeRatesStore (06-frontend §4)', () => {
  let env: RatesEnvironment;
  let store: ExchangeRatesStore;

  beforeEach(() => {
    env = ratesEnvironment();
    TestBed.configureTestingModule({ providers: env.providers });
    store = TestBed.inject(ExchangeRatesStore);
  });

  /** What a previous visit left: the reference answer fetched `hoursAgo` hours ago. */
  function cacheFetched(hoursAgo: number): void {
    env.storage.setItem(
      RATES_CACHE_KEY,
      JSON.stringify({ fetchedAt: env.clock.now - hoursAgo * HOUR, payload: REFERENCE_RATES_PAYLOAD }),
    );
  }

  it('AC-81: without cache, it is loading from the first moment and fresh when the rates arrive', async () => {
    const answer = deferred();
    env.fetch.mockReturnValueOnce(answer.promise);

    const started = store.start();
    expect(store.state().status).toBe('loading');

    answer.resolve(ratesResponse());
    await started;
    expect(store.state().status).toBe('fresh');
    expect(env.storage.items.has(RATES_CACHE_KEY)).toBe(true);
  });

  it('AC-82: rates fetched 30 min ago are used without any request', async () => {
    cacheFetched(0.5);

    await store.start();

    expect(store.state().status).toBe('fresh');
    expect(env.fetch).not.toHaveBeenCalled();
  });

  it('AC-81: expired rates are refreshed while they are still in use, and replaced when the answer arrives', async () => {
    cacheFetched(2);
    const answer = deferred();
    env.fetch.mockReturnValueOnce(answer.promise);

    const started = store.start();
    expect(store.state().status).toBe('refreshing');

    answer.resolve(ratesResponse());
    await started;
    const state = store.state();
    expect(state.status === 'fresh' && state.snapshot.fetchedAt).toBe(env.clock.now);
  });

  it.each([
    ['AC-80: a 500', ratesResponse({}, 500), 'error'],
    ['AC-80: a 200 with "result": "error"', ratesResponse({ result: 'error' }), 'error'],
  ])('%s without cache → %s', async (_case, response, status) => {
    env.fetch.mockResolvedValueOnce(response);

    await store.start();

    expect(store.state().status).toBe(status);
  });

  it('AC-82: a failed refresh with rates of 2 h keeps them, marked stale', async () => {
    cacheFetched(2);
    env.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await store.start();

    expect(store.state()).toMatchObject({ status: 'stale', failure: 'NETWORK' });
  });

  it('AC-80: «Reintentar» recovers from an error', async () => {
    env.fetch.mockResolvedValueOnce(ratesResponse({}, 500));
    await store.start();

    await store.retry();

    expect(store.state().status).toBe('fresh');
    expect(env.fetch).toHaveBeenCalledTimes(2);
  });

  it('AC-80: after a 429 there is no automatic attempt for 20 min, even after a reload, but «Reintentar» asks', async () => {
    saveRateLimit(env.storage, env.clock.now - 60_000);

    await store.start();
    expect(store.state()).toEqual({ status: 'error', failure: 'RATE_LIMITED' });
    expect(env.fetch).not.toHaveBeenCalled();

    await store.retry();
    expect(store.state().status).toBe('fresh');
  });

  it('a 429 starts the block of 20 min', async () => {
    env.fetch.mockResolvedValueOnce(ratesResponse({}, 429));

    await store.start();

    expect(store.state()).toEqual({ status: 'error', failure: 'RATE_LIMITED' });
    expect(JSON.parse(env.storage.getItem('saas-o-matic.exchange-rates.rate-limited-until.v1') ?? '0')).toBe(
      env.clock.now + RATE_LIMIT_COOLDOWN_MS,
    );
  });

  it('CL-33: one request at a time: «Reintentar» during a request does not start another', async () => {
    const answer = deferred();
    env.fetch.mockReturnValueOnce(answer.promise);
    const started = store.start();

    await store.retry();
    answer.resolve(ratesResponse());
    await started;

    expect(env.fetch).toHaveBeenCalledTimes(1);
  });

  it('starts only once', async () => {
    await store.start();
    await store.start();

    expect(env.fetch).toHaveBeenCalledTimes(1);
  });

  describe('D-147 refresh when the tab becomes visible again', () => {
    function becomeVisible(): void {
      TestBed.inject(DOCUMENT).dispatchEvent(new Event('visibilitychange'));
    }

    it('refreshes current rates that have expired, and nothing else', async () => {
      await store.start();
      expect(env.fetch).toHaveBeenCalledTimes(1);

      env.clock.now += FRESH_FOR_MS - 1;
      await store.refreshIfExpired();
      expect(env.fetch).toHaveBeenCalledTimes(1);

      env.clock.now += 1;
      becomeVisible();
      expect(store.state().status).toBe('refreshing');
      expect(env.fetch).toHaveBeenCalledTimes(2);
    });

    it('leaves an error to «Reintentar»', async () => {
      env.fetch.mockResolvedValueOnce(ratesResponse({}, 500));
      await store.start();

      becomeVisible();

      expect(store.state().status).toBe('error');
      expect(env.fetch).toHaveBeenCalledTimes(1);
    });

    it('review P2: a stale tab left open past the 48 h drops its rates when it comes back (D-23)', async () => {
      await store.start();
      env.fetch.mockRejectedValue(new TypeError('Failed to fetch'));
      env.clock.now += 2 * HOUR;
      await store.refreshIfExpired();
      expect(store.state().status).toBe('stale');

      env.clock.now += 3 * 24 * HOUR;
      await store.refreshIfExpired();

      expect(store.state()).toEqual({ status: 'error', failure: 'NETWORK' });
    });

    it('during the block of a 429 it asks nothing, but still drops rates older than 48 h', async () => {
      await store.start();
      env.clock.now += 3 * 24 * HOUR;
      saveRateLimit(env.storage, env.clock.now);

      await store.refreshIfExpired();

      expect(env.fetch).toHaveBeenCalledTimes(1);
      expect(store.state()).toEqual({ status: 'error', failure: 'RATE_LIMITED' });
    });
  });
});
