import type { TariffTierInput } from '@saas-o-matic/domain';
import { describe, expect, it } from 'vitest';

import { tariffTierText } from './tariff-tier-text';

/** The tests compare without telling apart the kind of space (spec 05 §4.5). */
const plain = (text: string): string => text.replace(/\s/g, ' ');

const tier = (fromUser: number, toUser: number | null, unitPriceCents = 1000): TariffTierInput => ({
  tier: 1,
  fromUser,
  toUser,
  unitPriceCents,
});

const text = (input: TariffTierInput): string => {
  const { users, price } = tariffTierText(input);
  return plain(`${users} · ${price}`);
};

describe('D-191 the tariff of the simulator in words, from the catalog', () => {
  it('AC-76 describes the three tiers of the standard tariff (10 €, 8 € and 5 € per user)', () => {
    expect([tier(1, 10, 1000), tier(11, 50, 800), tier(51, null, 500)].map(text)).toEqual([
      'Primeros 10 usuarios · 10,00 €/usuario',
      'Usuarios 11–50 · 8,00 €/usuario',
      'A partir del usuario 51 · 5,00 €/usuario',
    ]);
  });

  it.each([
    [tier(1, null), 'Todos los usuarios · 10,00 €/usuario'],
    [tier(1, 1), 'Primer usuario · 10,00 €/usuario'],
    [tier(2, 2), 'Usuario 2 · 10,00 €/usuario'],
    [tier(1001, 10_000, 250), 'Usuarios 1001–10.000 · 2,50 €/usuario'],
    [tier(10_001, null, 199), 'A partir del usuario 10.001 · 1,99 €/usuario'],
  ])('reads any other tariff the catalog may hold: %o → %s', (input, expected) => {
    expect(text(input)).toBe(expected);
  });
});
