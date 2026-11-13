import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { COUNTRIES, PLANS, TAX_ID_TYPES } from '@saas-o-matic/domain';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { openDatabase, type Database } from './database.js';

const CUSTOMER_ID = '01a1cf33-2d00-7a3e-9c41-5b7d2e8f1a60';
const SIMULATION_ID = '01a1cf45-7c80-7f21-a6b3-0d4e5f6a7b8c';

const CUSTOMER = {
  id: CUSTOMER_ID,
  company_name: 'Acme Ibérica S.L.',
  company_name_search: 'acme iberica s.l.',
  tax_id: 'B12345674',
  tax_id_type: 'CIF',
  country: 'ES',
  contact_email: 'compras@acme-iberica.example',
  plan: 'BUSINESS',
  created_at: 1_794_528_000_000,
};
const SIMULATION = {
  id: SIMULATION_ID,
  customer_id: CUSTOMER_ID,
  active_users: 15,
  storage_gb: 250,
  api_calls_per_month: 1_200_000,
  currency: 'EUR',
  tariff_code: 'STANDARD',
  base_cents: 14_000,
  tax_country: 'ES',
  tax_rate_bps: 2100,
  tax_cents: 2940,
  total_cents: 16_940,
  created_at: 1_794_528_000_000,
};
const TIER = {
  simulation_id: SIMULATION_ID,
  tier: 1,
  from_user: 1,
  to_user: 10,
  units: 10,
  unit_price_cents: 1000,
  subtotal_cents: 10_000,
};

type Row = Record<string, string | number | null>;

function insert(database: Database, table: string, row: Row): void {
  const columns = Object.keys(row);
  database.db.$client
    .prepare(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map((c) => `@${c}`).join(', ')})`,
    )
    .run(row);
}

let database: Database;

beforeEach(() => {
  database = openDatabase(':memory:');
});

afterEach(() => {
  database.close();
});

describe('ADR-007 the pragmas are applied on every connection, checked on a real file', () => {
  it('foreign_keys, WAL, synchronous NORMAL, busy_timeout and trusted_schema OFF', () => {
    const directory = mkdtempSync(join(tmpdir(), 'saas-o-matic-db-'));
    const fileDatabase = openDatabase(join(directory, 'test.db'));
    try {
      const read = (name: string): unknown => fileDatabase.db.$client.pragma(name, { simple: true });

      expect({
        foreignKeys: read('foreign_keys'),
        journalMode: read('journal_mode'),
        synchronous: read('synchronous'),
        busyTimeout: read('busy_timeout'),
        trustedSchema: read('trusted_schema'),
      }).toEqual({ foreignKeys: 1, journalMode: 'wal', synchronous: 1, busyTimeout: 5000, trustedSchema: 0 });
    } finally {
      fileDatabase.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

describe('D-29 the three tables are append-only, enforced by triggers (04-base-de-datos §2.4)', () => {
  beforeEach(() => {
    insert(database, 'customers', CUSTOMER);
    insert(database, 'simulations', SIMULATION);
    insert(database, 'simulation_tiers', TIER);
  });

  it.each([
    ['customers', `UPDATE customers SET plan = 'STARTER'`],
    ['customers', 'DELETE FROM customers'],
    ['simulations', 'UPDATE simulations SET storage_gb = 0'],
    ['simulations', 'DELETE FROM simulations'],
    ['simulation_tiers', 'UPDATE simulation_tiers SET units = 1'],
    ['simulation_tiers', 'DELETE FROM simulation_tiers'],
  ])('%s rejects: %s', (table, statement) => {
    expect(() => database.db.$client.prepare(statement).run()).toThrow(`${table} is append-only`);
  });
});

describe('ADR-007 / D-98 the CHECK constraints reject impossible rows (04-base-de-datos §2)', () => {
  it.each([
    ['an unknown country', 'customers', { ...CUSTOMER, country: 'XX' }],
    ['a tax id that is not normalized', 'customers', { ...CUSTOMER, tax_id: 'b-1234567-4' }],
    ['an email that is not lower case', 'customers', { ...CUSTOMER, contact_email: 'Compras@Acme.example' }],
    // SQLite's type affinity turns numeric text ('15') into an integer, so what is stored is still an integer;
    // the CHECK rejects what cannot be converted.
    ['a date stored as non-numeric text', 'customers', { ...CUSTOMER, created_at: 'yesterday' }],
    ['a UUID in upper case', 'customers', { ...CUSTOMER, id: CUSTOMER_ID.toUpperCase() }],
  ])('customers: %s', (_case, table, row) => {
    expect(() => {
      insert(database, table, row);
    }).toThrow(/CHECK constraint failed/);
  });

  it.each([
    ['a total that is not base + tax', 'simulations', { ...SIMULATION, total_cents: 16_941 }],
    ['10 001 users', 'simulations', { ...SIMULATION, active_users: 10_001 }],
    ['users with a fractional part', 'simulations', { ...SIMULATION, active_users: 15.5 }],
    ['a free tier (D-98)', 'simulation_tiers', { ...TIER, unit_price_cents: 0, subtotal_cents: 0 }],
    ['a subtotal that is not units × price', 'simulation_tiers', { ...TIER, subtotal_cents: 9999 }],
  ])('simulations: %s', (_case, table, row) => {
    insert(database, 'customers', CUSTOMER);
    if (table === 'simulation_tiers') insert(database, 'simulations', SIMULATION);

    expect(() => {
      insert(database, table, row);
    }).toThrow(/CHECK constraint failed/);
  });

  it('rejects a simulation of a customer that does not exist (foreign_keys is ON)', () => {
    expect(() => {
      insert(database, 'simulations', SIMULATION);
    }).toThrow(/FOREIGN KEY constraint failed/);
  });

  it('rejects a second customer with the same country and tax id (D-17)', () => {
    insert(database, 'customers', CUSTOMER);

    expect(() => {
      insert(database, 'customers', { ...CUSTOMER, id: SIMULATION_ID });
    }).toThrow(/UNIQUE constraint failed/);
  });
});

describe('AC-16 / D-100 the closed lists of the migration are the domain constants (04-base-de-datos §6)', () => {
  const migration = readFileSync(
    fileURLToPath(new URL('../../drizzle/0000_init.sql', import.meta.url)),
    'utf8',
  );
  const listOf = (column: string): string[] => {
    const match = new RegExp(`"\\w+"\\."${column}" IN \\(([^)]*)\\)`).exec(migration);
    return (match?.[1] ?? '').split(',').map((value) => value.trim().replaceAll("'", ''));
  };

  it('country, tax_country, plan and tax_id_type list exactly COUNTRIES, PLANS and TAX_ID_TYPES', () => {
    expect(listOf('country')).toEqual([...COUNTRIES]);
    expect(listOf('tax_country')).toEqual([...COUNTRIES]);
    expect(listOf('plan')).toEqual([...PLANS]);
    expect(listOf('tax_id_type')).toEqual([...TAX_ID_TYPES]);
  });
});
