import type { Catalog } from '@saas-o-matic/domain';
import Fastify, {
  type FastifyBaseLogger,
  type FastifyInstance,
  type RawReplyDefaultExpression,
  type RawRequestDefaultExpression,
  type RawServerDefault,
} from 'fastify';
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod';

import type { AppConfig } from './config/env.js';
import type { Database } from './db/database.js';
import { registerApiDocs } from './http/api-docs.js';
import { registerCacheControl } from './http/cache-control.js';
import { registerCors } from './http/cors.js';
import { createFrameworkErrorHandler, registerErrorHandling } from './http/error-handler.js';
import { MAX_BODY_BYTES, registerJsonBody } from './http/json-body.js';
import { loggerOptions, type LogStream } from './http/logger.js';
import { registerNotFound } from './http/not-found.js';
import { registerRateLimit, registerWriteLimit } from './http/rate-limit.js';
import { REQUEST_ID_OPTIONS, registerRequestTracing } from './http/request-tracing.js';
import { registerRouteInventory } from './http/route-inventory.js';
import { registerSecurityHeaders } from './http/security-headers.js';
import { catalogRoutes, createGetCatalog } from './modules/catalog/index.js';
import {
  createCreateCustomer,
  createCustomersRepository,
  createGetCustomer,
  createSearchCustomers,
  customersRoutes,
} from './modules/customers/index.js';
import { createCheckHealth, createDatabaseProbe, healthRoutes } from './modules/health/index.js';
import {
  createCreateSimulation,
  createGetSimulation,
  createListCustomerSimulations,
  createSimulationsRepository,
  simulationsRoutes,
} from './modules/simulations/index.js';
import type { Clock } from './shared/clock.js';
import type { IdGenerator } from './shared/id-generator.js';

export interface AppDependencies {
  readonly config: AppConfig;
  readonly catalog: Catalog;
  readonly database: Database;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  /** Tests capture the log lines (AC-54); `main.ts` leaves it out and pino writes to standard output. */
  readonly logStream?: LogStream;
}

export type App = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyBaseLogger,
  ZodTypeProvider
>;

function createServer({ config, logStream }: AppDependencies): FastifyInstance {
  return Fastify({
    logger: loggerOptions({
      level: config.logLevel,
      isDevelopment: config.environment === 'development',
      stream: logStream,
    }),
    ...REQUEST_ID_OPTIONS,
    trustProxy: config.trustProxy === false ? false : [...config.trustProxy],
    bodyLimit: MAX_BODY_BYTES,
    // HEAD routes would be outside the closed inventory (AC-58).
    exposeHeadRoutes: false,
    frameworkErrors: createFrameworkErrorHandler(config.environment === 'production'),
  });
}

/**
 * The cross-cutting plugins, in the order of 03-backend §3. Instance hooks run in the order they are registered and
 * an error stops the rest, so the headers and CORS go before anything that can answer early: then every response,
 * a 429 included, carries them. The evaluation order is the one of 04-contrato-api §2.3: route (404), limits (429),
 * body (415, 413, 400), schema.
 */
async function registerPlatform(server: FastifyInstance, config: AppConfig): Promise<void> {
  registerRouteInventory(server);
  registerRequestTracing(server);
  await registerSecurityHeaders(server, config.environment === 'production');
  await registerRateLimit(server, config.rateLimit.perMinute);
  await registerCors(server, config.corsOrigins);
  registerNotFound(server);
  registerWriteLimit(server, config.rateLimit.writesPerMinute);
  registerJsonBody(server);
  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);
  registerErrorHandling(server);
  registerCacheControl(server);
  await registerApiDocs(server, config.environment === 'development');
}

/**
 * Builds the Fastify application without listening (ADR-010), so tests can use `app.inject()`. Dependencies are
 * wired by hand: repositories with the database, use cases with repositories, routes with use cases. `main.ts` is
 * the only place with side effects.
 */
export async function buildApp(deps: AppDependencies): Promise<App> {
  const server = createServer(deps);
  await registerPlatform(server, deps.config);
  const app = server.withTypeProvider<ZodTypeProvider>();

  const customers = createCustomersRepository(deps.database.db);

  await app.register(catalogRoutes, { getCatalog: createGetCatalog(deps.catalog) });
  await app.register(healthRoutes, {
    checkHealth: createCheckHealth(createDatabaseProbe(deps.database.db)),
  });
  await app.register(customersRoutes, {
    createCustomer: createCreateCustomer({ customers, clock: deps.clock, ids: deps.ids }),
    getCustomer: createGetCustomer(customers),
    searchCustomers: createSearchCustomers(customers),
  });
  // The customers repository is the `CustomerLookup` the simulations ask for: the modules only meet here.
  const simulations = createSimulationsRepository(deps.database.db);
  await app.register(simulationsRoutes, {
    createSimulation: createCreateSimulation({
      customers,
      simulations,
      catalog: deps.catalog,
      clock: deps.clock,
      ids: deps.ids,
    }),
    getSimulation: createGetSimulation(simulations),
    listCustomerSimulations: createListCustomerSimulations({ customers, simulations }),
  });

  return app;
}
