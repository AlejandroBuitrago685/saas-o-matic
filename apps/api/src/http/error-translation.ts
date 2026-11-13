import {
  fieldErrorsOf,
  type ErrorLocation,
  type ProblemCode,
  type SchemaIssue,
} from '@saas-o-matic/contract';
import type { FastifyRequest } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';

import { AppError, BusinessRuleError, ConflictError } from '../shared/app-error.js';
import type { ProblemSpec } from './problem.js';
import { RateLimitedError } from './rate-limit.js';

/**
 * The single translation of any error to the contract (03-backend §4.2). Each code of the contract has at least one
 * case in its test. Anything not listed here is a generic 500: violations of CHECK constraints included.
 */

/** Fastify and plugin errors, by their `code`. */
const BY_CODE: ReadonlyMap<string, ProblemCode> = new Map<string, ProblemCode>([
  ['SAAS_MALFORMED_JSON', 'MALFORMED_JSON'],
  ['FST_ERR_CTP_INVALID_CONTENT_LENGTH', 'MALFORMED_JSON'],
  ['FST_ERR_CTP_BODY_TOO_LARGE', 'PAYLOAD_TOO_LARGE'],
  ['FST_ERR_CTP_INVALID_MEDIA_TYPE', 'UNSUPPORTED_MEDIA_TYPE'],
]);

const LOCATIONS: ReadonlyMap<string, ErrorLocation> = new Map<string, ErrorLocation>([
  ['body', 'body'],
  ['querystring', 'query'],
  ['params', 'path'],
]);

/**
 * `fastify-type-provider-zod` joins the Zod path with `/` without escaping, and `/` alone is the root. The keys of our
 * schemas never contain `/`, and unknown keys come apart in `keys`, so splitting gives the path back.
 */
const segmentsOf = (instancePath: string): string[] =>
  instancePath === '/' ? [] : instancePath.slice(1).split('/');

interface ValidationItem {
  readonly keyword: string;
  readonly instancePath: string;
  readonly params: Readonly<Record<string, unknown>>;
}

/** Fastify reports Zod issues as `{ keyword, instancePath, params }`: back to the shape the contract translates. */
function issueOf({ keyword, instancePath, params }: ValidationItem): SchemaIssue {
  const { origin, keys, params: custom } = params;
  return {
    code: keyword,
    path: segmentsOf(instancePath),
    origin: typeof origin === 'string' ? origin : undefined,
    keys: Array.isArray(keys) ? keys.filter((key): key is string => typeof key === 'string') : undefined,
    params: typeof custom === 'object' && custom !== null ? custom : undefined,
  };
}

interface ValidationFailure {
  readonly validation: readonly ValidationItem[];
  readonly validationContext?: string | undefined;
}

function validationSpec(error: ValidationFailure, request: FastifyRequest): ProblemSpec {
  const location = LOCATIONS.get(error.validationContext ?? '') ?? 'body';
  const input = { body: request.body, query: request.query, path: request.params }[location];
  return { code: 'VALIDATION_ERROR', errors: fieldErrorsOf(error.validation.map(issueOf), input, location) };
}

function appErrorSpec(error: AppError): ProblemSpec {
  if (error instanceof BusinessRuleError) return { code: error.code, errors: error.errors };
  if (error instanceof ConflictError)
    return { code: error.code, existingCustomerId: error.existingCustomerId };
  return { code: error.code };
}

const codeOf = (error: unknown): string =>
  typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
    ? error.code
    : '';

/** Anything can be thrown, so the error is `unknown`: only known shapes leave the generic 500. */
export function translateError(error: unknown, request: FastifyRequest): ProblemSpec {
  if (error instanceof AppError) return appErrorSpec(error);
  if (error instanceof RateLimitedError)
    return { code: 'RATE_LIMITED', retryAfterSeconds: error.retryAfterSeconds };
  if (hasZodFastifySchemaValidationErrors(error)) return validationSpec(error, request);
  return { code: BY_CODE.get(codeOf(error)) ?? 'INTERNAL_ERROR' };
}
