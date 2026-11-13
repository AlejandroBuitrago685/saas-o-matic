import { MAX_ACTIVE_USERS, MIN_ACTIVE_USERS } from '../pricing/active-users.js';
import { MAX_TAX_ID_INPUT_LENGTH, MIN_TAX_ID_INPUT_LENGTH } from '../tax-id/tax-id-validator.js';
import { MAX_COMPANY_NAME_LENGTH, MIN_COMPANY_NAME_LENGTH } from '../text/normalize-company-name.js';

// Limits of the informative fields, the email, the search and the pagination (02-reglas §1, 04-contrato §1.1 and
// §3.3). Business constants live in the domain (ADR-001, D-108): the contract, the API and the web take them from here.
export const MIN_STORAGE_GB = 0;
export const MAX_STORAGE_GB = 100_000;
export const MIN_API_CALLS_PER_MONTH = 0;
export const MAX_API_CALLS_PER_MONTH = 1_000_000_000;
export const MAX_CONTACT_EMAIL_LENGTH = 254;
export const MAX_SEARCH_QUERY_LENGTH = 100;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const MAX_PAGE_OFFSET = 1_000_000;

const range = (min: number, max: number): Readonly<{ min: number; max: number }> =>
  Object.freeze({ min, max });

/** Every limit, as `GET /catalog` publishes it (04-contrato §3.1). */
export const CATALOG_LIMITS = Object.freeze({
  activeUsers: range(MIN_ACTIVE_USERS, MAX_ACTIVE_USERS),
  storageGb: range(MIN_STORAGE_GB, MAX_STORAGE_GB),
  apiCallsPerMonth: range(MIN_API_CALLS_PER_MONTH, MAX_API_CALLS_PER_MONTH),
  companyName: range(MIN_COMPANY_NAME_LENGTH, MAX_COMPANY_NAME_LENGTH),
  contactEmail: Object.freeze({ max: MAX_CONTACT_EMAIL_LENGTH }),
  taxId: range(MIN_TAX_ID_INPUT_LENGTH, MAX_TAX_ID_INPUT_LENGTH),
  searchQuery: Object.freeze({ max: MAX_SEARCH_QUERY_LENGTH }),
  pageSize: Object.freeze({ default: DEFAULT_PAGE_SIZE, max: MAX_PAGE_SIZE }),
});
