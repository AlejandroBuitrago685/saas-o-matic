import { normalizeForSearch, taxIdSearchTerm } from '@saas-o-matic/domain';

import type { CustomerList, CustomerRepository, PageRequest, SearchTerms } from './customers.types.js';

export interface CustomerSearchQuery extends PageRequest {
  /** Already trimmed by the contract schema; absent or empty lists every customer. */
  readonly q?: string | undefined;
}

export type SearchCustomers = (query: CustomerSearchQuery) => CustomerList;

const NO_MATCHES: CustomerList = { items: [], total: 0 };

/** The query as the two terms of 04-contrato-api §3.3; `undefined` when neither remains (D-136). */
function termsOf(q: string): SearchTerms | undefined {
  const name = normalizeForSearch(q);
  const taxId = taxIdSearchTerm(q);
  if (name !== '') return { name, taxId };
  return taxId === null ? undefined : { name: null, taxId };
}

/**
 * RF-04: listing and search of customers (D-27). The name is compared without case or accents (ADR-006) and the tax
 * id without separators; a term that normalizes to nothing does not filter, and a query that leaves no term at all
 * has no matches: an empty term would be inside every value and return all the customers (D-136).
 */
export function createSearchCustomers(customers: CustomerRepository): SearchCustomers {
  return ({ q, limit, offset }) => {
    const page = { limit, offset };
    if (q === undefined || q === '') return customers.list(page);
    const terms = termsOf(q);
    return terms === undefined ? NO_MATCHES : customers.list(page, terms);
  };
}
