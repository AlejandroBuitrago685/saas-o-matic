import { describe, expect, it } from 'vitest';

import { normalizeCompanyName } from './normalize-company-name.js';

// Invisible characters are built from their code points: written literally they would not be seen in review.
const char = (codePoint: number): string => String.fromCodePoint(codePoint);
const NO_BREAK_SPACE = char(0x00a0);
const EM_SPACE = char(0x2003);
const IDEOGRAPHIC_SPACE = char(0x3000);
const COMBINING_ACUTE = char(0x0301);
const COMBINING_TILDE = char(0x0303);
const ROCKET = char(0x1f680);

const name = (length: number): string => 'A'.repeat(length);

describe('D-34 / D-94 company name normalization', () => {
  it('trims the ends and collapses inner spaces (example of 04-contrato-api)', () => {
    expect(normalizeCompanyName('  Acme   Ibérica S.L. ')).toEqual({ ok: true, value: 'Acme Ibérica S.L.' });
  });

  it('collapses any run of Unicode spaces (Zs: no-break space, em space…) into one U+0020', () => {
    const input = `Acme${NO_BREAK_SPACE}${EM_SPACE} Corp${IDEOGRAPHIC_SPACE}`;

    expect(normalizeCompanyName(input)).toEqual({ ok: true, value: 'Acme Corp' });
  });

  it('composes to NFC, so a decomposed and a composed name are the same string', () => {
    const decomposed = `Telefoni${COMBINING_ACUTE}a N${COMBINING_TILDE}andu${COMBINING_ACUTE}`;

    expect(normalizeCompanyName(decomposed)).toEqual({ ok: true, value: 'Telefonía Ñandú' });
  });

  it.each([
    ['a tab (Cc)', 0x0009],
    ['a line feed (Cc)', 0x000a],
    ['a NUL character (Cc)', 0x0000],
    ['a C1 control (Cc)', 0x0085],
    ['a zero-width space (Cf)', 0x200b],
    ['a right-to-left override (Cf)', 0x202e],
    ['a byte order mark (Cf)', 0xfeff],
    ['a line separator (Zl)', 0x2028],
    ['a paragraph separator (Zp)', 0x2029],
    ['a lone high surrogate (Cs)', 0xd800],
    ['a lone low surrogate (Cs)', 0xdc00],
  ])('rejects %s as INVALID_FORMAT', (_case, codePoint) => {
    expect(normalizeCompanyName(`Acme${char(codePoint)}Corp`)).toEqual({
      ok: false,
      error: 'INVALID_FORMAT',
    });
  });

  it('counts the length in code points after normalizing: 2 and 200 are accepted', () => {
    expect(normalizeCompanyName('AB')).toEqual({ ok: true, value: 'AB' });
    expect(normalizeCompanyName(`  ${name(200)}  `)).toEqual({ ok: true, value: name(200) });
  });

  it('rejects 1 and 201 code points', () => {
    expect(normalizeCompanyName(' A ')).toEqual({ ok: false, error: 'TOO_SHORT' });
    expect(normalizeCompanyName(name(201))).toEqual({ ok: false, error: 'TOO_LONG' });
  });

  it('counts a character outside the BMP as one code point, not two UTF-16 units', () => {
    expect(normalizeCompanyName(`${name(199)}${ROCKET}`)).toEqual({
      ok: true,
      value: `${name(199)}${ROCKET}`,
    });
    expect(normalizeCompanyName(ROCKET)).toEqual({ ok: false, error: 'TOO_SHORT' });
  });

  it('rejects a name made only of spaces as TOO_SHORT', () => {
    expect(normalizeCompanyName(` ${NO_BREAK_SPACE} `)).toEqual({ ok: false, error: 'TOO_SHORT' });
  });
});
