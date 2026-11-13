import type { z } from 'zod';

import { fieldErrorsOf } from '../src/field-errors.js';
import type { ErrorLocation, FieldError } from '../src/problem.js';

/** The `errors[]` a schema produces for an input, as the API would return them (empty when it is valid). */
export function errorsOf(schema: z.ZodType, input: unknown, location: ErrorLocation = 'body'): FieldError[] {
  const result = schema.safeParse(input);
  return result.success ? [] : fieldErrorsOf(result.error.issues, input, location);
}

/** Pointer and code of each error, which is what the tests compare. */
export const codesOf = (errors: readonly FieldError[]): string[] =>
  errors.map(({ pointer, code }) => `${pointer} ${code}`);
