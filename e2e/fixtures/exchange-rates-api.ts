import { expect, type Locator, type Page, type Route } from '@playwright/test';

import { EXCHANGE_RATE_URL, REFERENCE_RATES } from './exchange-rates.js';

/** What the simulated provider does with the next requests (07-tests §1.3, AC-80…82). */
export type RatesBehaviour =
  | 'reference'
  | 'network-error'
  | 'server-error'
  | 'rate-limited'
  | 'result-error'
  | 'wrong-base'
  | 'without-gbp'
  | { readonly rates: Partial<Record<keyof typeof REFERENCE_RATES.rates, number>> };

/** The real service allows any origin; without this header the browser would reject the answer. */
const CORS = { 'access-control-allow-origin': '*' };

type Answer = (json: unknown, status?: number) => Promise<void>;

/** The answer of each named behaviour; a network error has none. */
const ANSWERS: Readonly<
  Record<Exclude<RatesBehaviour, object | 'network-error'>, (answer: Answer) => Promise<void>>
> = {
  reference: (answer) => answer(REFERENCE_RATES),
  'server-error': (answer) => answer({ result: 'error' }, 500),
  'rate-limited': (answer) => answer({ result: 'error', 'error-type': 'too-many-requests' }, 429),
  'result-error': (answer) => answer({ result: 'error', 'error-type': 'unsupported-code' }),
  'wrong-base': (answer) => answer({ ...REFERENCE_RATES, base_code: 'USD' }),
  'without-gbp': (answer) =>
    answer({ ...REFERENCE_RATES, rates: { ...REFERENCE_RATES.rates, GBP: undefined } }),
};

function fulfil(route: Route, behaviour: RatesBehaviour): Promise<void> {
  const answer: Answer = (json, status = 200) => route.fulfill({ status, json, headers: CORS });
  if (behaviour === 'network-error') return route.abort('failed');
  if (typeof behaviour === 'object')
    return answer({ ...REFERENCE_RATES, rates: { ...REFERENCE_RATES.rates, ...behaviour.rates } });
  return ANSWERS[behaviour](answer);
}

/** The simulated exchange-rate API of a test. */
export interface RatesApi {
  /** What the following requests get. */
  serve(behaviour: RatesBehaviour): void;
  /** Holds the following answers until `release()`: a slow provider (AC-81), without waiting real seconds. */
  hold(): { release: () => void };
  /** How many requests reached the provider. */
  requests(): number;
}

/**
 * Takes over the exchange-rate URL from the guard of `fixtures/test.ts` (the route registered last wins), so a test
 * can force each state. Every other external origin is still blocked by the guard (RT-05).
 */
export async function simulateRatesApi(page: Page, initial: RatesBehaviour = 'reference'): Promise<RatesApi> {
  let behaviour = initial;
  let gate: Promise<void> = Promise.resolve();
  let count = 0;
  await page.route(EXCHANGE_RATE_URL, async (route) => {
    count += 1;
    const current = behaviour;
    await gate;
    await fulfil(route, current);
  });
  return {
    serve: (next) => {
      behaviour = next;
    },
    hold: () => {
      let release: () => void = () => undefined;
      gate = new Promise((resolve) => {
        release = resolve;
      });
      return { release };
    },
    requests: () => count,
  };
}

/** The rates indicator and the currency selector of the header (spec 05 §4.1 and §4.4). */
export interface CurrencyHeader {
  readonly status: Locator;
  readonly retry: Locator;
  readonly select: Locator;
  /** The currencies that can be chosen now, in the order of the selector. */
  enabledCurrencies(): Promise<string[]>;
}

export function currencyHeader(page: Page): CurrencyHeader {
  const select = page.getByLabel('Divisa');
  return {
    status: page.getByTestId('rates-status'),
    retry: page.getByRole('button', { name: 'Reintentar' }),
    select,
    enabledCurrencies: async () =>
      (await select.locator('option:not([disabled])').allTextContents()).map((text) => text.trim()),
  };
}

export const ALL_CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'MXN'];

/** The indicator shows the date of the reference rates: the provider is answering. */
export async function expectReferenceRates(header: CurrencyHeader): Promise<void> {
  await expect(header.status).toHaveText('Tipos del 12/11/2026');
  expect(await header.enabledCurrencies()).toEqual(ALL_CURRENCIES);
}

/** When the provider updated the reference rates (02-reglas §4.1), in ms. */
export const RATES_UPDATED_AT = REFERENCE_RATES.time_last_update_unix * 1000;

/**
 * A first visit with the clock of the page at `fetchedAt` (D-149): the application fetches the reference rates and
 * fills its own cache, as a user would, so the tests never depend on the format of that cache.
 */
export async function firstVisit(page: Page, url: string, fetchedAt: number): Promise<RatesApi> {
  const rates = await simulateRatesApi(page);
  await page.clock.install({ time: fetchedAt });
  await page.goto(url);
  await expectReferenceRates(currencyHeader(page));
  return rates;
}
