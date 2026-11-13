import { PROBLEMS, problemSchema, type ProblemCode } from '@saas-o-matic/contract';

/**
 * Response schemas of the errors a route can answer (04-contrato-api §2.2), for the `response` option of the route:
 * they document the errors in `openapi.json` (RNF-SEC-17) next to the success. The error handler is still the only one
 * that builds the body (ADR-009); these schemas never reach a client.
 */
export function problemResponses(
  ...codes: readonly ProblemCode[]
): Readonly<Record<number, typeof problemSchema>> {
  return Object.fromEntries(codes.map((code) => [PROBLEMS[code].status, problemSchema]));
}

/** What any `GET` of the contract can answer besides its success (04-contrato-api §2.3). */
export const READ_PROBLEMS = ['VALIDATION_ERROR', 'RATE_LIMITED', 'INTERNAL_ERROR'] as const;

/** What any `POST` can answer besides its success: the body goes through 415, 413 and 400 before the schema. */
export const WRITE_PROBLEMS = [
  ...READ_PROBLEMS,
  'MALFORMED_JSON',
  'PAYLOAD_TOO_LARGE',
  'UNSUPPORTED_MEDIA_TYPE',
] as const;
