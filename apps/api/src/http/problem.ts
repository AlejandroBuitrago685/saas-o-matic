import { PROBLEMS, type FieldError, type Problem, type ProblemCode } from '@saas-o-matic/contract';
import type { FastifyReply } from 'fastify';

/** What an error becomes in the response; the handler adds `type`, `title`, `status` and `instance`. */
export interface ProblemSpec {
  readonly code: ProblemCode;
  readonly detail?: string;
  readonly errors?: readonly FieldError[];
  readonly existingCustomerId?: string;
  /** Only with RATE_LIMITED: becomes the `Retry-After` header, in seconds (04-contrato-api §1). */
  readonly retryAfterSeconds?: number;
}

/** English details without internal data nor the values sent (D-33, RNF-SEC-10). */
const DETAILS: Readonly<Record<ProblemCode, string>> = {
  MALFORMED_JSON: 'The request body is not a valid JSON object.',
  VALIDATION_ERROR: 'The request does not match the expected schema.',
  NOT_FOUND: 'The requested resource does not exist.',
  CUSTOMER_ALREADY_EXISTS: 'A customer with this tax identifier already exists for this country.',
  PAYLOAD_TOO_LARGE: 'The request body exceeds 16 KiB.',
  UNSUPPORTED_MEDIA_TYPE: 'Requests with a body must be sent as application/json.',
  BUSINESS_RULE_VIOLATION: 'The request breaks a business rule.',
  RATE_LIMITED: 'Too many requests. Retry after the time in Retry-After.',
  INTERNAL_ERROR: 'An unexpected error occurred.',
};

/** RFC 9457 body (04-contrato-api §2.1); `instance` correlates the response with the logs (AC-50). */
export function problemOf(spec: ProblemSpec, requestId: string): Problem {
  const { status, type, title } = PROBLEMS[spec.code];
  return {
    type,
    title,
    status,
    detail: spec.detail ?? DETAILS[spec.code],
    instance: `urn:uuid:${requestId}`,
    code: spec.code,
    ...(spec.errors === undefined ? {} : { errors: [...spec.errors] }),
    ...(spec.existingCustomerId === undefined ? {} : { existingCustomerId: spec.existingCustomerId }),
  };
}

export function sendProblem(reply: FastifyReply, spec: ProblemSpec): FastifyReply {
  const problem = problemOf(spec, reply.request.id);
  if (spec.retryAfterSeconds !== undefined) void reply.header('retry-after', String(spec.retryAfterSeconds));
  return reply.code(problem.status).type('application/problem+json').send(problem);
}
