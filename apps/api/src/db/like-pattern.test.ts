import { describe, expect, it } from 'vitest';

import { containsPattern } from './like-pattern.js';

describe('RNF-SEC-02 AC-31 LIKE patterns with the wildcards escaped', () => {
  it.each([
    ['acme', '%acme%'],
    ['100%', '%100!%%'],
    ['a_b', '%a!_b%'],
    ['¡hola!', '%¡hola!!%'],
    ['%_!', '%!%!_!!%'],
    ['\\', '%\\%'],
  ])('%s → %s', (term, pattern) => {
    expect(containsPattern(term)).toBe(pattern);
  });
});
