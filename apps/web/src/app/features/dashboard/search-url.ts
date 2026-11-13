import type { ParamMap, Params } from '@angular/router';
import { MAX_PAGE_OFFSET, MAX_SEARCH_QUERY_LENGTH } from '@saas-o-matic/domain';

/** Customers per page of the dashboard (spec 05 §3.1). */
export const SEARCH_PAGE_SIZE = 20;

/** The highest page index whose offset the API accepts (04-contrato-api §3.3). */
const MAX_PAGE_INDEX = Math.floor(MAX_PAGE_OFFSET / SEARCH_PAGE_SIZE);
const PAGE_NUMBER = /^[1-9]\d{0,6}$/;

/** What the URL keeps of the dashboard (spec 05 §3.1, Should): the applied query and the page, from 0. */
export interface SearchState {
  readonly query: string;
  readonly pageIndex: number;
}

/**
 * `?q=…&page=…` → the state, with anything invalid dropped instead of sent to the API: a query longer than the
 * field allows, or a page that is not a whole number from 1 to the last offset the API accepts. Page 1 is the
 * first one, as the user reads it.
 */
export function readSearchState(params: ParamMap): SearchState {
  const query = (params.get('q') ?? '').trim();
  const page = params.get('page') ?? '';
  const pageIndex = PAGE_NUMBER.test(page) ? Number(page) - 1 : 0;
  return {
    query: query.length <= MAX_SEARCH_QUERY_LENGTH ? query : '',
    pageIndex: pageIndex <= MAX_PAGE_INDEX ? pageIndex : 0,
  };
}

/** The state → query parameters, without the defaults: the dashboard with everything is just `/`. */
export function searchQueryParams({ query, pageIndex }: SearchState): Params {
  return { q: query === '' ? null : query, page: pageIndex === 0 ? null : String(pageIndex + 1) };
}

/** Whether the URL already says exactly `state` and nothing else, so it needs no correction. */
export function isCanonical(params: ParamMap, state: SearchState): boolean {
  const expected = Object.entries(searchQueryParams(state)).filter(([, value]) => value !== null);
  return (
    params.keys.length === expected.length && expected.every(([key, value]) => params.get(key) === value)
  );
}

export function isSameSearch(a: SearchState, b: SearchState): boolean {
  return a.query === b.query && a.pageIndex === b.pageIndex;
}
