import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, it } from 'vitest';

import { prepareStartup } from './config/startup.js';
import { openDatabase, type Database } from './db/database.js';
import { DEMO_PROFILE } from './seed/demo-profile.js';
import { seedDatabase } from './seed/seed-database.js';

const API_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const folder = mkdtempSync(join(tmpdir(), 'saas-o-matic-seed-'));
const databasePath = join(folder, 'dev.db');
const DEVELOPMENT = { NODE_ENV: 'development', DATABASE_PATH: databasePath };

afterAll(() => {
  rmSync(folder, { recursive: true, force: true });
});

/** The CLI as `npm run db:reset` runs it, in a real process (a cold start of tsx can take seconds). */
function seedCli(
  args: readonly string[],
  env: Record<string, string>,
): { status: number | null; output: string } {
  const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/seed.ts', ...args], {
    cwd: API_ROOT,
    // eslint-disable-next-line no-restricted-properties -- D-138: the child process needs this environment.
    env: { ...process.env, ...env },
    encoding: 'utf8',
    timeout: 30_000,
  });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

/** The database file with only the first customer of the profile, written in this process. */
function databaseWithOneCustomer(): Database {
  const startup = prepareStartup({ env: DEVELOPMENT });
  if (!startup.ok) throw new Error(startup.error);
  const database = openDatabase(databasePath);
  seedDatabase({ database, catalog: startup.value.catalog, profile: DEMO_PROFILE.slice(0, 1) });
  return database;
}

function customers(): number {
  const database = openDatabase(databasePath);
  try {
    const row = database.db.$client.prepare('select count(*) as total from customers').get() as {
      total: number;
    };
    return row.total;
  } finally {
    database.close();
  }
}

// The seed itself (idempotent, deterministic, transactional) is tested in seed/seed-database.test.ts; here only
// what needs the real command: the refusal in production and the reset of a file (D-138).
describe('D-138 npm run db:reset (real process)', () => {
  it('refuses to run in production, before opening any database', { timeout: 60_000 }, () => {
    const result = seedCli(['--reset'], { NODE_ENV: 'production', DATABASE_PATH: databasePath });

    expect(result.status).toBe(1);
    expect(result.output).toContain('refuses to run with NODE_ENV=production');
  });

  it(
    'deletes a database that already has customers and seeds the 25 of the demo',
    { timeout: 60_000 },
    () => {
      databaseWithOneCustomer().close();
      expect(customers()).toBe(1);

      const result = seedCli(['--reset'], DEVELOPMENT);

      expect(result.status, result.output).toBe(0);
      expect(result.output).toContain('seeded with 25 customers');
      expect(customers()).toBe(25);
    },
  );

  // Only Windows refuses to delete a file another process has open; Linux and macOS unlink it (D-138).
  it.runIf(process.platform === 'win32')(
    'with the database open (the API running), stops with one clear line and no stack trace',
    { timeout: 60_000 },
    () => {
      const database = databaseWithOneCustomer();
      try {
        const result = seedCli(['--reset'], DEVELOPMENT);

        expect(result.status).toBe(1);
        expect(result.output).toContain('stop the API (npm run dev)');
        expect(result.output).not.toMatch(/^\s+at /m);
      } finally {
        database.close();
      }
    },
  );
});
