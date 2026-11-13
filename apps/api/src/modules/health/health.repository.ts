import { sql } from 'drizzle-orm';

import type { DatabaseClient } from '../../db/database.js';
import type { DatabaseProbe } from './check-health.use-case.js';

/** `select 1`: throws if the connection is closed or the file is not readable. */
export function createDatabaseProbe(db: DatabaseClient): DatabaseProbe {
  return {
    ping: () => {
      db.get(sql`select 1`);
    },
  };
}
