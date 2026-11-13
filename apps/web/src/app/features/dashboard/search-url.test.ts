import { convertToParamMap } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { isCanonical, readSearchState, searchQueryParams } from './search-url';

const read = (params: Record<string, string>) => readSearchState(convertToParamMap(params));

describe('D-163 spec 05 §3.1 (Should) the query and the page in the URL', () => {
  it.each([
    [{}, { query: '', pageIndex: 0 }],
    [{ q: 'acme' }, { query: 'acme', pageIndex: 0 }],
    [
      { q: '  acme ', page: '3' },
      { query: 'acme', pageIndex: 2 },
    ],
    [{ page: '1' }, { query: '', pageIndex: 0 }],
    [{ page: '50001' }, { query: '', pageIndex: 50_000 }],
  ])('reads %j as %j', (params, expected) => {
    expect(read(params)).toEqual(expected);
  });

  it.each([
    ['page 0', { page: '0' }],
    ['a negative page', { page: '-2' }],
    ['a decimal page', { page: '2.5' }],
    ['a page with letters', { page: '2a' }],
    ['a page in exponent form', { page: '1e3' }],
    ['a page beyond the last offset the API accepts', { page: '50002' }],
    ['a query longer than 100 characters', { q: 'a'.repeat(101) }],
  ])('drops %s', (_case, params) => {
    expect(read(params)).toEqual({ query: '', pageIndex: 0 });
  });

  it('writes only what is not a default, with the page as the user reads it', () => {
    expect(searchQueryParams({ query: '', pageIndex: 0 })).toEqual({ q: null, page: null });
    expect(searchQueryParams({ query: 'acme', pageIndex: 1 })).toEqual({ q: 'acme', page: '2' });
  });

  it.each([
    [{}, true],
    [{ q: 'acme', page: '2' }, true],
    [{ q: ' acme ' }, false],
    [{ page: '1' }, false],
    [{ page: 'x' }, false],
    [{ q: 'acme', utm: 'mail' }, false],
  ])('%j is canonical: %s', (params, expected) => {
    const map = convertToParamMap(params);

    expect(isCanonical(map, readSearchState(map))).toBe(expected);
  });
});
