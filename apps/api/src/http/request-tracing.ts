import { randomUUID } from 'node:crypto';

import { LogController, type FastifyInstance } from 'fastify';

/**
 * The server always generates the request id (D-107): the client's `X-Request-Id` is ignored, so it cannot inject
 * values into the logs nor into `instance`.
 */
export const REQUEST_ID_OPTIONS = {
  genReqId: (): string => randomUUID(),
  requestIdHeader: false,
  // Fastify's own request lines would carry the URL with its query: ours replace them (03-backend §6).
  logController: new LogController({ disableRequestLogging: true, requestIdLogLabel: 'reqId' }),
} as const;

/**
 * Every response carries `X-Request-Id` (04-contrato-api §1), and each request leaves one log line with the route
 * pattern (`/customers/:id`), never the real URL nor its query (RNF-SEC-11, 03-backend §6).
 */
export function registerRequestTracing(app: FastifyInstance): void {
  app.addHook('onRequest', (request, reply, done) => {
    void reply.header('x-request-id', request.id);
    done();
  });
  app.addHook('onResponse', (request, reply, done) => {
    request.log.info(
      {
        method: request.method,
        route: request.routeOptions.url ?? null,
        statusCode: reply.statusCode,
        durationMs: Math.round(reply.elapsedTime),
      },
      'request completed',
    );
    done();
  });
}
