import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';

const PREFLIGHT_CACHE_SECONDS = 600;

/**
 * Closed list of origins, no wildcard and no credentials (RNF-SEC-07, AC-53). The origin is resolved with a function:
 * with `false` the plugin adds no CORS header at all and rejects the preflight with a 404, while with an array it would
 * still answer the preflight with `Access-Control-Allow-Methods`. The interface reads `Retry-After` (05-frontend §6).
 */
export async function registerCors(app: FastifyInstance, origins: readonly string[]): Promise<void> {
  const allowed = new Set(origins);
  await app.register(cors, {
    origin: (origin, callback) => {
      callback(null, origin !== undefined && allowed.has(origin));
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    exposedHeaders: ['Retry-After'],
    credentials: false,
    maxAge: PREFLIGHT_CACHE_SECONDS,
    // The strict mode answers an OPTIONS without Access-Control-Request-Method with a text/plain 400, outside RFC 9457.
    strictPreflight: false,
  });
}
