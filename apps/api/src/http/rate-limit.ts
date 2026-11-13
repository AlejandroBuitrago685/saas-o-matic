import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

const WINDOW_MS = 60_000;

/** More requests than the limit in the window: 429 RATE_LIMITED with `Retry-After` (AC-51). */
export class RateLimitedError extends Error {
  readonly code = 'SAAS_RATE_LIMITED';
  readonly statusCode = 429;

  constructor(readonly retryAfterSeconds: number) {
    super('Rate limit exceeded');
  }
}

/**
 * The global limit per client IP (RNF-SEC-08, D-44, D-114): the plugin adds it to every route as a route hook, which
 * runs after the instance hooks, so its 429 already carries the security and CORS headers. `request.ip` honours
 * `trustProxy`, so behind the proxies it is the real client (D-105, D-113); IPv6 addresses are grouped by their /64,
 * the plugin's default. Memory store: one single instance (03-backend §7).
 *
 * CORS answers the preflights inside its own hook, before any route hook, so they are counted here: register this
 * before CORS. The plugin marks the request, so the route hook of `OPTIONS *` does not count it twice. A preflight over
 * the limit gets its 429 without CORS headers; a browser caches the allowed ones for ten minutes.
 */
export async function registerRateLimit(app: FastifyInstance, perMinute: number): Promise<void> {
  await app.register(rateLimit, {
    global: true,
    max: perMinute,
    timeWindow: WINDOW_MS,
    errorResponseBuilder: (_request, { ttl }) => new RateLimitedError(Math.ceil(ttl / 1000)),
  });
  const limitPreflight = app.rateLimit();
  app.addHook('onRequest', async (request, reply) => {
    if (request.method === 'OPTIONS') await limitPreflight.call(app, request, reply);
  });
}

/**
 * Every `POST` to a route of the contract also counts towards the write limit (D-114; an unknown route has already
 * been answered with its 404): a route config of the plugin would replace the global
 * limit instead of adding to it, so this is a second counter. Register it after CORS, so its 429 can be read by the
 * interface, which shows `Retry-After` (05-frontend §6).
 */
export function registerWriteLimit(app: FastifyInstance, writesPerMinute: number): void {
  const writes = app.createRateLimit({ max: writesPerMinute, timeWindow: WINDOW_MS });
  app.addHook('onRequest', async (request) => {
    if (request.method !== 'POST') return;
    const result = await writes(request);
    if (!result.isAllowed && result.isExceeded) throw new RateLimitedError(result.ttlInSeconds);
  });
}
