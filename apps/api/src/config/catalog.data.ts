import type { CatalogInput } from '@saas-o-matic/domain';

/**
 * Business catalog (ADR-005): typed code, reviewed like any other change and validated at startup with
 * `validateCatalog` (AC-07). Changing a rate or a price means a deploy (AC-46).
 * - Rates: general VAT rate of each country, 02-reglas-negocio §3.1 (European Commission «VAT rules and rates» and
 *   GOV.UK «VAT rates», consulted on 2026-11-12); the US has no federal VAT (PN-03).
 * - Tariff STANDARD of the statement (§2.1); every plan uses it until business says otherwise (D-08, PN-02).
 */
export const CATALOG_DATA: CatalogInput = {
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
  tariffs: [
    {
      code: 'STANDARD',
      tiers: [
        { tier: 1, fromUser: 1, toUser: 10, unitPriceCents: 1000 },
        { tier: 2, fromUser: 11, toUser: 50, unitPriceCents: 800 },
        { tier: 3, fromUser: 51, toUser: null, unitPriceCents: 500 },
      ],
    },
  ],
};
