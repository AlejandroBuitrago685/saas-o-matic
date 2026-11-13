import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  ratesResponse,
  REFERENCE_RATES_PAYLOAD,
  REFERENCE_UPDATED_AT,
} from '../testing/exchange-rates.fixture';
import { ratesEnvironment, type RatesEnvironment } from '../testing/rates-environment.fixture';
import { CHOSEN_CURRENCY_KEY } from './chosen-currency.storage';
import { CurrencyStore } from './currency.store';
import { RATES_CACHE_KEY } from './exchange-rates.cache';
import { ExchangeRatesStore } from './exchange-rates.store';

/** 15 users, ES (02-reglas §6.5). */
const FIFTEEN_USERS_ES = { tiers: [{ subtotalCents: 10_000 }, { subtotalCents: 4000 }], taxCents: 2940 };

describe('D-143 CurrencyStore: chosen and effective currency (spec 05 §4.1)', () => {
  let env: RatesEnvironment;
  let rates: ExchangeRatesStore;
  let currency: CurrencyStore;

  beforeEach(() => {
    env = ratesEnvironment();
    TestBed.configureTestingModule({ providers: env.providers });
    rates = TestBed.inject(ExchangeRatesStore);
    currency = TestBed.inject(CurrencyStore);
  });

  it('EUR by default and available from the first moment, without rates (spec 05 §4.2)', () => {
    expect(currency.effective()).toBe('EUR');
    expect(currency.available()).toEqual(['EUR']);
    expect(currency.convert(FIFTEEN_USERS_ES)).toEqual({
      pricing: { currency: 'EUR', tierSubtotals: [10_000, 4000], base: 14_000, tax: 2940, total: 16_940 },
      ratesUpdatedAt: undefined,
    });
  });

  it('AC-79: with rates, every currency is available and the amounts follow the D-20 rule', async () => {
    await rates.start();
    currency.select('GBP');

    expect(currency.available()).toEqual(['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'MXN']);
    expect(currency.convert(FIFTEEN_USERS_ES)).toEqual({
      pricing: { currency: 'GBP', tierSubtotals: [8359, 3344], base: 11_703, tax: 2458, total: 14_161 },
      ratesUpdatedAt: REFERENCE_UPDATED_AT,
    });
  });

  it('AC-80: a 200 without GBP only leaves GBP out', async () => {
    const withoutGbp = { ...REFERENCE_RATES_PAYLOAD.rates, GBP: undefined };
    env.fetch.mockResolvedValueOnce(ratesResponse({ ...REFERENCE_RATES_PAYLOAD, rates: withoutGbp }));

    await rates.start();

    expect(currency.available()).toEqual(['EUR', 'USD', 'CHF', 'JPY', 'MXN']);
  });

  it('D-143: without rates the amounts are in EUR, and they come back to the chosen currency with rates', async () => {
    env.fetch.mockResolvedValueOnce(ratesResponse({}, 500));
    currency.select('USD');
    await rates.start();

    expect(currency.chosen()).toBe('USD');
    expect(currency.effective()).toBe('EUR');
    expect(currency.convert(FIFTEEN_USERS_ES)?.pricing.total).toBe(16_940);

    await rates.retry();
    expect(currency.effective()).toBe('USD');
    expect(currency.convert(FIFTEEN_USERS_ES)?.pricing.total).toBe(18_825);
  });

  it('AC-88 / D-142: GBP and then JPY during a refresh → JPY with the new rates when they arrive', async () => {
    env.storage.setItem(
      RATES_CACHE_KEY,
      JSON.stringify({
        fetchedAt: env.clock.now - 2 * 60 * 60 * 1000,
        payload: { ...REFERENCE_RATES_PAYLOAD, rates: { ...REFERENCE_RATES_PAYLOAD.rates, JPY: 100 } },
      }),
    );
    const started = rates.start();
    expect(rates.state().status).toBe('refreshing');

    currency.select('GBP');
    currency.select('JPY');
    expect(currency.convert(FIFTEEN_USERS_ES)?.pricing.tierSubtotals).toEqual([10_000, 4000]); // old rate: 100
    await started;

    expect(currency.effective()).toBe('JPY');
    expect(currency.convert(FIFTEEN_USERS_ES)?.pricing.base).toBe(24_812); // TV-FX-04
  });

  it('review P2: a valid but absurd rate (1e300) falls back to EUR instead of leaving no amounts', async () => {
    env.fetch.mockResolvedValueOnce(
      ratesResponse({ ...REFERENCE_RATES_PAYLOAD, rates: { ...REFERENCE_RATES_PAYLOAD.rates, JPY: 1e300 } }),
    );
    await rates.start();
    currency.select('JPY');

    expect(currency.convert(FIFTEEN_USERS_ES)).toEqual({
      pricing: { currency: 'EUR', tierSubtotals: [10_000, 4000], base: 14_000, tax: 2940, total: 16_940 },
      ratesUpdatedAt: undefined,
    });
  });

  it('AC-92: convertAmount converts one leaf amount with the same rule, and marks when the rates are from', async () => {
    expect(currency.convertAmount(12_400)).toEqual({
      amount: 12_400,
      currency: 'EUR',
      ratesUpdatedAt: undefined,
    });

    await rates.start();
    currency.select('USD');

    // 124,00 € × 1,111287 = 137,7996 → 137,80 $, half up (the reference rates of the fixture).
    expect(currency.convertAmount(12_400)).toEqual({
      amount: 13_780,
      currency: 'USD',
      ratesUpdatedAt: REFERENCE_UPDATED_AT,
    });
  });

  it('AC-92: convertAmount falls back to EUR like convert (D-91), and gives nothing for an invalid amount', async () => {
    env.fetch.mockResolvedValueOnce(
      ratesResponse({ ...REFERENCE_RATES_PAYLOAD, rates: { ...REFERENCE_RATES_PAYLOAD.rates, JPY: 1e300 } }),
    );
    await rates.start();
    currency.select('JPY');

    expect(currency.convertAmount(12_400)).toEqual({
      amount: 12_400,
      currency: 'EUR',
      ratesUpdatedAt: undefined,
    });
    expect(currency.convertAmount(-1)).toBeUndefined();
  });

  it('spec 05 §4.1 (Could): a choice is saved, and a new store starts with it', () => {
    currency.select('CHF');

    expect(env.storage.items.get(CHOSEN_CURRENCY_KEY)).toBe('CHF');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: env.providers });
    expect(TestBed.inject(CurrencyStore).chosen()).toBe('CHF');
  });

  it('gives no amounts only when even EUR leaves the safe range (D-91)', () => {
    const half = Math.ceil(Number.MAX_SAFE_INTEGER / 2);

    expect(currency.convert({ tiers: [{ subtotalCents: half }], taxCents: half })).toBeUndefined();
  });
});
