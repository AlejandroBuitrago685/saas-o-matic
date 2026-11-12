import { describe, expect, it } from 'vitest';

import type { Country } from '../catalog/constants.js';
import { validateTaxId } from './validate-tax-id.js';

// Representative dangerous characters (D-101). The full sweep of the BMP is test/slow/tax-id-homoglyphs.slow.test.ts,
// which runs in CI and in `npm run verify`, not in the Stop hook. Built from their code points (D-96).
const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_v, i) => from + i);
const DANGEROUS: readonly number[] = [
  ...[0x0410, 0x0412, 0x0415, 0x041a, 0x041c, 0x041d, 0x041e, 0x0420, 0x0421, 0x0422, 0x0425], // Cyrillic capitals
  ...[0x0430, 0x0435, 0x043e, 0x0440, 0x0441, 0x0445], // Cyrillic small letters that look Latin
  ...[0x0391, 0x0392, 0x0395, 0x0396, 0x0397, 0x0399, 0x039a, 0x039c, 0x039d, 0x039f, 0x03a1, 0x03a4, 0x03a7], // Greek
  ...range(0xff10, 0xff19), // fullwidth digits
  ...range(0xff21, 0xff3a), // fullwidth Latin capitals
  0x017f, // long s: uppercases to S (TV-NO-09)
  0x0131, // dotless i: uppercases to I
  0x00df, // sharp s: uppercases to SS
  ...range(0xfb00, 0xfb06), // Latin ligatures ff, fi, fl, ffi, ffl, long st, st: uppercase to ASCII pairs
  0x212a, // Kelvin sign
  0x212b, // Angstrom sign
  ...[0x00b9, 0x00b2, 0x00b3, 0x2070], // superscript digits
  ...[0x0660, 0x06f0, 0x0966], // Arabic-Indic, Extended Arabic-Indic and Devanagari zero
  ...[0x1d7ce, 0x1d400], // mathematical bold zero and A, outside the BMP (not in the full sweep)
  ...[0x200b, 0x200c, 0x200d, 0x2060, 0x00ad, 0xfeff], // invisible: zero-width, joiners, word joiner, soft hyphen, BOM
  ...[0x2010, 0x2011, 0x2012, 0x2013, 0x2014, 0x2212], // dashes and minus sign that look like a hyphen
  ...[0x00b7, 0x2024, 0xff0e], // dots that look like a full stop
];

/** One valid normalized value per country and type. */
const SAMPLES: readonly (readonly [Country, string])[] = [
  ['ES', '12345678Z'], // DNI
  ['ES', 'X1234567L'], // NIE
  ['ES', 'B12345674'], // CIF, control digit
  ['ES', 'Q2826000H'], // CIF, control letter
  ['PT', '123456789'],
  ['DE', '123456789'],
  ['IT', '12345678901'],
  ['FR', 'AB123456789'],
  ['GB', '123456789012'],
  ['GB', 'GD123'],
  ['US', '123456789'],
  // With their prefix, so a value contains S, I, F and T: inverting the order ASCII check → uppercase would let
  // ſ, ß, ı and the ligatures in (TV-NO-09).
  ['ES', 'ESB12345674'],
  ['IT', 'IT12345678901'],
  ['FR', 'FRAB123456789'],
  ['FR', 'FR123456789'],
];

/** Every value obtained by replacing one character, or inserting one, with each dangerous character. */
function variantsOf(value: string): string[] {
  return DANGEROUS.flatMap((codePoint) => {
    const dangerous = String.fromCodePoint(codePoint);
    return range(0, value.length).flatMap((position) => [
      value.slice(0, position) + dangerous + value.slice(position + 1),
      value.slice(0, position) + dangerous + value.slice(position),
    ]);
  });
}

describe('AC-14 no Unicode homoglyph produces a valid tax id: representative characters (RF-02, CL-26, D-101)', () => {
  it.each(SAMPLES)('%s %s stays valid, and none of its dangerous variants is', (country, value) => {
    expect(validateTaxId(value, country).ok).toBe(true);
    const accepted = variantsOf(value).filter((variant) => validateTaxId(variant, country).ok);

    expect(accepted).toEqual([]);
  });

  it('removes Unicode white space on purpose, but not U+FEFF, which is a format character (D-102)', () => {
    expect(validateTaxId(`12345678${String.fromCodePoint(0x2007)}Z`, 'ES').ok).toBe(true);
    expect(validateTaxId(`12345678${String.fromCodePoint(0xfeff)}Z`, 'ES')).toEqual({
      ok: false,
      error: 'INVALID_FORMAT',
    });
  });
});
