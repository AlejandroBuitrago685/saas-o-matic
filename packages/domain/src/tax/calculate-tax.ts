import { roundHalfUpDivide } from '../money/round-half-up.js';
import { err, type Result } from '../shared/result.js';

/** Tax rates are basis points: 2 100 = 21 % (D-10). */
export const BASIS_POINTS_PER_UNIT = 10_000;
export const MIN_TAX_RATE_BPS = 0;
export const MAX_TAX_RATE_BPS = 10_000;

export type TaxError = 'INVALID_BASE' | 'INVALID_TAX_RATE';

export function isValidTaxRateBps(taxRateBps: number): boolean {
  return Number.isInteger(taxRateBps) && taxRateBps >= MIN_TAX_RATE_BPS && taxRateBps <= MAX_TAX_RATE_BPS;
}

/**
 * Tax in cents on the whole base, rounded once, half up (02-reglas-negocio §3.2): never per tier.
 * The largest real base (5 017 000) × 10 000 bps stays far below 2⁵³; anything that does not is rejected.
 */
export function calculateTax(baseCents: number, taxRateBps: number): Result<number, TaxError> {
  if (!isValidTaxRateBps(taxRateBps)) return err('INVALID_TAX_RATE');
  if (!Number.isSafeInteger(baseCents) || baseCents < 0) return err('INVALID_BASE');
  const tax = roundHalfUpDivide(baseCents * taxRateBps, BASIS_POINTS_PER_UNIT);
  return tax.ok ? tax : err('INVALID_BASE');
}
