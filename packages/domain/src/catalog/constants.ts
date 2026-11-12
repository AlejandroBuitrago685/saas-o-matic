// Closed lists of the business (ADR-001): the contract, the catalog, the web and the database CHECKs take them from
// here, so they cannot diverge.

/** Countries of the catalog, ISO 3166-1 alpha-2 (D-09). */
export const COUNTRIES = ['ES', 'PT', 'FR', 'DE', 'IT', 'GB', 'US'] as const;
export type Country = (typeof COUNTRIES)[number];

/** Subscription plans (D-07). They change the price only through the tariff assigned to them (D-08). */
export const PLANS = ['STARTER', 'BUSINESS', 'ENTERPRISE'] as const;
export type Plan = (typeof PLANS)[number];

/** Types of tax identifier, derived from its validation (D-12, D-16). */
export const TAX_ID_TYPES = ['DNI', 'NIE', 'CIF', 'VAT', 'EIN'] as const;
export type TaxIdType = (typeof TAX_ID_TYPES)[number];
