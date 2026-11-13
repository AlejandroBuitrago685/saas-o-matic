import { noQuerySchema, statsResponseSchema } from '@saas-o-matic/contract';
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';

import { problemResponses, READ_PROBLEMS } from '../../shared/problem-responses.js';
import type { GetStats } from './get-stats.use-case.js';

export interface StatsRoutesOptions {
  readonly getStats: GetStats;
}

/** GET /stats (04-contrato-api §3.8, AC-47): the dashboard metrics, without parameters and never cached. */
export const statsRoutes: FastifyPluginCallbackZod<StatsRoutesOptions> = (app, { getStats }, done) => {
  app.get(
    '/stats',
    {
      schema: {
        querystring: noQuerySchema,
        response: { 200: statsResponseSchema, ...problemResponses(...READ_PROBLEMS) },
      },
    },
    () => getStats(),
  );
  done();
};
