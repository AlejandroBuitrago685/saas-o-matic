import { z } from 'zod';

/** Catalog of error responses (04-contrato-api §2.2): status, stable `type` and English `title`. */
export const PROBLEMS = {
  MALFORMED_JSON: { status: 400, type: '/problems/malformed-json', title: 'Malformed JSON body' },
  VALIDATION_ERROR: { status: 400, type: '/problems/validation-error', title: 'Request validation failed' },
  NOT_FOUND: { status: 404, type: '/problems/not-found', title: 'Resource not found' },
  CUSTOMER_ALREADY_EXISTS: {
    status: 409,
    type: '/problems/customer-already-exists',
    title: 'Customer already exists',
  },
  PAYLOAD_TOO_LARGE: { status: 413, type: '/problems/payload-too-large', title: 'Payload too large' },
  UNSUPPORTED_MEDIA_TYPE: {
    status: 415,
    type: '/problems/unsupported-media-type',
    title: 'Unsupported media type',
  },
  BUSINESS_RULE_VIOLATION: {
    status: 422,
    type: '/problems/business-rule-violation',
    title: 'Business rule violation',
  },
  RATE_LIMITED: { status: 429, type: '/problems/rate-limited', title: 'Too many requests' },
  INTERNAL_ERROR: { status: 500, type: '/problems/internal-error', title: 'Internal error' },
} as const;

export type ProblemCode = keyof typeof PROBLEMS;
export const PROBLEM_CODES = Object.keys(PROBLEMS) as readonly ProblemCode[];

/** Codes of `errors[].code` (04-contrato-api §2.2): schema errors (400) and business rules (422). */
export const SCHEMA_ERROR_CODES = [
  'REQUIRED',
  'INVALID_TYPE',
  'TOO_SHORT',
  'TOO_LONG',
  'OUT_OF_RANGE',
  'INVALID_FORMAT',
  'INVALID_ENUM',
  'UNKNOWN_FIELD',
] as const;
export const BUSINESS_ERROR_CODES = [
  'TAX_ID_INVALID_FORMAT',
  'TAX_ID_INVALID_CHECK',
  'TAX_ID_UNSUPPORTED_TYPE',
  'CUSTOMER_NOT_FOUND',
] as const;
export type SchemaErrorCode = (typeof SCHEMA_ERROR_CODES)[number];
export type BusinessErrorCode = (typeof BUSINESS_ERROR_CODES)[number];

export const ERROR_LOCATIONS = ['body', 'query', 'path'] as const;
export type ErrorLocation = (typeof ERROR_LOCATIONS)[number];

export const fieldErrorSchema = z.object({
  location: z.enum(ERROR_LOCATIONS),
  /** JSON Pointer (RFC 6901) relative to the location. */
  pointer: z.string(),
  code: z.enum([...SCHEMA_ERROR_CODES, ...BUSINESS_ERROR_CODES]),
});
export type FieldError = z.output<typeof fieldErrorSchema>;

/** `application/problem+json` body (RFC 9457, 04-contrato-api §2.1). */
export const problemSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  /** `urn:uuid:` + the X-Request-Id of the response. */
  instance: z.string(),
  code: z.enum(PROBLEM_CODES as [ProblemCode, ...ProblemCode[]]),
  errors: z.array(fieldErrorSchema).optional(),
  existingCustomerId: z.uuid().optional(),
});
export type Problem = z.output<typeof problemSchema>;
