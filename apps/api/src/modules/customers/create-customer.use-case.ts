import type { BusinessErrorCode, CreateCustomerCommand } from '@saas-o-matic/contract';
import { normalizeForSearch, validateTaxId, type TaxIdReason } from '@saas-o-matic/domain';

import { BusinessRuleError } from '../../shared/app-error.js';
import type { Clock } from '../../shared/clock.js';
import type { IdGenerator } from '../../shared/id-generator.js';
import type { Customer, CustomerRepository } from './customers.types.js';

export type CreateCustomer = (command: CreateCustomerCommand) => Customer;

export interface CreateCustomerPorts {
  readonly customers: CustomerRepository;
  readonly clock: Clock;
  readonly ids: IdGenerator;
}

const TAX_ID_ERRORS: Readonly<Record<TaxIdReason, BusinessErrorCode>> = {
  INVALID_FORMAT: 'TAX_ID_INVALID_FORMAT',
  INVALID_CHECK: 'TAX_ID_INVALID_CHECK',
  UNSUPPORTED_TYPE: 'TAX_ID_UNSUPPORTED_TYPE',
};

/**
 * RF-01: the schema has already normalized the name and the email (400); here the tax id is validated for the country
 * (422) and stored in its normalized form, with the type the validator found (02-reglas-negocio §4). The uniqueness
 * (409) is the repository's: the unique index decides, not a previous query.
 */
export function createCreateCustomer({ customers, clock, ids }: CreateCustomerPorts): CreateCustomer {
  return (command) => {
    const taxId = validateTaxId(command.taxId, command.country);
    if (!taxId.ok) {
      throw new BusinessRuleError([
        { location: 'body', pointer: '/taxId', code: TAX_ID_ERRORS[taxId.error] },
      ]);
    }
    const customer: Customer = {
      id: ids.next(),
      companyName: command.companyName,
      taxId: taxId.value.value,
      taxIdType: taxId.value.type,
      country: command.country,
      contactEmail: command.contactEmail,
      plan: command.plan,
      createdAt: clock.now(),
    };
    customers.insert({ ...customer, companyNameSearch: normalizeForSearch(command.companyName) });
    return customer;
  };
}
