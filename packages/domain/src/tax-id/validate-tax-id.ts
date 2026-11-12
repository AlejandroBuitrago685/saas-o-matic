import type { Country } from '../catalog/constants.js';
import { err, ok, type Result } from '../shared/result.js';
import { TAX_ID_VALIDATORS } from './registry.js';
import type { TaxIdReason, ValidTaxId } from './tax-id-validator.js';

/**
 * Step 1: every Unicode white space (the White_Space property, no-break space included), hyphen-minus (U+002D) and
 * dots are removed. Not JavaScript's `\s`, which also removes U+FEFF, a format character (D-102).
 */
const REMOVED = /[\p{White_Space}.-]/gu;
/** Step 2: only ASCII letters and digits may remain; any other character, homoglyphs included, fails. */
const ASCII_ALPHANUMERIC = /^[A-Za-z0-9]*$/;

/**
 * Normalizes and validates a tax identifier (03-validacion-fiscal §2, D-14). The ASCII check goes **before**
 * uppercasing: some Unicode letters uppercase to ASCII (`ſ` → `S`) and would let homoglyphs in (TV-NO-09). The value is
 * validated as it is first, and only then without the country prefix, so `FR123456789` stays as it is (TV-INT-15).
 */
export function validateTaxId(input: string, country: Country): Result<ValidTaxId, TaxIdReason> {
  const stripped = input.replace(REMOVED, '');
  if (!ASCII_ALPHANUMERIC.test(stripped)) return err('INVALID_FORMAT');
  const value = stripped.toUpperCase();
  if (value === '') return err('INVALID_FORMAT');
  const validator = TAX_ID_VALIDATORS[country];
  const asIs = validator.validate(value);
  if (asIs.ok) return ok({ value, type: asIs.value });
  const { prefix } = validator;
  if (prefix === null || !value.startsWith(prefix)) return asIs;
  const withoutPrefix = value.slice(prefix.length);
  const result = validator.validate(withoutPrefix);
  // The reason returned is the one of the last attempt (step 7).
  return result.ok ? ok({ value: withoutPrefix, type: result.value }) : result;
}
