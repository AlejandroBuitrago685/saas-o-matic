import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import Sqlite from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import * as schema from './schema/index.js';

export type DatabaseClient = BetterSQLite3Database<typeof schema> & { readonly $client: Sqlite.Database };

export interface Database {
  readonly db: DatabaseClient;
  /** True while the connection is open: `close()` can then be called once, from `main.ts` or a test. */
  readonly isOpen: () => boolean;
  readonly close: () => void;
}

/** Applied on every connection (ADR-007): `foreign_keys` is off by default in SQLite and is not stored in the file. */
const PRAGMAS = [
  'foreign_keys = ON',
  'journal_mode = WAL',
  'synchronous = NORMAL',
  'busy_timeout = 5000',
  'trusted_schema = OFF',
] as const;

/** Committed migrations (apps/api/drizzle), the same in production and in tests. Same depth from src/ and dist/. */
const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../drizzle', import.meta.url));

const IN_MEMORY = ':memory:';

/**
 * Opens the SQLite database, applies the pragmas and runs the pending migrations (04-base-de-datos §5, §7). The
 * folder of the file is created if missing (the first `npm run dev`). If a pragma or a migration fails, the
 * connection is closed before the error goes up: the process is about to stop and must not keep the file open.
 */
export function openDatabase(path: string): Database {
  if (path !== IN_MEMORY) mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Sqlite(path);
  let db: DatabaseClient;
  try {
    for (const pragma of PRAGMAS) sqlite.pragma(pragma);
    db = drizzle(sqlite, { schema });
    migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  } catch (error) {
    sqlite.close();
    throw error;
  }
  return {
    db,
    isOpen: () => sqlite.open,
    close: () => {
      sqlite.close();
    },
  };
}
