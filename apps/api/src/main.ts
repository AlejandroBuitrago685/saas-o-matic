import type { Catalog } from '@saas-o-matic/domain';

import { buildApp } from './app.js';
import type { AppConfig } from './config/env.js';
import { prepareStartup } from './config/startup.js';
import { openDatabase, type Database } from './db/database.js';
import { openDemoDatabase } from './seed/demo-database.js';
import { systemClock } from './shared/clock.js';
import { uuidV7Generator } from './shared/id-generator.js';

/** A problem found before listening: its message, never a stack trace, and a non-zero exit (AC-55). */
function stop(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

/** The database of the configuration; in the demo (`DEMO_MODE`), a new one with the sample data (AC-61, D-174). */
function openConfiguredDatabase(config: AppConfig, catalog: Catalog): Database {
  if (!config.isDemoMode) return openDatabase(config.databasePath);
  const demo = openDemoDatabase({ path: config.databasePath, catalog });
  if (!demo.ok) stop(demo.error);
  return demo.value;
}

/**
 * Composition root: the only module with side effects (ADR-010, 03-backend §3). Configuration and catalog are
 * validated before anything opens (AC-07, AC-55); on SIGTERM or SIGINT the app closes first and the database after.
 */
async function main(): Promise<void> {
  const startup = prepareStartup();
  if (!startup.ok) stop(startup.error);
  const { config, catalog } = startup.value;

  const database = openConfiguredDatabase(config, catalog);
  const app = await buildApp({ config, catalog, database, clock: systemClock, ids: uuidV7Generator });
  if (config.isDemoMode) app.log.info('demo mode: sample data seeded');

  const shutdown = (): void => {
    app.close().then(
      () => {
        database.close();
        process.exit(0);
      },
      (error: unknown) => {
        app.log.error({ err: error }, 'shutdown failed');
        process.exit(1);
      },
    );
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  await app.listen({ host: config.host, port: config.port });
}

await main();
