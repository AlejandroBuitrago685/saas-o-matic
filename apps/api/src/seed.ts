import { parseArgs } from 'node:util';

import { prepareStartup } from './config/startup.js';
import { openDatabase } from './db/database.js';
import { removeDatabaseFiles } from './seed/database-files.js';
import { DEMO_PROFILE } from './seed/demo-profile.js';
import { seedDatabase, type SeedOutcome } from './seed/seed-database.js';

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

/** A file in use (the API still running) is an expected stop: its message, not a stack trace (D-138). */
function resetFile(path: string): void {
  try {
    removeDatabaseFiles(path);
  } catch (error) {
    fail(`db:reset: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function describeOutcome(outcome: SeedOutcome, path: string): string {
  return outcome.status === 'skipped'
    ? `db:seed: ${path} already has customers; nothing was added.\n`
    : `db:seed: ${path} seeded with ${String(outcome.customers)} customers and ${String(outcome.simulations)} simulations (profile demo).\n`;
}

/**
 * `npm run db:seed` and `npm run db:reset` (04-base-de-datos §7, D-138): the sample data of the profile `demo` in the
 * database of `DATABASE_PATH`, with `--reset` deleting the file first. Never in production: the demo regenerates its
 * data on its own start (08-despliegue §4), and a real database must not receive fictitious customers.
 */
function main(): void {
  const { values } = parseArgs({ options: { reset: { type: 'boolean', default: false } }, strict: true });
  const startup = prepareStartup();
  if (!startup.ok) fail(startup.error);
  const { config, catalog } = startup.value;
  if (config.environment === 'production') fail('db:seed refuses to run with NODE_ENV=production');
  if (values.reset) resetFile(config.databasePath);

  const database = openDatabase(config.databasePath);
  try {
    const outcome = seedDatabase({ database, catalog, profile: DEMO_PROFILE });
    process.stdout.write(describeOutcome(outcome, config.databasePath));
  } finally {
    database.close();
  }
}

main();
