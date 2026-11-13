import type { CustomerResponse, CustomerSummary as CustomerSummaryResponse } from '@saas-o-matic/contract';

import type { Customer, CustomerSummary, NewCustomer } from './customers.types.js';

/** A row of `customers`, by shape: only the repository may import the Drizzle schema (03-backend §2). */
export interface CustomerRow extends Omit<NewCustomer, 'createdAt'> {
  /** Unix milliseconds, UTC. */
  readonly createdAt: number;
}

/** The columns the listing reads (D-42): the row without the email and without the search key. */
export type CustomerSummaryRow = Omit<CustomerRow, 'contactEmail' | 'companyNameSearch'>;

export function toCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    companyName: row.companyName,
    taxId: row.taxId,
    taxIdType: row.taxIdType,
    country: row.country,
    contactEmail: row.contactEmail,
    plan: row.plan,
    createdAt: new Date(row.createdAt),
  };
}

export function toCustomerSummary(row: CustomerSummaryRow): CustomerSummary {
  return {
    id: row.id,
    companyName: row.companyName,
    taxId: row.taxId,
    taxIdType: row.taxIdType,
    country: row.country,
    plan: row.plan,
    createdAt: new Date(row.createdAt),
  };
}

export function toCustomerRow(customer: NewCustomer): CustomerRow {
  return { ...customer, createdAt: customer.createdAt.getTime() };
}

/** The DTO of the contract: the dates leave as ISO 8601 in UTC (04-contrato-api §1). */
export function toCustomerResponse(customer: Customer): CustomerResponse {
  return { ...customer, createdAt: customer.createdAt.toISOString() };
}

/** An item of GET /customers: the summary, with nothing that is not in the contract (D-42). */
export function toCustomerSummaryResponse(customer: CustomerSummary): CustomerSummaryResponse {
  return { ...customer, createdAt: customer.createdAt.toISOString() };
}
