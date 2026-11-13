import type { PricingLine } from '@saas-o-matic/domain';

import { formatMoney } from './money.pipe';

/** The fields a label needs: a line of the projection and a line of a saved simulation both have them. */
export type TierLine = Pick<PricingLine, 'tier' | 'fromUser' | 'toUser' | 'units' | 'unitPriceCents'>;

/**
 * «Tramo 2 · usuarios 11–50 · 5 × 8,00 €» (spec 05 §3.4): the tier's range, the users in it and the unit price,
 * always in EUR because it is the price of the tariff. The last tier has no upper limit. Shared by the projection
 * and the breakdown of the history (spec 05 §3.5).
 */
export function tierLabel(line: TierLine): string {
  const users =
    line.toUser === null
      ? `desde ${String(line.fromUser)}`
      : `${String(line.fromUser)}–${String(line.toUser)}`;
  return `Tramo ${String(line.tier)} · usuarios ${users} · ${String(line.units)} × ${formatMoney(line.unitPriceCents)}`;
}
