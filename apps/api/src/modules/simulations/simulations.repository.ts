import { asc, count, desc, eq, inArray } from 'drizzle-orm';

import type { DatabaseClient } from '../../db/database.js';
import { simulations, simulationTiers } from '../../db/schema/index.js';
import {
  toSimulation,
  toSimulationRow,
  toTierRows,
  type SimulationRow,
  type TierRow,
} from './simulations.mapper.js';
import type { Simulation, SimulationRepository } from './simulations.types.js';

/** The pricing lines of several simulations in one query, in tier order: no query per simulation. */
function tiersOf(db: DatabaseClient, rows: readonly SimulationRow[]): Map<string, TierRow[]> {
  const byId = new Map<string, TierRow[]>(rows.map(({ id }) => [id, []]));
  if (rows.length === 0) return byId;
  const lines = db
    .select()
    .from(simulationTiers)
    .where(
      inArray(
        simulationTiers.simulationId,
        rows.map(({ id }) => id),
      ),
    )
    .orderBy(asc(simulationTiers.simulationId), asc(simulationTiers.tier))
    .all();
  for (const line of lines) byId.get(line.simulationId)?.push(line);
  return byId;
}

/** A simulation always has pricing lines (at least one user): none means damaged data, a 500, never a free price. */
function withTiers(db: DatabaseClient, rows: readonly SimulationRow[]): Simulation[] {
  const tiers = tiersOf(db, rows);
  return rows.map((row) => {
    const lines = tiers.get(row.id) ?? [];
    if (lines.length === 0) throw new Error('A stored simulation without pricing lines');
    return toSimulation(row, lines);
  });
}

/** Simulations with Drizzle (04-base-de-datos §2.2 and §2.3). Rows are only inserted: the triggers forbid the rest. */
export function createSimulationsRepository(db: DatabaseClient): SimulationRepository {
  return {
    insert: (simulation) => {
      db.transaction((transaction) => {
        transaction.insert(simulations).values(toSimulationRow(simulation)).run();
        transaction.insert(simulationTiers).values(toTierRows(simulation)).run();
      });
    },
    findById: (id) => {
      const row = db.select().from(simulations).where(eq(simulations.id, id)).get();
      return row === undefined ? undefined : withTiers(db, [row])[0];
    },
    listByCustomer: (customerId, { limit, offset }) => {
      const owned = eq(simulations.customerId, customerId);
      const rows = db
        .select()
        .from(simulations)
        .where(owned)
        .orderBy(desc(simulations.createdAt), desc(simulations.id))
        .limit(limit)
        .offset(offset)
        .all();
      const total = db.select({ total: count() }).from(simulations).where(owned).get()?.total ?? 0;
      return { items: withTiers(db, rows), total };
    },
  };
}
