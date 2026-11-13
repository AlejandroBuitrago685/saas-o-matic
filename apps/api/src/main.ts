import { buildApp } from './app.js';
import { prepareStartup } from './config/startup.js';
import { openDatabase } from './db/database.js';
import { systemClock } from './shared/clock.js';
import { uuidV7Generator } from './shared/id-generator.js';

/**
 * Composition root: the only module with side effects (ADR-010, 03-backend §3). Configuration and catalog are
 * validated before anything opens (AC-07, AC-55); on SIGTERM or SIGINT the app closes first and the database after.
 */
async function main(): Promise<void> {
  const startup = prepareStartup();
  if (!startup.ok) {
    process.stderr.write(`${startup.error}\n`);
    process.exit(1);
  }
  const { config, catalog } = startup.value;

  const database = openDatabase(config.databasePath);
  const app = await buildApp({ config, catalog, database, clock: systemClock, ids: uuidV7Generator });

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
