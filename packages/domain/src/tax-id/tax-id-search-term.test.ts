import { describe, expect, it } from 'vitest';

import { taxIdSearchTerm } from './tax-id-search-term.js';

// Built from its code point: written literally, it cannot be told apart from an «s» in a review (D-96).
const LATIN_SMALL_LONG_S = String.fromCodePoint(0x017f);

describe('AC-30 the tax id part of a search is normalized like a tax id (04-contrato-api §3.3)', () => {
  it.each([
    ['b-1234', 'B1234'],
    ['12345674', '12345674'],
    ['B12345674', 'B12345674'],
    [' es b.1234 ', 'ESB1234'],
  ])('%s → %s', (query, term) => {
    expect(taxIdSearchTerm(query)).toBe(term);
  });
});

describe('AC-31 D-136 a query that cannot be inside any tax id gives no term, never one that matches all', () => {
  it.each(['%', '_', '100%', 'Ñandú'])('%s → null', (query) => {
    expect(taxIdSearchTerm(query)).toBeNull();
  });

  it.each(['-', '.', ' . - '])('only separators («%s») → null, not an empty term', (query) => {
    expect(taxIdSearchTerm(query)).toBeNull();
  });

  it('a homoglyph that uppercases to ASCII (ſ → S) is not a tax id character (TV-NO-09)', () => {
    expect(taxIdSearchTerm(`B1${LATIN_SMALL_LONG_S}`)).toBeNull();
  });
});
