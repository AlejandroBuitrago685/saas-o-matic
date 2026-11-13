import { roundHalfUpDivideBig } from '../money/round-half-up.js';
import { err, ok, type Result } from '../shared/result.js';
import { CURRENCY_DECIMALS, type Currency, type ForeignCurrency } from './currencies.js';
import type { ExchangeRate } from './exchange-rate.js';

/** Where the amounts go: EUR needs no rate (02-reglas §4, step 4); any other currency needs one. */
export interface ForeignTarget {
  readonly currency: ForeignCurrency;
  readonly rate: ExchangeRate;
}
export type ConversionTarget = { readonly currency: 'EUR' } | ForeignTarget;
export const EUR_TARGET: ConversionTarget = { currency: 'EUR' };

/** The leaf items of a pricing: what both `Pricing` and the snapshot a simulation stores have. */
export interface ConvertibleAmounts {
  readonly tiers: readonly { readonly subtotalCents: number }[];
  readonly taxCents: number;
}

/** A pricing in minor units of `currency`. The base and the total are sums of converted items, so they add up. */
export interface ConvertedPricing {
  readonly currency: Currency;
  readonly tierSubtotals: readonly number[];
  readonly base: number;
  readonly tax: number;
  readonly total: number;
}

export type ConversionError = 'INVALID_AMOUNT' | 'AMOUNT_OUT_OF_RANGE';

/**
 * One amount in EUR cents → minor units of the target, rounded half up to the decimals of the currency (D-20):
 * `cents × digits × 10^decimals / (100 × 10^scale)`, in `bigint` so it is exact (D-144).
 */
export function convertAmount(cents: number, target: ConversionTarget): Result<number, ConversionError> {
  if (!Number.isSafeInteger(cents) || cents < 0) return err('INVALID_AMOUNT');
  if (target.currency === 'EUR') return ok(cents);
  const { digits, scale } = target.rate;
  const numerator = BigInt(cents) * digits * 10n ** BigInt(CURRENCY_DECIMALS[target.currency]);
  const converted = roundHalfUpDivideBig(numerator, 100n * 10n ** BigInt(scale));
  return converted <= BigInt(Number.MAX_SAFE_INTEGER) ? ok(Number(converted)) : err('AMOUNT_OUT_OF_RANGE');
}

/**
 * The conversion rule of every view (D-20, 02-reglas §4): each tier subtotal and the tax are converted on their own;
 * the base shown is the sum of the converted tiers and the total is that base plus the converted tax.
 */
export function convertPricing(
  amounts: ConvertibleAmounts,
  target: ConversionTarget,
): Result<ConvertedPricing, ConversionError> {
  const tierSubtotals: number[] = [];
  for (const tier of amounts.tiers) {
    const subtotal = convertAmount(tier.subtotalCents, target);
    if (!subtotal.ok) return subtotal;
    tierSubtotals.push(subtotal.value);
  }
  const tax = convertAmount(amounts.taxCents, target);
  if (!tax.ok) return tax;
  const base = tierSubtotals.reduce((sum, subtotal) => sum + subtotal, 0);
  const total = base + tax.value;
  if (!Number.isSafeInteger(base) || !Number.isSafeInteger(total)) return err('AMOUNT_OUT_OF_RANGE');
  return ok({ currency: target.currency, tierSubtotals, base, tax: tax.value, total });
}
