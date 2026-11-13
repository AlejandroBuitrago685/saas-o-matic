import { SCHEMA_ERROR_CODES, type ErrorLocation, type FieldError, type SchemaErrorCode } from './problem.js';

/**
 * The parts of a schema issue the translation needs. A Zod issue has this shape, and the API adapts the validation
 * errors Fastify reports (keyword, instancePath, params) to it.
 */
export interface SchemaIssue {
  readonly code: string;
  readonly path: readonly PropertyKey[];
  /** `too_small` / `too_big`: what was measured (`string`, `number`, `array`…). */
  readonly origin?: string | undefined;
  /** `unrecognized_keys`: the unknown keys. */
  readonly keys?: readonly string[] | undefined;
  /** `custom`: the code a refinement chose (for example the company name normalization). */
  readonly params?: { readonly code?: unknown } | undefined;
}

const SCHEMA_CODES: readonly string[] = SCHEMA_ERROR_CODES;

/** JSON Pointer of a path (RFC 6901): `~` → `~0`, `/` → `~1`. */
export function pointerOf(path: readonly PropertyKey[]): string {
  return path.map((segment) => `/${String(segment).replaceAll('~', '~0').replaceAll('/', '~1')}`).join('');
}

/** The value at a path of the original input, or undefined when the path does not exist there. */
function valueAt(input: unknown, path: readonly PropertyKey[]): unknown {
  return path.reduce<unknown>(
    (value, segment) =>
      typeof value === 'object' && value !== null && Object.hasOwn(value, segment)
        ? (value as Record<PropertyKey, unknown>)[segment]
        : undefined,
    input,
  );
}

const isNumeric = (origin: string | undefined): boolean => origin === 'number' || origin === 'bigint';
const isSchemaCode = (code: unknown): code is SchemaErrorCode =>
  typeof code === 'string' && SCHEMA_CODES.includes(code);

type Translation = (issue: SchemaIssue, input: unknown) => SchemaErrorCode;

/** Translation of each Zod issue code (03-arquitectura/03-backend §4.2). A Map: `constructor` is not a key. */
const TRANSLATIONS: ReadonlyMap<string, Translation> = new Map<string, Translation>([
  // «null or absent → REQUIRED» (TV-PR-15): Zod does not say which one, the original input does.
  [
    'invalid_type',
    (issue, input) => ((valueAt(input, issue.path) ?? null) === null ? 'REQUIRED' : 'INVALID_TYPE'),
  ],
  ['too_small', (issue) => (isNumeric(issue.origin) ? 'OUT_OF_RANGE' : 'TOO_SHORT')],
  ['too_big', (issue) => (isNumeric(issue.origin) ? 'OUT_OF_RANGE' : 'TOO_LONG')],
  ['invalid_value', () => 'INVALID_ENUM'],
  [
    'custom',
    (issue) => {
      const chosen = issue.params?.code;
      return isSchemaCode(chosen) ? chosen : 'INVALID_FORMAT';
    },
  ],
]);

/** invalid_format (email, UUID…) and any other issue are a format error. */
const codeOf = (issue: SchemaIssue, input: unknown): SchemaErrorCode =>
  TRANSLATIONS.get(issue.code)?.(issue, input) ?? 'INVALID_FORMAT';

/**
 * Every schema issue as the `errors[]` of a `400 VALIDATION_ERROR` (04-contrato-api §2.1): one per unknown key, the
 * others one per issue, each with its JSON Pointer.
 */
export function fieldErrorsOf(
  issues: readonly SchemaIssue[],
  input: unknown,
  location: ErrorLocation,
): FieldError[] {
  return issues.flatMap((issue): FieldError[] =>
    issue.code === 'unrecognized_keys'
      ? (issue.keys ?? []).map((key) => ({
          location,
          pointer: pointerOf([...issue.path, key]),
          code: 'UNKNOWN_FIELD',
        }))
      : [{ location, pointer: pointerOf(issue.path), code: codeOf(issue, input) }],
  );
}
