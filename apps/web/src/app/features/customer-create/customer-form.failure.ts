import { ApiError } from '../../core/api/api-error';
import { fieldMessage, type MessageParams, problemMessage } from '../../core/errors/error-messages';
import { CUSTOMER_FIELDS, type CustomerField } from './customer-form.schema';

/** Error shown above the submit button, outside any field. */
export interface FormNotice {
  readonly message: string;
  /** Set on a 409: the «Ver cliente» link goes there (AC-74). */
  readonly existingCustomerId: string | null;
}

export interface FieldFailure {
  readonly field: CustomerField;
  readonly code: string;
  readonly message: string;
}

export interface SubmitFailure {
  readonly fieldErrors: readonly FieldFailure[];
  readonly notice: FormNotice | null;
}

function createFailed(reference: string | null): FormNotice {
  const suffix = reference === null ? '' : ` (Referencia: ${reference})`;
  return {
    message: `No se ha podido crear el cliente. Inténtalo de nuevo.${suffix}`,
    existingCustomerId: null,
  };
}

function fieldOf(pointer: string): CustomerField | undefined {
  return CUSTOMER_FIELDS.find((field) => pointer === `/${field}`);
}

function fieldFailures(error: ApiError, params: (field: CustomerField) => MessageParams): FieldFailure[] {
  return error.errors.flatMap(({ pointer, code }) => {
    const field = fieldOf(pointer);
    return field === undefined ? [] : [{ field, code, message: fieldMessage(code, params(field)) }];
  });
}

/**
 * What the form shows for a failed POST /customers (spec 05 §3.2): 400 and 422 under their fields, 409 with a
 * link to the existing customer, 429 with its wait, and anything else as «No se ha podido crear el cliente»
 * with the reference. The typed data is always kept.
 */
export function describeFailure(
  error: unknown,
  params: (field: CustomerField) => MessageParams,
): SubmitFailure {
  if (!(error instanceof ApiError)) return { fieldErrors: [], notice: createFailed(null) };
  if (error.code === 'CUSTOMER_ALREADY_EXISTS') {
    return {
      fieldErrors: [],
      notice: { message: problemMessage(error), existingCustomerId: error.existingCustomerId },
    };
  }
  if (error.code === 'RATE_LIMITED') {
    return { fieldErrors: [], notice: { message: problemMessage(error), existingCustomerId: null } };
  }
  const fieldErrors = fieldFailures(error, params);
  const isFullyExplained = fieldErrors.length > 0 && fieldErrors.length === error.errors.length;
  return { fieldErrors, notice: isFullyExplained ? null : createFailed(error.reference) };
}
