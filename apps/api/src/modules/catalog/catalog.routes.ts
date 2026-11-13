import { catalogResponseSchema, noQuerySchema } from '@saas-o-matic/contract';
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';

import { problemResponses, READ_PROBLEMS } from '../../shared/problem-responses.js';
import type { GetCatalog } from './get-catalog.use-case.js';

export interface CatalogRoutesOptions {
  readonly getCatalog: GetCatalog;
}

const FIVE_MINUTES_SECONDS = 300;

/** GET /catalog (04-contrato-api §3.1, AC-34): no personal data, so it is the only cacheable response (RNF-SEC-21). */
export const catalogRoutes: FastifyPluginCallbackZod<CatalogRoutesOptions> = (app, { getCatalog }, done) => {
  app.get(
    '/catalog',
    {
      schema: {
        querystring: noQuerySchema,
        response: { 200: catalogResponseSchema, ...problemResponses(...READ_PROBLEMS) },
      },
      config: { cacheMaxAgeSeconds: FIVE_MINUTES_SECONDS },
    },
    () => getCatalog(),
  );
  done();
};
