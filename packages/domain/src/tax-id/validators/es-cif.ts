import type { TaxIdType } from '../../catalog/constants.js';
import { err, ok, type Result } from '../../shared/result.js';
import type { TaxIdReason } from '../tax-id-validator.js';

/**
 * CIF check character (03-validacion-fiscal §3.4). The Orden EHA/451/2008 defines the structure and the keys but not
 * this algorithm: it is the one in general use, checked against the NIF published by the AEAT (Q2826000H) and four
 * listed companies (D-13, D-50).
 */
const CONTROL_LETTERS = 'JABCDEFGHI';
/** Keys whose control is only a digit, or only a letter; the rest admit both (D-13). */
const DIGIT_ONLY_KEYS = 'ABEH';
const LETTER_ONLY_KEYS = 'NPQRSW';

const sumOfDigits = (value: number): number => Math.floor(value / 10) + (value % 10);

/** `e` of §3.4: even positions added as they are, odd positions doubled and their digits added. */
function controlDigitOf(sevenDigits: string): number {
  const total = Array.from(sevenDigits, Number).reduce(
    // Index 0 is position d1 (odd), index 1 is d2 (even)…
    (sum, digit, index) => sum + (index % 2 === 1 ? digit : sumOfDigits(digit * 2)),
    0,
  );
  return (10 - (total % 10)) % 10;
}

/** Validates the control of a CIF already classified by structure: key, seven digits and one control character. */
export function validateCif(
  key: string,
  sevenDigits: string,
  control: string,
): Result<TaxIdType, TaxIdReason> {
  const expected = controlDigitOf(sevenDigits);
  const isExpectedDigit = control === String(expected) && !LETTER_ONLY_KEYS.includes(key);
  const isExpectedLetter = control === CONTROL_LETTERS.charAt(expected) && !DIGIT_ONLY_KEYS.includes(key);
  return isExpectedDigit || isExpectedLetter ? ok('CIF') : err('INVALID_CHECK');
}
