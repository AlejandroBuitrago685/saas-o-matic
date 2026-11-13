import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyContextConfig {
    /** A route without personal data may let its `200` be cached for this long (only `GET /catalog`). */
    readonly cacheMaxAgeSeconds?: number;
  }
}

/**
 * `no-store` on every response, errors included, unless the route declares a cache age (RNF-SEC-21, AC-52). It runs on
 * `onSend` because only then the final status is known.
 */
export function registerCacheControl(app: FastifyInstance): void {
  app.addHook('onSend', (request, reply, payload) => {
    const maxAge = request.routeOptions.config.cacheMaxAgeSeconds;
    const isCacheable = maxAge !== undefined && reply.statusCode === 200;
    void reply.header('cache-control', isCacheable ? `max-age=${String(maxAge)}` : 'no-store');
    return Promise.resolve(payload);
  });
}
