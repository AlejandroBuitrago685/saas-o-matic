const JSON_MEDIA_TYPE = 'application/json';
const PROBLEM_MEDIA_TYPE = 'application/problem+json';

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject => typeof value === 'object' && value !== null;

/** The values of a field that is an object, or none: the generated document is walked without assuming its shape. */
const objectsIn = (parent: JsonObject, field: string): JsonObject[] => {
  const child = parent[field];
  return isObject(child) ? Object.values(child).filter(isObject) : [];
};

/** The Problem Details schema of the contract is the only one with `instance` and `code`. */
function isProblemSchema(body: unknown): boolean {
  if (!isObject(body) || !isObject(body['schema'])) return false;
  const { properties } = body['schema'];
  return isObject(properties) && 'instance' in properties && 'code' in properties;
}

/**
 * Swagger documents every response as `application/json`; the problems are `application/problem+json` (RFC 9457).
 * Other error bodies, like the 503 of `/health` (AC-48), stay as they are.
 */
function moveToProblemMediaType(response: JsonObject): void {
  const content = response['content'];
  if (!isObject(content) || !isProblemSchema(content[JSON_MEDIA_TYPE])) return;
  response['content'] = { [PROBLEM_MEDIA_TYPE]: content[JSON_MEDIA_TYPE] };
}

function documentOperation(operation: JsonObject): void {
  const responses = operation['responses'];
  if (!isObject(responses)) return;
  Object.values(responses).filter(isObject).forEach(moveToProblemMediaType);
}

/** The `transformObject` of the OpenAPI generator: the media type of the error responses (`4xx` and `5xx`). */
export function documentProblemMediaType<T extends object>(document: T): T {
  if (!isObject(document)) return document;
  for (const operations of objectsIn(document, 'paths')) {
    Object.values(operations).filter(isObject).forEach(documentOperation);
  }
  return document;
}
