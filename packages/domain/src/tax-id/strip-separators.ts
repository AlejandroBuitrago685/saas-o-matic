/**
 * Step 1: every Unicode white space (the White_Space property, no-break space included), hyphen-minus (U+002D) and
 * dots are removed. Not JavaScript's `\s`, which also removes U+FEFF, a format character (D-102).
 */
const REMOVED = /[\p{White_Space}.-]/gu;
/** Step 2: only ASCII letters and digits may remain; any other character, homoglyphs included, fails. */
const ASCII_ALPHANUMERIC = /^[A-Za-z0-9]*$/;

/**
 * Steps 1 and 2 of the normalization of a tax identifier (03-validacion-fiscal §2): the separators removed, or `null`
 * if anything but ASCII letters and digits remains. It does **not** uppercase: the ASCII check must go first, because
 * some Unicode letters uppercase to ASCII (`ſ` → `S`) and would let homoglyphs in (TV-NO-09).
 */
export function stripSeparators(input: string): string | null {
  const stripped = input.replace(REMOVED, '');
  return ASCII_ALPHANUMERIC.test(stripped) ? stripped : null;
}
