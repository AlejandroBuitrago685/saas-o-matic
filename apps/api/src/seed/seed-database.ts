import { createHash } from 'node:crypto';

import { createCustomerRequestSchema, createSimulationRequestSchema } from '@saas-o-matic/contract';
import type { Catalog } from '@saas-o-matic/domain';

import type { Database } from '../db/database.js';
import { createCreateCustomer, createCustomersRepository } from '../modules/customers/index.js';
import { createCreateSimulation, createSimulationsRepository } from '../modules/simulations/index.js';
import type { Clock } from '../shared/clock.js';
import { createUuidV7Generator, type IdGenerator } from '../shared/id-generator.js';
import type { SeedCustomer } from './demo-profile.js';

/** The instant of the first seeded customer; every customer and simulation after it is one step later. */
export const SEED_START = new Date('2026-11-02T08:00:00.000Z');
const STEP_MS = 3 * 60 * 60 * 1000;

export interface SeedDependencies {
  readonly database: Database;
  readonly catalog: Catalog;
  readonly profile: readonly SeedCustomer[];
}

export type SeedOutcome =
  | { readonly status: 'seeded'; readonly customers: number; readonly simulations: number }
  | { readonly status: 'skipped' };

/** A clock that only moves when the seed says so: the id and the `createdAt` of an entity share their instant. */
interface Timeline {
  readonly clock: Clock;
  readonly millis: () => number;
  readonly advance: () => void;
}

function timeline(): Timeline {
  let instant = SEED_START.getTime() - STEP_MS;
  return {
    clock: { now: () => new Date(instant) },
    millis: () => instant,
    advance: () => {
      instant += STEP_MS;
    },
  };
}

/** UUID v7 of the real generator, with "random" bytes from a hash of a counter: the same ids on every run. */
function deterministicIds(millis: () => number): IdGenerator {
  let call = 0;
  return createUuidV7Generator({
    now: millis,
    fillRandom: (bytes) => {
      call += 1;
      const digest = createHash('sha256')
        .update(`saas-o-matic/seed/${String(call)}`)
        .digest();
      bytes.set(digest.subarray(0, bytes.length));
    },
  });
}

/**
 * Seeds the sample data (04-base-de-datos §7, D-140). Every customer and simulation goes through the **real use cases**
 * after the contract schemas, as if it came through the API: the tax ids are validated and the prices come from the
 * same `calculatePricing`. Deterministic (fixed clock and ids), idempotent (a database with customers is left as it
 * is) and in one transaction: if anything fails, nothing is saved.
 */
export function seedDatabase({ database, catalog, profile }: SeedDependencies): SeedOutcome {
  const customers = createCustomersRepository(database.db);
  if (customers.list({ limit: 1, offset: 0 }).total > 0) return { status: 'skipped' };
  const time = timeline();
  const ids = deterministicIds(time.millis);
  const createCustomer = createCreateCustomer({ customers, clock: time.clock, ids });
  const simulations = createSimulationsRepository(database.db);
  const createSimulation = createCreateSimulation({
    customers,
    simulations,
    catalog,
    clock: time.clock,
    ids,
  });

  return database.transaction(() => {
    let simulationCount = 0;
    for (const seeded of profile) {
      time.advance();
      const { id: customerId } = createCustomer(createCustomerRequestSchema.parse(seeded.customer));
      for (const [activeUsers, storageGb, apiCallsPerMonth] of seeded.simulations) {
        time.advance();
        const body = { customerId, activeUsers, storageGb, apiCallsPerMonth };
        createSimulation(createSimulationRequestSchema.parse(body));
        simulationCount += 1;
      }
    }
    return { status: 'seeded', customers: profile.length, simulations: simulationCount };
  });
}
