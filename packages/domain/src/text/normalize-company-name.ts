import { err, ok, type Result } from '../shared/result.js';

export const MIN_COMPANY_NAME_LENGTH = 2;
export const MAX_COMPANY_NAME_LENGTH = 200;

/** Codes shared with the contract's schema errors (04-contrato-api §2). */
export type CompanyNameError = 'INVALID_FORMAT' | 'TOO_SHORT' | 'TOO_LONG';

/**
 * Control (Cc), format (Cf: zero-width, direction marks, BOM) and line or paragraph separators (D-94), plus lone
 * surrogates (Cs): they are not text, and the database would store U+FFFD instead of what was validated.
 */
const FORBIDDEN = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Cs}]/u;
const SPACE_RUN = /\p{Zs}+/gu;

/**
 * Company name as it is stored and shown (D-34, D-94): NFC; no control or format characters; no spaces at the
 * ends and one space between words; 2 to 200 code points (not UTF-16 units).
 */
export function normalizeCompanyName(input: string): Result<string, CompanyNameError> {
  const composed = input.normalize('NFC');
  if (FORBIDDEN.test(composed)) return err('INVALID_FORMAT');
  const name = composed.replace(SPACE_RUN, ' ').trim();
  // eslint-disable-next-line @typescript-eslint/no-misused-spread -- D-94: the length is counted in code points on purpose, not graphemes.
  const length = [...name].length;
  if (length < MIN_COMPANY_NAME_LENGTH) return err('TOO_SHORT');
  if (length > MAX_COMPANY_NAME_LENGTH) return err('TOO_LONG');
  return ok(name);
}
