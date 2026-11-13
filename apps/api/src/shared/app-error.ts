import type { FieldError, ProblemCode } from '@saas-o-matic/contract';

/**
 * Closed hierarchy of application errors (03-backend §4.1, ADR-009): use cases throw them and the single error
 * handler turns them into RFC 9457 responses. The domain never throws; it returns `Result`.
 */
export abstract class AppError extends Error {
  /** The status comes from the contract (`PROBLEMS[code]`), so a class cannot pair a code with the wrong status. */
  abstract readonly code: ProblemCode;
}

/** 422: the request matches the schema but breaks a business rule (`TAX_ID_*`, `CUSTOMER_NOT_FOUND`). */
export class BusinessRuleError extends AppError {
  readonly code = 'BUSINESS_RULE_VIOLATION';

  constructor(readonly errors: readonly FieldError[]) {
    super('Business rule violation');
  }
}

/** 409: a customer with the same country and normalized tax id already exists (D-17). */
export class ConflictError extends AppError {
  readonly code = 'CUSTOMER_ALREADY_EXISTS';

  constructor(readonly existingCustomerId: string) {
    super('Customer already exists');
  }
}

/** 404: the resource of the URL does not exist. */
export class NotFoundError extends AppError {
  readonly code = 'NOT_FOUND';

  constructor() {
    super('Resource not found');
  }
}
