import type { TariffTierInput } from '@saas-o-matic/domain';

import { formatInteger } from './integer.pipe';
import { formatMoney } from './money.pipe';

/** A tier of the tariff in words: who it covers and what each of those users costs. */
export interface TariffTierText {
  readonly users: string;
  readonly price: string;
}

function usersText({ fromUser, toUser }: TariffTierInput): string {
  const from = formatInteger(fromUser);
  if (toUser === null) return fromUser === 1 ? 'Todos los usuarios' : `A partir del usuario ${from}`;
  const to = formatInteger(toUser);
  if (fromUser === toUser) return fromUser === 1 ? 'Primer usuario' : `Usuario ${from}`;
  return fromUser === 1 ? `Primeros ${to} usuarios` : `Usuarios ${from}–${to}`;
}

/**
 * «Primeros 10 usuarios · 10,00 €/usuario» (D-191): the tariff of the simulator, read from the catalog, never written
 * by hand. The price is in EUR, because it is the price of the tariff (spec 05 §3.4).
 */
export function tariffTierText(tier: TariffTierInput): TariffTierText {
  return { users: usersText(tier), price: `${formatMoney(tier.unitPriceCents)}/usuario` };
}
