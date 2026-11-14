import { existsSync } from 'node:fs';

import { err, ok, type Catalog, type Result } from '@saas-o-matic/domain';

import { openDatabase, type Database } from '../db/database.js';
import { DEMO_PROFILE } from './demo-profile.js';
import { seedDatabase } from './seed-database.js';

/** The database file and the companions SQLite leaves next to it. */
const SQLITE_SUFFIXES = ['', '-wal', '-shm', '-journal'] as const;

export interface DemoDatabaseInput {
  readonly path: string;
  readonly catalog: Catalog;
}

/**
 * The database of the public demo (D-47, AC-61, 08-despliegue §4). The demo keeps its data folder in a tmpfs that
 * Docker empties on every start of the container (deploy/demo), so every start, the daily one or a new deployment,
 * finds it empty and seeds only the fictitious profile `demo`.
 * It never deletes anything (D-174): a database already there means that `DEMO_MODE` reached a persistent database
 * by mistake (the one of the internal tool, say), so the start stops before touching it.
 */
export function openDemoDatabase({ path, catalog }: DemoDatabaseInput): Result<Database, string> {
  const found = SQLITE_SUFFIXES.map((suffix) => `${path}${suffix}`).find((file) => existsSync(file));
  if (found !== undefined) {
    return err(
      `DEMO_MODE never deletes a database, and ${found} exists: the demo starts on an empty data folder (08-despliegue §4)`,
    );
  }
  const database = openDatabase(path);
  try {
    seedDatabase({ database, catalog, profile: DEMO_PROFILE });
  } catch (error) {
    database.close();
    throw error;
  }
  return ok(database);
}
