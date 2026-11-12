import { describe, expect, it } from 'vitest';

import { STANDARD_TARIFF } from '../../test/vectors/pricing.vectors.js';
import { calculatePricing } from '../pricing/calculate-pricing.js';
import { COUNTRIES, PLANS, TAX_ID_TYPES } from './constants.js';
import {
  tariffForPlan,
  taxRateFor,
  validateCatalog,
  type Catalog,
  type CatalogInput,
} from './validate-catalog.js';

/** Rates of 02-reglas-negocio §3.1 and the plan assignment of D-08. */
const VALID_INPUT: CatalogInput = {
  countries: [
    { code: 'ES', taxRateBps: 2100 },
    { code: 'PT', taxRateBps: 2300 },
    { code: 'FR', taxRateBps: 2000 },
    { code: 'DE', taxRateBps: 1900 },
    { code: 'IT', taxRateBps: 2200 },
    { code: 'GB', taxRateBps: 2000 },
    { code: 'US', taxRateBps: 0 },
  ],
  plans: [
    { code: 'STARTER', tariffCode: 'STANDARD' },
    { code: 'BUSINESS', tariffCode: 'STANDARD' },
    { code: 'ENTERPRISE', tariffCode: 'STANDARD' },
  ],
  tariffs: [STANDARD_TARIFF],
};

function catalogOf(input: CatalogInput): Catalog {
  const result = validateCatalog(input);
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
}

function issuesOf(input: CatalogInput): string[] {
  const result = validateCatalog(input);
  return result.ok ? [] : result.error.map((issue) => `${issue.path}: ${issue.message}`);
}

describe('D-07 / D-09 / D-12 closed lists of the domain', () => {
  it('has the countries, plans and tax id types of the specification', () => {
    expect(COUNTRIES).toEqual(['ES', 'PT', 'FR', 'DE', 'IT', 'GB', 'US']);
    expect(PLANS).toEqual(['STARTER', 'BUSINESS', 'ENTERPRISE']);
    expect(TAX_ID_TYPES).toEqual(['DNI', 'NIE', 'CIF', 'VAT', 'EIN']);
  });
});

describe('ADR-005 a valid catalog gives the tariff of each plan and the rate of each country', () => {
  const catalog = catalogOf(VALID_INPUT);

  it('assigns STANDARD to every plan (D-08) and the general rate to every country (D-09)', () => {
    expect(PLANS.map((plan) => tariffForPlan(catalog, plan).code)).toEqual([
      'STANDARD',
      'STANDARD',
      'STANDARD',
    ]);
    expect(taxRateFor(catalog, 'PT')).toBe(2300);
    expect(taxRateFor(catalog, 'US')).toBe(0);
  });
});

describe('AC-06 a plan changes the price only through catalog data (RNF-25, D-08)', () => {
  it('ENTERPRISE with an alternative tariff costs 13 000 for 8 users; the other plans keep STANDARD', () => {
    const catalog = catalogOf({
      ...VALID_INPUT,
      plans: [
        { code: 'STARTER', tariffCode: 'STANDARD' },
        { code: 'BUSINESS', tariffCode: 'STANDARD' },
        { code: 'ENTERPRISE', tariffCode: 'ALTERNATIVE' },
      ],
      tariffs: [
        STANDARD_TARIFF,
        {
          code: 'ALTERNATIVE',
          tiers: [
            { tier: 1, fromUser: 1, toUser: 5, unitPriceCents: 2000 },
            { tier: 2, fromUser: 6, toUser: null, unitPriceCents: 1000 },
          ],
        },
      ],
    });
    const enterprise = calculatePricing(tariffForPlan(catalog, 'ENTERPRISE'), 8, taxRateFor(catalog, 'ES'));
    const starter = calculatePricing(tariffForPlan(catalog, 'STARTER'), 8, taxRateFor(catalog, 'ES'));

    expect(enterprise.ok && enterprise.value.baseCents).toBe(13_000);
    expect(starter.ok && starter.value.baseCents).toBe(8000);
  });
});

describe('AC-07 an invalid catalog is rejected with every datum that fails (RNF-SEC-12, RNF-25)', () => {
  const countries = VALID_INPUT.countries;

  it.each([
    [
      'a tax rate above 10 000 bps',
      { ...VALID_INPUT, countries: [{ code: 'ES', taxRateBps: 10_001 }, ...countries.slice(1)] },
      'countries[ES].taxRateBps: must be an integer from 0 to 10 000 (basis points)',
    ],
    [
      'a decimal tax rate',
      { ...VALID_INPUT, countries: [{ code: 'ES', taxRateBps: 2100.5 }, ...countries.slice(1)] },
      'countries[ES].taxRateBps: must be an integer from 0 to 10 000 (basis points)',
    ],
    ['a missing country', { ...VALID_INPUT, countries: countries.slice(0, -1) }, 'countries: missing US'],
    [
      'a duplicated country',
      { ...VALID_INPUT, countries: [...countries, { code: 'ES', taxRateBps: 2100 }] },
      'countries[ES]: is duplicated',
    ],
    [
      'an unknown country',
      { ...VALID_INPUT, countries: [...countries, { code: 'XX', taxRateBps: 0 }] },
      'countries[XX]: is not a country of the catalog (ES, PT, FR, DE, IT, GB, US)',
    ],
    [
      'a plan with a tariff that does not exist',
      {
        ...VALID_INPUT,
        plans: [...VALID_INPUT.plans.slice(0, 2), { code: 'ENTERPRISE', tariffCode: 'PREMIUM' }],
      },
      'plans[ENTERPRISE].tariffCode: there is no tariff PREMIUM',
    ],
    ['a missing plan', { ...VALID_INPUT, plans: VALID_INPUT.plans.slice(1) }, 'plans: missing STARTER'],
    [
      'a duplicated tariff code',
      { ...VALID_INPUT, tariffs: [STANDARD_TARIFF, STANDARD_TARIFF] },
      'tariffs[STANDARD]: is duplicated',
    ],
    [
      'an invalid tariff',
      { ...VALID_INPUT, tariffs: [{ ...STANDARD_TARIFF, tiers: STANDARD_TARIFF.tiers.slice(1) }] },
      'tariffs[STANDARD].tiers[0].fromUser: must be 1 (the first tier starts at user 1)',
    ],
  ] as [string, CatalogInput, string][])('rejects %s', (_case, input, issue) => {
    expect(issuesOf(input)).toContain(issue);
  });

  it('reports every problem at once', () => {
    const input: CatalogInput = {
      countries: countries.slice(1),
      plans: VALID_INPUT.plans.slice(1),
      tariffs: [{ ...STANDARD_TARIFF, tiers: [] }],
    };

    expect(issuesOf(input)).toEqual([
      'countries: missing ES',
      'plans: missing STARTER',
      'tariffs[STANDARD].tiers: must have at least one tier',
    ]);
  });
});
