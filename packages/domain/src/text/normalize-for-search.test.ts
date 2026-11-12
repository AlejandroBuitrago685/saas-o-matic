import { describe, expect, it } from 'vitest';

import { normalizeForSearch } from './normalize-for-search.js';

// Built from its code point: written literally, a combining accent cannot be seen in review.
const COMBINING_ACUTE = String.fromCodePoint(0x0301);
const DECOMPOSED = `Telefoni${COMBINING_ACUTE}a`;

describe('ADR-006 search normalization: case and accent insensitive', () => {
  it('removes diacritics and lowercases (Ñ is searched as N)', () => {
    expect(normalizeForSearch('Telefonía Ñandú S.A.')).toBe('telefonia nandu s.a.');
  });

  it.each(['telefonia', 'ÑANDÚ', 'fonía'])(
    'a query normalized the same way is found inside the stored name: %s',
    (query) => {
      expect(normalizeForSearch('Telefonía Ñandú S.A.')).toContain(normalizeForSearch(query));
    },
  );

  it('gives the same result for decomposed (U+0301) and composed input', () => {
    expect(DECOMPOSED).not.toBe('Telefonía');
    expect(normalizeForSearch(DECOMPOSED)).toBe(normalizeForSearch('Telefonía'));
  });

  it('keeps the search wildcards as plain characters (escaping is the repository’s job)', () => {
    expect(normalizeForSearch('50%_Off!')).toBe('50%_off!');
  });
});
