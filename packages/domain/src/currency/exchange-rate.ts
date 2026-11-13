import { err, ok, type Result } from '../shared/result.js';

/** An exchange rate EUR → X as an exact decimal: `digits / 10^scale` (D-144). */
export interface ExchangeRate {
  readonly digits: bigint;
  readonly scale: number;
}

/**
 * Reads a rate of the provider as an exact decimal. `String(rate)` is the shortest text that gives back the same
 * number, so `1.111287` stays 1 111 287 / 10^6 instead of the binary fraction it is stored as; exponential notation
 * (`1.5e-7`, `1e+21`) is accepted too. Only finite rates greater than 0 are valid (spec 05 §4.3).
 */
export function toExchangeRate(value: number): Result<ExchangeRate, 'INVALID_RATE'> {
  if (!Number.isFinite(value) || value <= 0) return err('INVALID_RATE');
  const text = String(value);
  const exponentAt = text.indexOf('e');
  const mantissa = exponentAt === -1 ? text : text.slice(0, exponentAt);
  const exponent = exponentAt === -1 ? 0 : Number(text.slice(exponentAt + 1));
  const pointAt = mantissa.indexOf('.');
  const fractionLength = pointAt === -1 ? 0 : mantissa.length - pointAt - 1;
  const digits = BigInt(mantissa.replace('.', ''));
  const scale = fractionLength - exponent;
  return ok(scale >= 0 ? { digits, scale } : { digits: digits * 10n ** BigInt(-scale), scale: 0 });
}
