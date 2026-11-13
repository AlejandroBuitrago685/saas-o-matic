// Public API of @saas-o-matic/domain. Nothing outside this file may be imported from other packages.

export { err, ok } from './shared/result.js';
export type { Err, Ok, Result } from './shared/result.js';
export type { ConfigIssue } from './shared/config-issue.js';

export { COUNTRIES, PLANS, TAX_ID_TYPES } from './catalog/constants.js';
export type { Country, Plan, TaxIdType } from './catalog/constants.js';
export { tariffForPlan, taxRateFor, validateCatalog } from './catalog/validate-catalog.js';
export {
  CATALOG_LIMITS,
  DEFAULT_PAGE_SIZE,
  MAX_API_CALLS_PER_MONTH,
  MAX_CONTACT_EMAIL_LENGTH,
  MAX_PAGE_OFFSET,
  MAX_PAGE_SIZE,
  MAX_SEARCH_QUERY_LENGTH,
  MAX_STORAGE_GB,
  MIN_API_CALLS_PER_MONTH,
  MIN_STORAGE_GB,
} from './catalog/limits.js';
export type { Catalog, CatalogInput } from './catalog/validate-catalog.js';

export { MAX_ACTIVE_USERS, MIN_ACTIVE_USERS } from './pricing/active-users.js';
export { calculatePricing } from './pricing/calculate-pricing.js';
export type { Pricing, PricingError, PricingLine } from './pricing/calculate-pricing.js';
export { validateTariff } from './pricing/validate-tariff.js';
export type { TariffInput, TariffTierInput, ValidTariff } from './pricing/validate-tariff.js';
export { MAX_TAX_RATE_BPS, MIN_TAX_RATE_BPS } from './tax/calculate-tax.js';

export {
  MAX_SLIDER_POSITION,
  MIN_SLIDER_POSITION,
  positionToUsers,
  usersToPosition,
} from './slider/slider-scale.js';

export {
  MAX_COMPANY_NAME_LENGTH,
  MIN_COMPANY_NAME_LENGTH,
  normalizeCompanyName,
} from './text/normalize-company-name.js';
export type { CompanyNameError } from './text/normalize-company-name.js';
export { normalizeForSearch } from './text/normalize-for-search.js';

export { validateTaxId } from './tax-id/validate-tax-id.js';
export { taxIdSearchTerm } from './tax-id/tax-id-search-term.js';
export { MAX_TAX_ID_INPUT_LENGTH, MIN_TAX_ID_INPUT_LENGTH } from './tax-id/tax-id-validator.js';
export type { TaxIdReason, ValidTaxId } from './tax-id/tax-id-validator.js';
export { taxIdRulesFor } from './tax-id/registry.js';
export type { TaxIdRules } from './tax-id/registry.js';
