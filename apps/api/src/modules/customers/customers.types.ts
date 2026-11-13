import type { Country, Plan, TaxIdType } from '@saas-o-matic/domain';

/** A customer with its identifier already normalized and validated (02-reglas-negocio §4). */
export interface Customer {
  readonly id: string;
  readonly companyName: string;
  readonly taxId: string;
  readonly taxIdType: TaxIdType;
  readonly country: Country;
  readonly contactEmail: string;
  readonly plan: Plan;
  readonly createdAt: Date;
}

/** What is stored: the customer and the key of the accent- and case-insensitive search (ADR-006). */
export interface NewCustomer extends Customer {
  readonly companyNameSearch: string;
}

/** An item of the listing: the customer without the email, which is not even read (D-42, AC-33). */
export type CustomerSummary = Omit<Customer, 'contactEmail'>;

/**
 * The terms of a search, already normalized (04-contrato-api §3.3). A customer matches if its search key contains
 * `name` **or** its tax id contains `taxId`; a `null` term does not filter by its field, and at least one is set (D-136).
 */
export type SearchTerms =
  | { readonly name: string; readonly taxId: string | null }
  | { readonly name: string | null; readonly taxId: string };

export interface PageRequest {
  readonly limit: number;
  readonly offset: number;
}

export interface CustomerList {
  readonly items: readonly CustomerSummary[];
  /** Customers that match, not only those of this page. */
  readonly total: number;
}

/** Port of the customers module: the repository implements it with Drizzle, the use cases only know this. */
export interface CustomerRepository {
  /** Throws `ConflictError` with the id of the existing customer if the country and tax id are taken (D-17). */
  readonly insert: (customer: NewCustomer) => void;
  readonly findById: (id: string) => Customer | undefined;
  /** Every customer, or those that match the terms, by search key and then id (04-contrato-api §3.3). */
  readonly list: (page: PageRequest, terms?: SearchTerms) => CustomerList;
}
