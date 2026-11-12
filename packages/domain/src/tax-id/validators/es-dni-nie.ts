import type { TaxIdType } from '../../catalog/constants.js';
import { err, ok, type Result } from '../../shared/result.js';
import type { TaxIdReason } from '../tax-id-validator.js';

/**
 * Official table of the check letter, by remainder of the number divided by 23 (03-validacion-fiscal §3.2). Source:
 * Ministerio del Interior, «Cálculo del dígito de control del NIF/NIE». I, Ñ, O and U never appear.
 */
const CHECK_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';

/** Checks the letter of an 8-digit number: a DNI, or a NIE once its first letter is replaced by a digit. */
export function validateCheckLetter(
  eightDigits: string,
  letter: string,
  type: Extract<TaxIdType, 'DNI' | 'NIE'>,
): Result<TaxIdType, TaxIdReason> {
  return CHECK_LETTERS.charAt(Number(eightDigits) % 23) === letter ? ok(type) : err('INVALID_CHECK');
}
