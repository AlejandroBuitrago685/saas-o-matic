import swagger from '@fastify/swagger';
import type { FastifyInstance } from 'fastify';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';

import { documentProblemMediaType } from './openapi-problems.js';

/**
 * OpenAPI generated from the same Zod schemas that validate the requests (D-110). `@fastify/swagger` only collects
 * the routes: it serves nothing, so it is registered everywhere and `npm run openapi` writes `apps/api/openapi.json`.
 */
export async function registerApiDocs(app: FastifyInstance, isDevelopment: boolean): Promise<void> {
  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'SaaS-O-Matic API',
        version: '1.0.0',
        description:
          'Contract: ai-workspace/02-especificacion/04-contrato-api.md. Errors are RFC 9457 Problem Details.',
      },
    },
    transform: jsonSchemaTransform,
    // This API only generates OpenAPI 3.1, never Swagger 2.0.
    transformObject: (document) =>
      'openapiObject' in document ? documentProblemMediaType(document.openapiObject) : document.swaggerObject,
  });
  if (!isDevelopment) return;
  // Swagger UI at /docs, only in development (RNF-SEC-17). It is a devDependency loaded on demand, so the production
  // image does not even contain it; its own CSP replaces the API one only on its routes.
  const { default: swaggerUi } = await import('@fastify/swagger-ui');
  await app.register(swaggerUi, {
    routePrefix: '/docs',
    staticCSP: true,
    // Local development is plain http: upgrading its requests to https would break the UI's own files.
    transformStaticCSP: (header) => header.replace(/\s*upgrade-insecure-requests;?/, ''),
  });
}
