import { buildApp } from '../src/app.js';
import { prepareStartup } from '../src/config/startup.js';
import { openDatabase } from '../src/db/database.js';
import { systemClock } from '../src/shared/clock.js';
import { uuidV7Generator } from '../src/shared/id-generator.js';

/**
 * The OpenAPI document of the production app (D-110), exactly as `apps/api/openapi.json` versions it. It is built
 * from the same Zod schemas that validate the requests, on a throwaway in-memory database.
 */
export async function openApiDocument(): Promise<string> {
  const startup = prepareStartup({
    env: { NODE_ENV: 'test', DATABASE_PATH: ':memory:', LOG_LEVEL: 'silent' },
  });
  if (!startup.ok) throw new Error(startup.error);
  const database = openDatabase(':memory:');
  const app = await buildApp({
    config: { ...startup.value.config, environment: 'production' },
    catalog: startup.value.catalog,
    database,
    clock: systemClock,
    ids: uuidV7Generator,
  });
  try {
    await app.ready();
    return `${JSON.stringify(app.swagger(), null, 2)}\n`;
  } finally {
    await app.close();
    database.close();
  }
}
