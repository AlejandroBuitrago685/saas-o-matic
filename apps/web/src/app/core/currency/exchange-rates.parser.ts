import {
  err,
  type ExchangeRate,
  FOREIGN_CURRENCIES,
  type ForeignCurrency,
  ok,
  type Result,
  toExchangeRate,
} from '@saas-o-matic/domain';

/** Validated rates EUR → X: only the currencies whose rate is valid (CL-31). */
export interface ExchangeRates {
  /** When the provider updated them: `time_last_update_unix`, in milliseconds. */
  readonly updatedAt: number;
  readonly rates: Readonly<Partial<Record<ForeignCurrency, ExchangeRate>>>;
}

/** A plain object, not `null` nor an array. */
export function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function validRates(rates: Readonly<Record<string, unknown>>): ExchangeRates['rates'] {
  const valid: Partial<Record<ForeignCurrency, ExchangeRate>> = {};
  for (const currency of FOREIGN_CURRENCIES) {
    const value = rates[currency];
    const rate = typeof value === 'number' ? toExchangeRate(value) : undefined;
    if (rate?.ok === true) valid[currency] = rate.value;
  }
  return valid;
}

/**
 * The answer of the exchange-rate API is accepted only if (spec 05 §4.3, RNF-SEC-13): `result` is `"success"` (the
 * provider also reports errors with a 200, CL-29), `base_code` is `"EUR"`, `time_last_update_unix` is a positive
 * integer, and `rates` is an object with `EUR` = 1. A currency whose rate is missing or is not a finite number
 * greater than 0 is left out on its own (CL-31). Unused fields are ignored. Hand-written, so Zod stays out of the
 * bundle (06-frontend §4).
 */
export function parseExchangeRates(payload: unknown): Result<ExchangeRates, 'INVALID_RESPONSE'> {
  if (!isRecord(payload)) return err('INVALID_RESPONSE');
  const { result, base_code: baseCode, time_last_update_unix: updatedAtUnix, rates } = payload;
  if (result !== 'success' || baseCode !== 'EUR') return err('INVALID_RESPONSE');
  if (!isPositiveInteger(updatedAtUnix)) return err('INVALID_RESPONSE');
  if (!isRecord(rates) || rates['EUR'] !== 1) return err('INVALID_RESPONSE');
  return ok({ updatedAt: updatedAtUnix * 1000, rates: validRates(rates) });
}
