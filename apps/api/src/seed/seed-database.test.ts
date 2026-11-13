import { customerPageSchema } from '@saas-o-matic/contract';
import { COUNTRIES, normalizeForSearch, TAX_ID_TYPES } from '@saas-o-matic/domain';
import { afterEach, describe, expect, it } from 'vitest';

import { countRows } from '../../test/api-helpers.js';
import { buildApiTestApp, type TestApp } from '../../test/build-test-app.js';
import { expectBody } from '../../test/expect-response.js';
import { prepareStartup } from '../config/startup.js';
import { openDatabase, type Database } from '../db/database.js';
import { BusinessRuleError } from '../shared/app-error.js';
import { DEMO_PROFILE, type SeedCustomer } from './demo-profile.js';
import { SEED_START, seedDatabase } from './seed-database.js';

/** Real tax ids of 03-validacion-fiscal §5 (TV-ES-13 and TV-ES-31 to 34): never in sample data. */
const REAL_TAX_IDS = ['Q2826000H', 'A28015865', 'A15075062', 'A46103834', 'A39000013'];

const startup = prepareStartup({ env: { NODE_ENV: 'test', DATABASE_PATH: ':memory:' } });
if (!startup.ok) throw new Error(startup.error);
const { catalog } = startup.value;

const opened: Database[] = [];
let testApp: TestApp | undefined;

afterEach(async () => {
  for (const database of opened.splice(0)) database.close();
  await testApp?.close();
  testApp = undefined;
});

function seeded(profile: readonly SeedCustomer[] = DEMO_PROFILE): Database {
  const database = openDatabase(':memory:');
  opened.push(database);
  seedDatabase({ database, catalog, profile });
  return database;
}

const dump = (database: Database, table: string): unknown[] =>
  database.db.$client.prepare(`select * from ${table} order by 1, 2`).all();

describe('D-140 seed of the profile demo (04-base-de-datos §7)', () => {
  it('creates 25 customers, of the 7 countries and the 5 types of tax id, and their simulations', () => {
    const database = openDatabase(':memory:');
    opened.push(database);

    const outcome = seedDatabase({ database, catalog, profile: DEMO_PROFILE });

    const expectedSimulations = DEMO_PROFILE.reduce((sum, { simulations }) => sum + simulations.length, 0);
    expect(outcome).toEqual({ status: 'seeded', customers: 25, simulations: expectedSimulations });
    const rows = dump(database, 'customers') as {
      country: string;
      tax_id_type: string;
      created_at: number;
    }[];
    expect(new Set(rows.map(({ country }) => country))).toEqual(new Set(COUNTRIES));
    expect(new Set(rows.map(({ tax_id_type: type }) => type))).toEqual(new Set(TAX_ID_TYPES));
    expect(Math.min(...rows.map(({ created_at: at }) => at))).toBe(SEED_START.getTime());
  });

  it('is deterministic: two seeds write exactly the same rows, ids and dates included', () => {
    const first = seeded();
    const second = seeded();

    for (const table of ['customers', 'simulations', 'simulation_tiers']) {
      expect(dump(second, table)).toEqual(dump(first, table));
    }
  });

  it('is idempotent: a database that already has customers is left as it is', () => {
    const database = seeded();
    const before = dump(database, 'simulations');

    expect(seedDatabase({ database, catalog, profile: DEMO_PROFILE })).toEqual({ status: 'skipped' });
    expect(dump(database, 'simulations')).toEqual(before);
  });

  it('uses only synthetic tax ids, never the real ones of the vectors', () => {
    const taxIds = (dump(seeded(), 'customers') as { tax_id: string }[]).map(({ tax_id: id }) => id);

    expect(taxIds.filter((id) => REAL_TAX_IDS.includes(id))).toEqual([]);
  });

  it('goes through the use cases in one transaction: an invalid customer saves nothing at all', async () => {
    const [first, second] = DEMO_PROFILE;
    if (first === undefined || second === undefined) throw new Error('The demo profile is too short');
    const broken = { ...second, customer: { ...second.customer, taxId: 'B12345675' } };
    testApp = await buildApiTestApp();
    const { database } = testApp;

    expect(() => seedDatabase({ database, catalog, profile: [first, broken] })).toThrow(BusinessRuleError);
    expect(countRows(testApp, 'customers')).toBe(0);
    expect(countRows(testApp, 'simulations')).toBe(0);
  });
});

describe('AC-28 GET /customers over the 25 sample customers', () => {
  const listed = async (query: Record<string, string>) => {
    testApp = await buildApiTestApp();
    seedDatabase({ database: testApp.database, catalog, profile: DEMO_PROFILE });
    const response = await testApp.app.inject({ method: 'GET', url: '/customers', query });
    return expectBody(response, 200, customerPageSchema);
  };

  it.each([
    ['without q', {}],
    ['with a q of spaces only', { q: '   ' }],
  ])('%s: the first 20, by name without case or accents, and total 25', async (_name, query) => {
    const page = await listed(query);

    const keys = page.items.map(({ companyName }) => normalizeForSearch(companyName));
    expect(page.items).toHaveLength(20);
    expect(page.page).toEqual({ limit: 20, offset: 0, total: 25 });
    expect(keys).toEqual([...keys].sort());
  });

  it('offset=20 returns the 5 that remain, after the first page', async () => {
    const first = await listed({});
    await testApp?.close();
    const rest = await listed({ offset: '20' });

    const all = [...first.items, ...rest.items].map(({ companyName }) => normalizeForSearch(companyName));
    expect(rest.items).toHaveLength(5);
    expect(all).toEqual([...all].sort());
    expect(new Set(all).size).toBe(25);
  });
});
