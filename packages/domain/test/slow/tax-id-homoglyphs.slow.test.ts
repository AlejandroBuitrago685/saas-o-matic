import { describe, expect, it } from 'vitest';

import type { Country } from '../../src/catalog/constants.js';
import { validateTaxId } from '../../src/tax-id/validate-tax-id.js';
import { ALL_TAX_ID_VECTORS } from '../vectors/tax-id.vectors.js';

/** Characters that normalization removes on purpose (Unicode white space): replacing one by them is not a homoglyph. */
const isWhiteSpace = (codePoint: number): boolean => /\p{White_Space}/u.test(String.fromCodePoint(codePoint));
const isSurrogate = (codePoint: number): boolean => codePoint >= 0xd800 && codePoint <= 0xdfff;

const NON_ASCII_BMP = Array.from({ length: 0x10000 - 0x80 }, (_v, i) => i + 0x80).filter(
  (codePoint) => !isSurrogate(codePoint) && !isWhiteSpace(codePoint),
);

/** Distinct (country, normalized value) pairs of the valid vectors: several vectors share one. */
const SAMPLES: readonly (readonly [Country, string])[] = [
  ...new Map(
    ALL_TAX_ID_VECTORS.flatMap(({ country, expected }) =>
      expected.valid ? [[`${country}:${expected.value}`, [country, expected.value] as const] as const] : [],
    ),
  ).values(),
];

describe('AC-14 full sweep: no non-ASCII character of the BMP turns into a valid tax id (RF-02, CL-26, D-90)', () => {
  it.each(SAMPLES)('%s %s: every position, every code point from U+0080 to U+FFFF', (country, value) => {
    const accepted: string[] = [];
    for (let position = 0; position < value.length; position += 1) {
      for (const codePoint of NON_ASCII_BMP) {
        const candidate =
          value.slice(0, position) + String.fromCodePoint(codePoint) + value.slice(position + 1);
        if (validateTaxId(candidate, country).ok)
          accepted.push(`${String(position)}:U+${codePoint.toString(16)}`);
      }
    }

    expect(accepted).toEqual([]);
  });
});
