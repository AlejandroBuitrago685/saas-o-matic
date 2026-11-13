import type { FieldError, GatewayErrorCode, ProblemCode } from '@saas-o-matic/contract';

/** Errors produced in the browser, without a Problem Details body (06-frontend §5). */
export type ClientErrorCode = 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
/** Codes of the API, of nginx when the API does not answer (D-152) and of the browser. */
export type ApiErrorCode = ProblemCode | GatewayErrorCode | ClientErrorCode;

export interface ApiErrorInit {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly errors?: readonly FieldError[];
  readonly reference?: string | null;
  readonly retryAfterSeconds?: number | null;
  readonly existingCustomerId?: string | null;
}

/** Every failed API call reaches stores and views as an ApiError (apiErrorInterceptor). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly errors: readonly FieldError[];
  /** Short code the user can quote to support: the last 8 characters of the request UUID (D-127). */
  readonly reference: string | null;
  readonly retryAfterSeconds: number | null;
  readonly existingCustomerId: string | null;

  constructor(init: ApiErrorInit) {
    super(`API error ${init.code} (${String(init.status)})`);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.errors = init.errors ?? [];
    this.reference = init.reference ?? null;
    this.retryAfterSeconds = init.retryAfterSeconds ?? null;
    this.existingCustomerId = init.existingCustomerId ?? null;
  }
}
