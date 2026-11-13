import { errorCodes, type FastifyInstance } from 'fastify';

/** 16 KiB (RNF-SEC-01): above it, 413 PAYLOAD_TOO_LARGE (AC-23). It is the app's `bodyLimit`. */
export const MAX_BODY_BYTES = 16_384;

/** A body that is not JSON, or JSON that is not an object (`[]`, `"x"`): 400 MALFORMED_JSON (AC-23). */
export class MalformedJsonError extends Error {
  readonly code = 'SAAS_MALFORMED_JSON';
  readonly statusCode = 400;

  constructor(options?: ErrorOptions) {
    super('Malformed JSON body', options);
  }
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Only `application/json`, parsed with `JSON.parse` (D-106). Every other type, or none, is 415 (AC-24); the 16 KiB
 * limit is the app's `bodyLimit` (413). `__proto__` and `constructor` arrive as own keys and the strict schema of the
 * route rejects them as UNKNOWN_FIELD (AC-22). Nothing may copy or merge the body before the schema validates it:
 * no `Object.assign`, no spread into another object, no merges.
 */
export function registerJsonBody(app: FastifyInstance): void {
  // Fastify does not parse a POST without Content-Type nor body: it would reach the schema as `undefined`. Every POST
  // of the contract has a body, so it is 415 like any other missing type (AC-24). `preParsing` runs after the limits.
  app.addHook('preParsing', (request, _reply, payload) =>
    request.method === 'POST' && request.headers['content-type'] === undefined
      ? Promise.reject(new errorCodes.FST_ERR_CTP_INVALID_MEDIA_TYPE())
      : Promise.resolve(payload),
  );
  app.removeAllContentTypeParsers();
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_request, body, done) => {
    let value: unknown;
    try {
      value = JSON.parse(String(body));
    } catch (error) {
      done(new MalformedJsonError({ cause: error }), undefined);
      return;
    }
    if (isPlainObject(value)) done(null, value);
    else done(new MalformedJsonError(), undefined);
  });
}
