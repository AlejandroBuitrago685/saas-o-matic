import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { openDatabase, type Database } from '../../db/database.js';
import { customers } from '../../db/schema/index.js';
import { createSimulationsRepository } from './simulations.repository.js';
import type { Simulation, SimulationRepository } from './simulations.types.js';

const CUSTOMER_ID = '019a7a3c-0000-7000-8000-000000000001';
const SIMULATION_ID = '019a7a3c-0000-7000-8000-000000000002';

const simulation = (overrides: Partial<Simulation['pricing']> = {}): Simulation => ({
  id: SIMULATION_ID,
  customerId: CUSTOMER_ID,
  activeUsers: 15,
  storageGb: 250,
  apiCallsPerMonth: 1_200_000,
  pricing: {
    currency: 'EUR',
    tariffCode: 'STANDARD',
    tiers: [
      { tier: 1, fromUser: 1, toUser: 10, units: 10, unitPriceCents: 1000, subtotalCents: 10_000 },
      { tier: 2, fromUser: 11, toUser: 50, units: 5, unitPriceCents: 800, subtotalCents: 4000 },
    ],
    baseCents: 14_000,
    taxCountry: 'ES',
    taxRateBps: 2100,
    taxCents: 2940,
    totalCents: 16_940,
    ...overrides,
  },
  createdAt: new Date('2026-11-12T10:20:00.000Z'),
});

let database: Database;
let repository: SimulationRepository;

const rowsOf = (table: 'simulations' | 'simulation_tiers'): number =>
  (database.db.$client.prepare(`select count(*) as total from ${table}`).get() as { total: number }).total;

beforeEach(() => {
  database = openDatabase(':memory:');
  database.db
    .insert(customers)
    .values({
      id: CUSTOMER_ID,
      companyName: 'Acme',
      companyNameSearch: 'acme',
      taxId: 'B12345674',
      taxIdType: 'CIF',
      country: 'ES',
      contactEmail: 'compras@acme.example',
      plan: 'BUSINESS',
      createdAt: 1,
    })
    .run();
  repository = createSimulationsRepository(database.db);
});

afterEach(() => {
  database.close();
});

describe('simulations repository (04-base-de-datos §2.3, D-18)', () => {
  it('stores the simulation and its pricing lines and reads them back as they were', () => {
    repository.insert(simulation());

    expect(repository.findById(SIMULATION_ID)).toEqual(simulation());
    expect(rowsOf('simulation_tiers')).toBe(2);
  });

  it('is atomic: a pricing line that breaks a constraint leaves no simulation behind', () => {
    const broken = simulation({
      tiers: [
        { tier: 1, fromUser: 1, toUser: 10, units: 10, unitPriceCents: 1000, subtotalCents: 10_000 },
        // `subtotal_cents = units * unit_price_cents` fails on the second row, after the first has been written.
        { tier: 2, fromUser: 11, toUser: 50, units: 5, unitPriceCents: 800, subtotalCents: 1 },
      ],
    });

    expect(() => {
      repository.insert(broken);
    }).toThrow();

    expect(rowsOf('simulations')).toBe(0);
    expect(rowsOf('simulation_tiers')).toBe(0);
  });

  it('a simulation without pricing lines is corrupt data, not a free simulation: reading it fails', () => {
    // Only a manual edit of the file can leave one: the insert writes the lines in the same transaction.
    database.db.$client
      .prepare(
        `insert into simulations (id, customer_id, active_users, storage_gb, api_calls_per_month, currency,
           tariff_code, base_cents, tax_country, tax_rate_bps, tax_cents, total_cents, created_at)
         values (?, ?, 1, 0, 0, 'EUR', 'STANDARD', 1000, 'ES', 2100, 210, 1210, 1)`,
      )
      .run(SIMULATION_ID, CUSTOMER_ID);

    expect(() => repository.findById(SIMULATION_ID)).toThrow(/without pricing lines/);
    expect(() => repository.listByCustomer(CUSTOMER_ID, { limit: 20, offset: 0 })).toThrow(
      /without pricing lines/,
    );
  });

  it('a simulation of a customer that does not exist is rejected by the foreign key', () => {
    expect(() => {
      repository.insert({ ...simulation(), customerId: '019a7a3c-0000-7000-8000-0000000000aa' });
    }).toThrow();
    expect(rowsOf('simulations')).toBe(0);
  });
});
