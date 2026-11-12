import { err, ok, type Result } from '../shared/result.js';
import { calculateTax, isValidTaxRateBps } from '../tax/calculate-tax.js';
import { MAX_ACTIVE_USERS, MIN_ACTIVE_USERS } from './active-users.js';
import type { TariffTierInput, ValidTariff } from './validate-tariff.js';

export interface PricingLine {
  readonly tier: number;
  readonly fromUser: number;
  readonly toUser: number | null;
  readonly units: number;
  readonly unitPriceCents: number;
  readonly subtotalCents: number;
}

/** Monthly price in EUR cents (02-reglas-negocio §1.2): the snapshot a simulation stores. */
export interface Pricing {
  readonly tariffCode: string;
  /** Only the tiers with users. */
  readonly tiers: readonly PricingLine[];
  readonly baseCents: number;
  readonly taxRateBps: number;
  readonly taxCents: number;
  readonly totalCents: number;
}

export type PricingError = 'INVALID_TYPE' | 'OUT_OF_RANGE' | 'INVALID_TAX_RATE' | 'AMOUNT_OUT_OF_RANGE';

function line(tier: TariffTierInput, activeUsers: number): PricingLine {
  const lastUser = Math.min(activeUsers, tier.toUser ?? activeUsers);
  const units = Math.max(0, lastUser - tier.fromUser + 1);
  const { tier: number, fromUser, toUser, unitPriceCents } = tier;
  return { tier: number, fromUser, toUser, units, unitPriceCents, subtotalCents: units * unitPriceCents };
}

/**
 * Tax and total of a base, or undefined when an amount would leave the safe integer range (D-91). Every subtotal is
 * ≥ 0, so an unsafe subtotal also makes the base unsafe.
 */
function taxAndTotal(
  baseCents: number,
  taxRateBps: number,
): { taxCents: number; totalCents: number } | undefined {
  if (!Number.isSafeInteger(baseCents)) return undefined;
  const tax = calculateTax(baseCents, taxRateBps);
  if (!tax.ok) return undefined;
  const totalCents = baseCents + tax.value;
  return Number.isSafeInteger(totalCents) ? { taxCents: tax.value, totalCents } : undefined;
}

/**
 * Cumulative tier pricing (02-reglas-negocio §2.2, not volume pricing) plus one tax on the whole base (§3.2).
 * The same function runs in the API, which stores the result, and in the web, which projects it (ADR-008).
 */
export function calculatePricing(
  tariff: ValidTariff,
  activeUsers: number,
  taxRateBps: number,
): Result<Pricing, PricingError> {
  if (!Number.isInteger(activeUsers)) return err('INVALID_TYPE');
  if (activeUsers < MIN_ACTIVE_USERS || activeUsers > MAX_ACTIVE_USERS) return err('OUT_OF_RANGE');
  if (!isValidTaxRateBps(taxRateBps)) return err('INVALID_TAX_RATE');
  const tiers = tariff.tiers.map((tier) => line(tier, activeUsers)).filter((tierLine) => tierLine.units > 0);
  const baseCents = tiers.reduce((sum, tierLine) => sum + tierLine.subtotalCents, 0);
  const amounts = taxAndTotal(baseCents, taxRateBps);
  if (amounts === undefined) return err('AMOUNT_OUT_OF_RANGE');
  return ok({ tariffCode: tariff.code, tiers, baseCents, taxRateBps, ...amounts });
}
