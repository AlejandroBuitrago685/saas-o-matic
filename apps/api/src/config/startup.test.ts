import { tariffForPlan, taxRateFor, type CatalogInput } from '@saas-o-matic/domain';
import { describe, expect, it } from 'vitest';

import { CATALOG_DATA } from './catalog.data.js';
import { prepareStartup } from './startup.js';

const errorOf = (catalog: CatalogInput, env: Record<string, string> = {}): string => {
  const result = prepareStartup({ env, catalog });
  return result.ok ? '' : result.error;
};

describe('AC-07 an invalid business catalog stops the startup and names the datum (RNF-SEC-12, RNF-25)', () => {
  it('starts with the catalog of the repository: STANDARD for every plan and the rates of 02-reglas §3.1', () => {
    const result = prepareStartup({ env: {} });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(tariffForPlan(result.value.catalog, 'ENTERPRISE').code).toBe('STANDARD');
      expect(taxRateFor(result.value.catalog, 'PT')).toBe(2300);
    }
  });

  it('rejects a tariff with a gap between tiers', () => {
    const [standard] = CATALOG_DATA.tariffs;
    const broken: CatalogInput = {
      ...CATALOG_DATA,
      tariffs: [
        {
          code: 'STANDARD',
          tiers: (standard?.tiers ?? []).map((tier) => (tier.tier === 2 ? { ...tier, fromUser: 12 } : tier)),
        },
      ],
    };

    expect(errorOf(broken)).toBe(
      'Invalid business catalog -> tariffs[STANDARD].tiers[1].fromUser: must be 11 (contiguous with the previous tier)',
    );
  });

  it('rejects a tax rate outside 0–10 000 bps', () => {
    const broken: CatalogInput = {
      ...CATALOG_DATA,
      countries: CATALOG_DATA.countries.map((country) =>
        country.code === 'IT' ? { ...country, taxRateBps: 10_001 } : country,
      ),
    };

    expect(errorOf(broken)).toContain('countries[IT].taxRateBps: must be an integer from 0 to 10 000');
  });

  it('reports the environment first: an invalid variable never gets to the catalog', () => {
    expect(errorOf(CATALOG_DATA, { PORT: 'abc' })).toMatch(/^Invalid environment configuration -> PORT:/);
  });
});
