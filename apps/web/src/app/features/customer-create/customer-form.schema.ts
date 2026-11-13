import { email, maxLength, minLength, required, schema, type Schema } from '@angular/forms/signals';
import type { CatalogResponse } from '@saas-o-matic/contract';
import type { Country, Plan } from '@saas-o-matic/domain';

import { fieldMessage } from '../../core/errors/error-messages';

export interface CustomerFormModel {
  country: Country;
  companyName: string;
  taxId: string;
  contactEmail: string;
  plan: Plan | '';
}

export type CustomerField = keyof CustomerFormModel;

/** Fields in the order of the form (spec 05 §3.2): the focus goes to the first invalid one. */
export const CUSTOMER_FIELDS: readonly CustomerField[] = [
  'country',
  'companyName',
  'taxId',
  'contactEmail',
  'plan',
];

/** Spain preselected (spec 05 §3.2); the plan has to be chosen. */
export const INITIAL_CUSTOMER_FORM: Readonly<CustomerFormModel> = {
  country: 'ES',
  companyName: '',
  taxId: '',
  contactEmail: '',
  plan: '',
};

type Limits = CatalogResponse['limits'];

/**
 * Checks of the browser (spec 05 §3.2): only what belongs to the schema — required fields, the lengths of the
 * catalog and the email format. The tax id is always validated by the server (422).
 */
export function customerFormSchema(limits: () => Limits): Schema<CustomerFormModel> {
  return schema<CustomerFormModel>((path) => {
    const requiredMessage = { message: fieldMessage('REQUIRED') };
    required(path.country, requiredMessage);
    required(path.plan, requiredMessage);

    required(path.companyName, requiredMessage);
    const nameLength = (): string => fieldMessage('TOO_LONG', limits().companyName);
    minLength(path.companyName, () => limits().companyName.min, { message: nameLength });
    maxLength(path.companyName, () => limits().companyName.max, { message: nameLength });

    required(path.taxId, requiredMessage);
    const taxIdLength = (): string => fieldMessage('TOO_LONG', limits().taxId);
    minLength(path.taxId, () => limits().taxId.min, { message: taxIdLength });
    maxLength(path.taxId, () => limits().taxId.max, { message: taxIdLength });

    required(path.contactEmail, requiredMessage);
    email(path.contactEmail, { message: fieldMessage('INVALID_FORMAT', { field: 'contactEmail' }) });
    maxLength(path.contactEmail, () => limits().contactEmail.max, {
      message: () => fieldMessage('TOO_LONG', { max: limits().contactEmail.max }),
    });
  });
}
