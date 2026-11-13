import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { CustomerPage, CustomerSummary } from '@saas-o-matic/contract';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiBaseInterceptor } from '../../core/api/api-base.interceptor';
import { apiErrorInterceptor } from '../../core/api/api-error.interceptor';
import { INSTANCE_FIXTURE } from '../../core/testing/catalog.fixture';
import { CustomerSearchStore, SEARCH_DEBOUNCE_MS } from './customer-search.store';

const LIST_URL = '/api/customers';

function summary(index: number, companyName = `Cliente ${String(index)}`): CustomerSummary {
  return {
    id: `019a7b2c-0000-7000-8000-${String(index).padStart(12, '0')}`,
    companyName,
    taxId: 'B12345674',
    taxIdType: 'CIF',
    country: 'ES',
    plan: 'BUSINESS',
    createdAt: '2026-11-13T10:20:00.000Z',
  };
}

function page(count: number, total: number, offset = 0): CustomerPage {
  const items = Array.from({ length: count }, (_, index) => summary(offset + index + 1));
  return { items, page: { limit: 20, offset, total } };
}

let store: CustomerSearchStore;
let http: HttpTestingController;

beforeEach(() => {
  vi.useFakeTimers();
  TestBed.configureTestingModule({
    providers: [
      CustomerSearchStore,
      provideRouter([]),
      provideHttpClient(withInterceptors([apiBaseInterceptor, apiErrorInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  http = TestBed.inject(HttpTestingController);
  store = TestBed.inject(CustomerSearchStore);
  TestBed.tick();
});

afterEach(() => {
  vi.useRealTimers();
});

/** Lets the resource take the response and recompute (no real time passes: the timers are fake). */
async function settle(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
  TestBed.tick();
}

/** The one pending request of the listing, with its query as an object. */
function pending(): { request: TestRequest; params: Record<string, string | null> } {
  const request = http.expectOne((each) => each.url === LIST_URL);
  const { params } = request.request;
  return { request, params: Object.fromEntries(params.keys().map((key) => [key, params.get(key)])) };
}

async function answer(body: CustomerPage): Promise<void> {
  pending().request.flush(body);
  await settle();
}

/** Types the text and waits for the debounce, as a user who stops typing. */
async function typeAndWait(text: string): Promise<void> {
  store.type(text);
  await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
  TestBed.tick();
}

describe('AC-70 states of the dashboard listing (spec 05 §3.1)', () => {
  it('asks for the first page without q, shows the skeleton meanwhile, then 20 of 25', async () => {
    const first = pending();
    expect(first.params).toEqual({ limit: '20', offset: '0' });
    expect(store.status()).toBe('loading');

    first.request.flush(page(20, 25));
    await settle();

    expect(store.status()).toBe('ready');
    expect(store.items()).toHaveLength(20);
    expect(store.range()).toEqual({ from: 1, to: 20, total: 25 });
    expect(store.hasPrevious()).toBe(false);
    expect(store.hasNext()).toBe(true);
  });

  it('no customers at all is the empty state, not «no matches»', async () => {
    await answer(page(0, 0));

    expect(store.status()).toBe('empty');
  });

  it('an error of the API is the error state, and retry asks again', async () => {
    pending().request.flush(
      {
        type: 'about:blank',
        title: 'Error',
        status: 500,
        code: 'INTERNAL_ERROR',
        instance: INSTANCE_FIXTURE,
      },
      { status: 500, statusText: 'Internal Server Error' },
    );
    await settle();
    expect(store.status()).toBe('error');

    store.retry();
    TestBed.tick();
    await answer(page(3, 3));

    expect(store.status()).toBe('ready');
  });

  it('«Siguiente» asks for offset 20 and «Anterior» goes back to the first page', async () => {
    await answer(page(20, 25));

    store.next();
    TestBed.tick();
    const second = pending();
    expect(second.params).toMatchObject({ offset: '20' });
    second.request.flush(page(5, 25, 20));
    await settle();

    expect(store.range()).toEqual({ from: 21, to: 25, total: 25 });
    expect(store.hasNext()).toBe(false);
    store.previous();
    TestBed.tick();
    expect(pending().params).toMatchObject({ offset: '0' });
  });

  it('a second «Siguiente» while the next page loads is ignored: two quick clicks never skip a page', async () => {
    await answer(page(20, 45));

    store.next();
    store.next();
    TestBed.tick();

    expect(pending().params).toMatchObject({ offset: '20' });
  });

  it('while a new search loads, the previous results stay (dimmed) instead of the skeleton', async () => {
    await answer(page(20, 25));

    await typeAndWait('acme');

    expect(store.isRefreshing()).toBe(true);
    expect(store.status()).toBe('ready');
    expect(store.items()).toHaveLength(20);
    await answer(page(1, 1));
    expect(store.isRefreshing()).toBe(false);
    expect(store.items()).toHaveLength(1);
  });
});

describe('AC-71 CL-42 live search', () => {
  beforeEach(async () => {
    await answer(page(20, 25));
  });

  it('typing «acme» in a row sends a single search, 300 ms after the last key', async () => {
    for (const text of ['a', 'ac', 'acm', 'acme']) {
      store.type(text);
      await vi.advanceTimersByTimeAsync(100);
      TestBed.tick();
    }
    http.expectNone((each) => each.url === LIST_URL);

    await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS - 100);
    TestBed.tick();

    expect(pending().params).toEqual({ q: 'acme', limit: '20', offset: '0' });
  });

  it('Enter searches at once, without waiting for the debounce', () => {
    store.type('  acme ');
    store.submit();
    TestBed.tick();

    expect(pending().params).toMatchObject({ q: 'acme' });
  });

  it('a slow answer to an older search is discarded: the list is the one of the last search', async () => {
    await typeAndWait('ac');
    const older = pending().request;

    await typeAndWait('acme');

    expect(older.cancelled).toBe(true);
    await answer({ items: [summary(1, 'Acme S.L.')], page: { limit: 20, offset: 0, total: 1 } });
    expect(store.items().map(({ companyName }) => companyName)).toEqual(['Acme S.L.']);
  });

  it('a new search goes back to the first page', async () => {
    store.next();
    TestBed.tick();
    await answer(page(5, 25, 20));

    await typeAndWait('acme');

    expect(pending().params).toMatchObject({ q: 'acme', offset: '0' });
  });

  it('no matches keeps the query of the answer, and clearing lists everything again', async () => {
    await typeAndWait('zzz');
    await answer(page(0, 0));

    expect(store.status()).toBe('no-matches');
    expect(store.shownQuery()).toBe('zzz');

    store.clear();
    TestBed.tick();
    expect(store.input()).toBe('');
    expect(pending().params).toEqual({ limit: '20', offset: '0' });
  });

  it('a pending debounce dies with the store', async () => {
    store.type('acme');
    TestBed.resetTestingModule();

    await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);

    expect(vi.getTimerCount()).toBe(0);
  });
});
