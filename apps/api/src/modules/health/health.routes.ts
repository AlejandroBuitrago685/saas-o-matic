import { healthResponseSchema, healthUnavailableResponseSchema, noQuerySchema } from '@saas-o-matic/contract';
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';

import { problemResponses, READ_PROBLEMS } from '../../shared/problem-responses.js';
import type { CheckHealth } from './check-health.use-case.js';

export interface HealthRoutesOptions {
  readonly checkHealth: CheckHealth;
}

/** GET /health (04-contrato-api §3.9, AC-48): `200` if the database answers, `503` without details if not. */
export const healthRoutes: FastifyPluginCallbackZod<HealthRoutesOptions> = (app, { checkHealth }, done) => {
  app.get(
    '/health',
    {
      schema: {
        querystring: noQuerySchema,
        response: {
          200: healthResponseSchema,
          503: healthUnavailableResponseSchema,
          ...problemResponses(...READ_PROBLEMS),
        },
      },
    },
    (request, reply) => {
      const health = checkHealth();
      if (health.ok) return { status: 'ok' as const };
      request.log.warn({ err: health.error }, 'database unavailable');
      void reply.code(503);
      return { status: 'unavailable' as const };
    },
  );
  done();
};
