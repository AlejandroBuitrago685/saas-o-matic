import Fastify, { type FastifyServerOptions } from 'fastify';
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod';

import { healthRoutes } from './modules/health/health.routes.js';

export interface AppDependencies {
  /** `false` in tests (logs are captured differently from P3 on), pino options in `main.ts`. */
  readonly logger: Exclude<FastifyServerOptions['logger'], undefined>;
}

function createServer(deps: AppDependencies) {
  return Fastify({ logger: deps.logger }).withTypeProvider<ZodTypeProvider>();
}

export type App = ReturnType<typeof createServer>;

/**
 * Builds the Fastify application without listening (ADR-010), so tests can use `app.inject()`.
 * Dependencies are wired by hand here; `main.ts` is the only place with side effects.
 */
export async function buildApp(deps: AppDependencies): Promise<App> {
  const app = createServer(deps);
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(healthRoutes);

  return app;
}
