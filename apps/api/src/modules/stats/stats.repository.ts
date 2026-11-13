import { count, sql, sum } from 'drizzle-orm';

import type { DatabaseClient } from '../../db/database.js';
import { customers, simulations } from '../../db/schema/index.js';
import type { StatsReader, StatsTotals } from './stats.types.js';

/**
 * One statement with scalar subqueries (04-base-de-datos §5): the three numbers come from the same snapshot, so a
 * simulation saved meanwhile can never be counted without its base. `SUM` of no rows is `NULL`, hence `coalesce`.
 */
export function createStatsRepository(db: DatabaseClient): StatsReader {
  return {
    totals: (): StatsTotals => {
      const customersCount = db.select({ value: count() }).from(customers);
      const simulationsCount = db.select({ value: count() }).from(simulations);
      const baseCentsSum = db.select({ value: sum(simulations.baseCents) }).from(simulations);
      const row = db
        .select({
          customersCount: sql<number>`(${customersCount})`.mapWith(Number),
          simulationsCount: sql<number>`(${simulationsCount})`.mapWith(Number),
          baseCentsSum: sql<number>`coalesce((${baseCentsSum}), 0)`.mapWith(Number),
        })
        .from(sql`(select 1)`)
        .get();
      if (row === undefined) throw new Error('The stats query returned no row');
      return row;
    },
  };
}
