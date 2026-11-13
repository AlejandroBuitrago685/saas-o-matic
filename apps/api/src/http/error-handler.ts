import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { translateError } from './error-translation.js';
import { sendProblem } from './problem.js';
import { API_SECURITY_HEADERS, HSTS_HEADER } from './security-headers.js';

type FrameworkErrorHandler = (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => void;

/**
 * Fastify's `frameworkErrors`: a path that is not valid percent-encoding (`/customers/%E0`) or a path parameter over
 * 100 characters fails before routing, so no hook runs and the error handler is not called. Without this, Fastify
 * answers its own JSON with the path inside. Such a path cannot name any resource: 404 NOT_FOUND (AC-58). The headers
 * that the hooks add everywhere else are set by hand. These requests do not count towards the rate limit, on
 * purpose: Fastify builds them with its base `Request`, whose `ip` is the socket's and ignores `trustProxy`. Behind
 * nginx every one of them would land in the proxy's bucket, and a scan with `/%E0` would use up everybody's limit.
 */
export function createFrameworkErrorHandler(isProduction: boolean): FrameworkErrorHandler {
  const headers = {
    ...API_SECURITY_HEADERS,
    ...(isProduction ? HSTS_HEADER : {}),
    'cache-control': 'no-store',
  };
  return (error, request, reply) => {
    request.log.info({ code: error.code, method: request.method }, 'request rejected before routing');
    void reply.headers({ ...headers, 'x-request-id': request.id });
    void sendProblem(reply, { code: 'NOT_FOUND' });
  };
}

/**
 * The single place that formats errors (ADR-009): no route formats its own. A `500` logs the error with its stack and
 * SQLite code at `error` level; a `4xx` only its contract code at `info` level, never the request (03-backend §6).
 */
export function registerErrorHandling(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    const spec = translateError(error, request);
    if (spec.code === 'INTERNAL_ERROR') request.log.error({ err: error }, 'request failed');
    else request.log.info({ code: spec.code }, 'request rejected');
    return sendProblem(reply, spec);
  });
}
