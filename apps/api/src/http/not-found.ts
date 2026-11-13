import type { FastifyInstance } from 'fastify';

import { sendProblem } from './problem.js';

/**
 * Unknown routes and methods are `404 NOT_FOUND` (AC-58), and the route goes first in the order of evaluation
 * (04-contrato-api §2.3): the answer comes from an `onRequest` hook, so the body is never parsed (no 415, 413 or 400
 * for a route that does not exist) and the limit does not turn it into a 429. It still counts towards the global
 * limit, so scanning the API uses up the client's requests. Register it after CORS and before the write limit.
 */
export function registerNotFound(app: FastifyInstance): void {
  const countGlobal = app.createRateLimit();
  app.addHook('onRequest', async (request, reply) => {
    if (!request.is404) return;
    await countGlobal(request);
    return sendProblem(reply, { code: 'NOT_FOUND' });
  });
  // Reached only through `reply.callNotFound()`, as CORS does with the preflight of an origin outside the list.
  app.setNotFoundHandler((_request, reply) => sendProblem(reply, { code: 'NOT_FOUND' }));
}
