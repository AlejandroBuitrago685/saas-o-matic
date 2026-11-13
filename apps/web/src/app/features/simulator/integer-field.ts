import { err, ok, type Result } from '@saas-o-matic/domain';

export type IntegerFieldError = 'REQUIRED' | 'INVALID_TYPE' | 'OUT_OF_RANGE';

export interface IntegerRange {
  readonly min: number;
  readonly max: number;
}

/** Digits only: no sign, no decimals, no exponent, no thousands separator. */
const DIGITS = /^\d+$/;

/**
 * Text of a numeric field of the simulator → integer (spec 05 §3.4). A value out of range or not whole is an
 * error of the field and is never corrected silently: the projection keeps the last valid value.
 */
export function parseIntegerField(text: string, range: IntegerRange): Result<number, IntegerFieldError> {
  const trimmed = text.trim();
  if (trimmed === '') return err('REQUIRED');
  if (!DIGITS.test(trimmed)) return err('INVALID_TYPE');
  const value = Number(trimmed);
  return value < range.min || value > range.max ? err('OUT_OF_RANGE') : ok(value);
}
