import type { ConfigIssue } from '../shared/config-issue.js';
import { err, ok, type Result } from '../shared/result.js';

export interface TariffTierInput {
  readonly tier: number;
  readonly fromUser: number;
  /** `null` only in the last tier, which has no upper limit. */
  readonly toUser: number | null;
  readonly unitPriceCents: number;
}

export interface TariffInput {
  readonly code: string;
  readonly tiers: readonly TariffTierInput[];
}

declare const VALID_TARIFF: unique symbol;

/** A tariff that passed `validateTariff`: the only kind `calculatePricing` accepts (D-95). */
export type ValidTariff = TariffInput & { readonly [VALID_TARIFF]: true };

/** Prices must be > 0 in this delivery (D-98): free tiers are an open business question (PN-05). */
const isPositiveCents = (value: number): boolean => Number.isSafeInteger(value) && value > 0;

/** `previous` is undefined for the first tier. */
function fromUserIssue(tier: TariffTierInput, previous: TariffTierInput | undefined): string | undefined {
  if (previous === undefined) {
    return tier.fromUser === 1 ? undefined : 'must be 1 (the first tier starts at user 1)';
  }
  // An open previous tier is reported on its own toUser: there is no "next" user to compare with.
  if (previous.toUser === null || tier.fromUser === previous.toUser + 1) return undefined;
  return `must be ${String(previous.toUser + 1)} (contiguous with the previous tier)`;
}

function toUserIssue(tier: TariffTierInput, isLast: boolean): string | undefined {
  if (isLast) return tier.toUser === null ? undefined : 'the last tier must be open (null)';
  if (tier.toUser === null) return 'only the last tier can be open (null)';
  return Number.isSafeInteger(tier.toUser) && tier.toUser >= tier.fromUser
    ? undefined
    : 'must be an integer ≥ fromUser';
}

interface TariffContext {
  readonly tiers: readonly TariffTierInput[];
  readonly path: string;
}

function tierIssues({ tiers, path }: TariffContext, tier: TariffTierInput, index: number): ConfigIssue[] {
  const checks: [string, string | undefined][] = [
    [
      'tier',
      tier.tier === index + 1 ? undefined : `must be ${String(index + 1)} (tiers are numbered in order)`,
    ],
    ['fromUser', fromUserIssue(tier, index === 0 ? undefined : tiers[index - 1])],
    ['toUser', toUserIssue(tier, index === tiers.length - 1)],
    [
      'unitPriceCents',
      isPositiveCents(tier.unitPriceCents) ? undefined : 'must be an integer > 0 (cents, D-98)',
    ],
  ];
  return checks.flatMap(([field, message]) =>
    message === undefined ? [] : [{ path: `${path}.tiers[${String(index)}].${field}`, message }],
  );
}

/**
 * Checks the tariff rules of 02-reglas-negocio §2.1 and returns **every** problem, each with its path (AC-07).
 * The valid tariff is a frozen copy: later changes to the input cannot break it.
 */
export function validateTariff(input: TariffInput): Result<ValidTariff, readonly ConfigIssue[]> {
  const path = `tariffs[${input.code}]`;
  const issues =
    input.tiers.length === 0
      ? [{ path: `${path}.tiers`, message: 'must have at least one tier' }]
      : input.tiers.flatMap((tier, index) => tierIssues({ tiers: input.tiers, path }, tier, index));
  if (issues.length > 0) return err(issues);
  // Explicit fields: unknown properties of the input never reach a ValidTariff or a PricingLine.
  const tiers = Object.freeze(
    input.tiers.map(({ tier, fromUser, toUser, unitPriceCents }) =>
      Object.freeze({ tier, fromUser, toUser, unitPriceCents }),
    ),
  );
  return ok(Object.freeze({ code: input.code, tiers }) as ValidTariff);
}
