import type { Page, Request, Route } from '@playwright/test';
import type { CustomerPage, CustomerSummary } from '@saas-o-matic/contract';

/** `GET /api/customers` only: not the detail (`/api/customers/{id}`) nor the history. */
export const isListing = (url: URL): boolean => url.pathname === '/api/customers';

/** A customer of the listing as the contract types it, with a valid synthetic CIF (TV-ES-16). */
export function customerSummary(index: number, companyName = `Cliente ${String(index)}`): CustomerSummary {
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

/** A page of `total` customers that starts at `offset`, with as many items as fit in 20. */
export function customerPage(total: number, offset = 0): CustomerPage {
  const count = Math.max(0, Math.min(20, total - offset));
  const items = Array.from({ length: count }, (_, index) => customerSummary(offset + index + 1));
  return { items, page: { limit: 20, offset, total } };
}

export function pageOf(items: readonly CustomerSummary[]): CustomerPage {
  return { items: [...items], page: { limit: 20, offset: 0, total: items.length } };
}

/** The `q` and `offset` of a request of the listing. */
export function queryOf(request: Request): { q: string | null; offset: number } {
  const { searchParams } = new URL(request.url());
  return { q: searchParams.get('q'), offset: Number(searchParams.get('offset') ?? '0') };
}

/**
 * Answers the listing with what `respond` returns for each request, as a database the test controls would (07-tests
 * §1.3: the states that need an empty database or a failing API are intercepted). Registered after the network guard
 * of `fixtures/test.ts`, so it runs first.
 */
export async function answerListing(
  page: Page,
  respond: (request: Request) => Promise<CustomerPage> | CustomerPage,
): Promise<void> {
  await page.route(isListing, async (route: Route) => {
    await route.fulfill({ json: await respond(route.request()) });
  });
}
