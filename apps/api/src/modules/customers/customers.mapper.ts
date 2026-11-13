import type { CustomerResponse } from '@saas-o-matic/contract';

import type { Customer, NewCustomer } from './customers.types.js';

/** A row of `customers`, by shape: only the repository may import the Drizzle schema (03-backend §2). */
export interface CustomerRow extends Omit<NewCustomer, 'createdAt'> {
  /** Unix milliseconds, UTC. */
  readonly createdAt: number;
}

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

export function toCustomerRow(customer: NewCustomer): CustomerRow {
  return { ...customer, createdAt: customer.createdAt.getTime() };
}

/** The DTO of the contract: the dates leave as ISO 8601 in UTC (04-contrato-api §1). */
export function toCustomerResponse(customer: Customer): CustomerResponse {
  return { ...customer, createdAt: customer.createdAt.toISOString() };
}
