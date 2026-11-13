import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { Location } from '@angular/common';
import { provideLocationMocks, type SpyLocation } from '@angular/common/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { CustomerPage } from '@saas-o-matic/contract';
import { beforeEach, describe, expect, it } from 'vitest';

import { apiBaseInterceptor } from '../../core/api/api-base.interceptor';
import { apiErrorInterceptor } from '../../core/api/api-error.interceptor';
import { CustomerSearchStore } from './customer-search.store';

const LIST_URL = '/api/customers';

function page(count: number, total: number, offset = 0): CustomerPage {
  const items = Array.from({ length: count }, (_, index) => ({
    id: `019a7b2c-0000-7000-8000-${String(offset + index + 1).padStart(12, '0')}`,
    companyName: `Cliente ${String(offset + index + 1)}`,
    taxId: 'B12345674',
    taxIdType: 'CIF' as const,
    country: 'ES' as const,
    plan: 'BUSINESS' as const,
    createdAt: '2026-11-13T10:20:00.000Z',
  }));
  return { items, page: { limit: 20, offset, total } };
}

let http: HttpTestingController;
let router: Router;
let location: SpyLocation;

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [
      CustomerSearchStore,
      provideRouter([]),
      provideLocationMocks(),
      provideHttpClient(withInterceptors([apiBaseInterceptor, apiErrorInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  http = TestBed.inject(HttpTestingController);
  router = TestBed.inject(Router);
  location = TestBed.inject(Location) as SpyLocation;
});

/** Lets navigations and responses finish (real timers: the router works with promises). */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
  TestBed.tick();
}

async function openAt(url: string): Promise<CustomerSearchStore> {
  await router.navigateByUrl(url);
  const store = TestBed.inject(CustomerSearchStore);
  TestBed.tick();
  await settle();
  return store;
}

function pending(): TestRequest {
  return http.expectOne((each) => each.url === LIST_URL);
}

const params = (request: TestRequest): Record<string, string | null> => {
  const { params: all } = request.request;
  return Object.fromEntries(all.keys().map((key) => [key, all.get(key)]));
};

async function answer(body: CustomerPage): Promise<void> {
  pending().flush(body);
  await settle();
}

describe('D-163 spec 05 §3.1 (Should) the query and the page live in the URL', () => {
  it('a reload of ?q=acme&page=2 asks for that query and page, and fills the field', async () => {
    const store = await openAt('/?q=acme&page=2');

    expect(params(pending())).toEqual({ q: 'acme', limit: '20', offset: '20' });
    expect(store.input()).toBe('acme');
  });

  it('a search and a page change replace the URL instead of adding history entries', async () => {
    const store = await openAt('/');
    await answer(page(20, 45));
    const entries = location.urlChanges.length;

    store.next();
    await settle();
    expect(router.url).toBe('/?page=2');
    await answer(page(20, 45, 20));

    store.type('acme');
    store.submit();
    await settle();
    expect(router.url).toBe('/?q=acme');
    expect(location.urlChanges.slice(entries)).toEqual(['replace: /?page=2', 'replace: /?q=acme']);
  });

  it('a change of the URL from outside (the «Clientes» link) is followed, field included', async () => {
    const store = await openAt('/?q=acme');
    await answer(page(1, 1));

    await router.navigateByUrl('/');
    await settle();

    expect(params(pending())).toEqual({ limit: '20', offset: '0' });
    expect(store.input()).toBe('');
  });

  it('review P2: an outside navigation while the store is still writing its own URL wins (D-163)', async () => {
    const store = await openAt('/');
    await answer(page(20, 25));

    store.type('acme');
    store.submit();
    void router.navigateByUrl('/?q=zeta');
    await settle();
    await settle();

    expect(router.url).toBe('/?q=zeta');
    expect(store.input()).toBe('zeta');
    const requests = http.match((each) => each.url === LIST_URL);
    expect(params(requests.at(-1) ?? pending())).toMatchObject({ q: 'zeta' });
  });

  it('an invalid URL is corrected and never reaches the API', async () => {
    await openAt('/?page=abc&utm=mail&q=%20acme%20');

    expect(params(pending())).toEqual({ q: 'acme', limit: '20', offset: '0' });
    expect(router.url).toBe('/?q=acme');
  });

  it('a page past the end shows the last page, in the URL too', async () => {
    await openAt('/?page=9');
    const beyond = pending();
    expect(params(beyond)).toMatchObject({ offset: '160' });

    beyond.flush(page(0, 25, 160));
    await settle();

    expect(params(pending())).toMatchObject({ offset: '20' });
    expect(router.url).toBe('/?page=2');
  });
});
