import type { HttpErrorResponse } from '@angular/common/http';
import type { FieldError } from '@saas-o-matic/contract';

import { isApiErrorCode, isFieldErrorCode } from '../errors/error-messages';
import { ApiError } from './api-error';

const REQUEST_URN = /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-([0-9a-f]{12})$/i;
const ERROR_LOCATIONS: readonly string[] = ['body', 'query', 'path'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reference shown to the user (D-127): the **last** 8 characters of the request UUID. The first ones would be
 * `urn:uuid` and, in a UUID v7, the clock: two errors in the same minute would share them.
 */
export function referenceOf(instance: unknown): string | null {
  if (typeof instance !== 'string') return null;
  const node = REQUEST_URN.exec(instance)?.[1];
  return node === undefined ? null : node.slice(-8).toLowerCase();
}

function toFieldError(item: unknown): FieldError[] {
  if (!isRecord(item)) return [];
  const { location, pointer, code } = item;
  const isValid =
    typeof pointer === 'string' &&
    typeof location === 'string' &&
    ERROR_LOCATIONS.includes(location) &&
    isFieldErrorCode(code);
  return isValid ? [{ location: location as FieldError['location'], pointer, code }] : [];
}

function retryAfterOf(response: HttpErrorResponse): number | null {
  const header = response.headers.get('Retry-After');
  return header !== null && /^\d+$/.test(header) ? Number(header) : null;
}

/**
 * Turns any failed response into an ApiError (06-frontend §5). The body is checked by hand, without Zod in the
 * bundle: a body that is not Problem Details becomes UNKNOWN_ERROR and a request that never got an answer,
 * NETWORK_ERROR.
 */
export function toApiError(response: HttpErrorResponse): ApiError {
  if (response.status === 0) return new ApiError({ status: 0, code: 'NETWORK_ERROR' });
  const body: unknown = response.error;
  if (!isRecord(body) || !isApiErrorCode(body['code'])) {
    return new ApiError({ status: response.status, code: 'UNKNOWN_ERROR' });
  }
  const { code, errors, instance, existingCustomerId } = body;
  return new ApiError({
    status: response.status,
    code,
    errors: Array.isArray(errors) ? errors.flatMap(toFieldError) : [],
    reference: referenceOf(instance),
    retryAfterSeconds: retryAfterOf(response),
    existingCustomerId: typeof existingCustomerId === 'string' ? existingCustomerId : null,
  });
}
