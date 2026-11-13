import {
  PROBLEMS,
  problemSchema,
  type FieldError,
  type Problem,
  type ProblemCode,
} from '@saas-o-matic/contract';
import type { LightMyRequestResponse } from 'fastify';
import { expect } from 'vitest';
import type { z } from 'zod';

/**
 * The contract test of 04-contrato-api: a success is parsed with the response schema of the contract, so a field
 * that is missing, extra or of another type fails here and not only in the serializer of the app.
 */
export function expectBody<S extends z.ZodType>(
  response: LightMyRequestResponse,
  status: number,
  schema: S,
): z.output<S> {
  expect(response.statusCode, response.body).toBe(status);
  return schema.parse(response.json());
}

/**
 * An RFC 9457 error: the envelope parses with `problemSchema`, the status is the one the contract gives to the code,
 * and the field errors are the expected ones when the test names them.
 */
export function expectProblem(
  response: LightMyRequestResponse,
  code: ProblemCode,
  errors?: readonly FieldError[],
): Problem {
  expect(response.statusCode, response.body).toBe(PROBLEMS[code].status);
  expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
  const problem = problemSchema.parse(response.json());
  expect(problem.code).toBe(code);
  if (errors !== undefined) expect(problem.errors).toEqual(errors);
  return problem;
}
