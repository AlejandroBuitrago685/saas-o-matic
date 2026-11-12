import { err, ok, type Result } from '../shared/result.js';

export type RoundingError = 'NOT_A_SAFE_INTEGER' | 'OUT_OF_RANGE';

/**
 * `numerator / denominator` rounded to the nearest integer, halves up (commercial rounding, D-10).
 * Integers only: quotient and remainder, never `Math.round` on a decimal (D-91), so it is exact for every safe integer.
 * Amounts are never negative: the numerator must be ≥ 0 and the denominator > 0.
 */
export function roundHalfUpDivide(numerator: number, denominator: number): Result<number, RoundingError> {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator))
    return err('NOT_A_SAFE_INTEGER');
  if (numerator < 0 || denominator <= 0) return err('OUT_OF_RANGE');
  const remainder = numerator % denominator;
  const quotient = (numerator - remainder) / denominator;
  // `remainder >= denominator - remainder` is `2 × remainder >= denominator` without overflowing.
  return ok(remainder >= denominator - remainder ? quotient + 1 : quotient);
}
