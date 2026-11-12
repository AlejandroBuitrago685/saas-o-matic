import { healthResponseSchema } from '@saas-o-matic/contract';
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';

/**
 * GET /health (spec 04 §3.9). In P0 it only proves the process is up;
 * the database check (200/503) is added in P3.
 */
export const healthRoutes: FastifyPluginCallbackZod = (app, _options, done) => {
  app.get('/health', { schema: { response: { 200: healthResponseSchema } } }, () => ({
    status: 'ok' as const,
  }));
  done();
};
