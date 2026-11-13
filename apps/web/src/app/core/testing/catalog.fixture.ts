import type { CatalogResponse, CustomerResponse } from '@saas-o-matic/contract';

/**
 * GET /catalog as the API serves it with the default configuration (copied from the running API, 2026-11-13).
 * Test-only: excluded from the app build (tsconfig.app.json).
 */
export const CATALOG_FIXTURE: CatalogResponse = {
  countries: [
    { code: 'ES', taxRateBps: 2100, taxIdTypes: ['DNI', 'NIE', 'CIF'], taxIdPrefix: 'ES' },
    { code: 'PT', taxRateBps: 2300, taxIdTypes: ['VAT'], taxIdPrefix: 'PT' },
    { code: 'FR', taxRateBps: 2000, taxIdTypes: ['VAT'], taxIdPrefix: 'FR' },
    { code: 'DE', taxRateBps: 1900, taxIdTypes: ['VAT'], taxIdPrefix: 'DE' },
    { code: 'IT', taxRateBps: 2200, taxIdTypes: ['VAT'], taxIdPrefix: 'IT' },
    { code: 'GB', taxRateBps: 2000, taxIdTypes: ['VAT'], taxIdPrefix: 'GB' },
    { code: 'US', taxRateBps: 0, taxIdTypes: ['EIN'], taxIdPrefix: null },
  ],
  plans: [
    { code: 'STARTER', tariffCode: 'STANDARD' },
    { code: 'BUSINESS', tariffCode: 'STANDARD' },
    { code: 'ENTERPRISE', tariffCode: 'STANDARD' },
  ],
  tariffs: [
    {
      code: 'STANDARD',
      currency: 'EUR',
      tiers: [
        { tier: 1, fromUser: 1, toUser: 10, unitPriceCents: 1000 },
        { tier: 2, fromUser: 11, toUser: 50, unitPriceCents: 800 },
        { tier: 3, fromUser: 51, toUser: null, unitPriceCents: 500 },
      ],
    },
  ],
  limits: {
    activeUsers: { min: 1, max: 10000 },
    storageGb: { min: 0, max: 100000 },
    apiCallsPerMonth: { min: 0, max: 1000000000 },
    companyName: { min: 2, max: 200 },
    contactEmail: { max: 254 },
    taxId: { min: 1, max: 32 },
    searchQuery: { max: 100 },
    pageSize: { default: 20, max: 100 },
  },
};

export const CUSTOMER_FIXTURE: CustomerResponse = {
  id: '019a7b2c-4d5e-7f00-8a1b-2c3d4e5f6a7b',
  companyName: 'Industrias Atlánticas del Norte, S.L.',
  taxId: 'B12345674',
  taxIdType: 'CIF',
  country: 'ES',
  contactEmail: 'compras@industrias-atlanticas.example',
  plan: 'BUSINESS',
  createdAt: '2026-11-13T10:20:00.000Z',
};

/** Problem Details instance used by the error fixtures. */
export const INSTANCE_FIXTURE = 'urn:uuid:019a7b2c-4d5e-7f00-8a1b-2c3d4e5f6a7b';
