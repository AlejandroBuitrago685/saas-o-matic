import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, afterEach, describe, expect, it } from 'vitest';

import { prepareStartup } from '../config/startup.js';
import { openDatabase, type Database } from '../db/database.js';
import { openDemoDatabase } from './demo-database.js';
import { DEMO_PROFILE, type SeedCustomer } from './demo-profile.js';
import { seedDatabase } from './seed-database.js';

const startup = prepareStartup({ env: { NODE_ENV: 'test', DATABASE_PATH: ':memory:' } });
if (!startup.ok) throw new Error(startup.error);
const { catalog } = startup.value;

const folder = mkdtempSync(join(tmpdir(), 'saas-o-matic-demo-'));
const opened: Database[] = [];

afterEach(() => {
  for (const database of opened.splice(0)) database.close();
});

afterAll(() => {
  rmSync(folder, { recursive: true, force: true });
});

const dump = (database: Database, table: string): unknown[] =>
  database.db.$client.prepare(`select * from ${table} order by 1, 2`).all();

/** A customer a visitor of the demo could have created: a sample one under another name. */
function visitorCustomer(): SeedCustomer {
  const [sample] = DEMO_PROFILE;
  if (sample === undefined) throw new Error('the profile demo is empty');
  return {
    customer: { ...sample.customer, companyName: 'Datos de un visitante SL' },
    simulations: [[3, 0, 0]],
  };
}

/** What a fresh seed of the profile demo contains, to compare with. */
function freshSample(): Database {
  const database = openDatabase(':memory:');
  opened.push(database);
  seedDatabase({ database, catalog, profile: DEMO_PROFILE });
  return database;
}

describe('AC-61 D-47 D-174 every start of the demo seeds the sample data on an empty data folder (08-despliegue §4)', () => {
  it('seeds exactly the sample data of the profile demo, and nothing else', () => {
    const demo = openDemoDatabase({ path: join(folder, 'first-start.db'), catalog });
    if (!demo.ok) throw new Error(demo.error);
    opened.push(demo.value);

    const sample = freshSample();
    for (const table of ['customers', 'simulations', 'simulation_tiers']) {
      expect(dump(demo.value, table), table).toEqual(dump(sample, table));
    }
  });

  it('never deletes a database it finds: it refuses to start, and the data stays as it was', () => {
    const path = join(folder, 'used.db');
    const used = openDatabase(path);
    seedDatabase({ database: used, catalog, profile: [visitorCustomer()] });
    used.close();

    const demo = openDemoDatabase({ path, catalog });

    expect(demo.ok ? '' : demo.error).toContain('DEMO_MODE never deletes a database');
    const kept = openDatabase(path);
    opened.push(kept);
    expect(dump(kept, 'customers')).toHaveLength(1);
  });

  it.each(['-wal', '-shm', '-journal'])('refuses too when only its %s file is left', (suffix) => {
    const path = join(folder, `leftover${suffix}.db`);
    writeFileSync(`${path}${suffix}`, '');

    expect(openDemoDatabase({ path, catalog }).ok).toBe(false);
  });
});
