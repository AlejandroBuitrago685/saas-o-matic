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

/** Port of the customers module: the repository implements it with Drizzle, the use cases only know this. */
export interface CustomerRepository {
  /** Throws `ConflictError` with the id of the existing customer if the country and tax id are taken (D-17). */
  readonly insert: (customer: NewCustomer) => void;
  readonly findById: (id: string) => Customer | undefined;
}
