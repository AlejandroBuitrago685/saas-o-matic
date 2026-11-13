import { simulationSchema } from '@saas-o-matic/contract';
import type { CatalogInput } from '@saas-o-matic/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createCustomer, createSimulation } from '../../../test/api-helpers.js';
import { buildApiTestApp, type TestApp } from '../../../test/build-test-app.js';
import { expectBody } from '../../../test/expect-response.js';
import { CATALOG_DATA } from '../../config/catalog.data.js';
import { openDatabase, type Database } from '../../db/database.js';

const withSpainAt = (taxRateBps: number): CatalogInput => ({
  ...CATALOG_DATA,
  countries: CATALOG_DATA.countries.map((country) =>
    country.code === 'ES' ? { ...country, taxRateBps } : country,
  ),
});

let database: Database;
let before: TestApp;

beforeAll(async () => {
  database = openDatabase(':memory:');
  before = await buildApiTestApp({ database });
});

afterAll(async () => {
  await before.close();
  database.close();
});

// The three plans use the tariff STANDARD, so only the tax can change in the test catalog; the tariff is stored the
// same way (tariff_code and its lines), and a change of price would be one more line in `CATALOG_DATA`.
describe('AC-46 a simulation keeps the tax rate and the pricing it was made with', () => {
  it('after the rate of ES changes and the service restarts, the old one is intact and a new one uses the new rate', async () => {
    const customer = await createCustomer(before);
    const old = await createSimulation(before, customer.id);
    expect(old.pricing).toMatchObject({ taxRateBps: 2100, taxCents: 2940, totalCents: 16_940 });
    await before.app.close();

    const after = await buildApiTestApp({ database, catalog: withSpainAt(2200) });
    const kept = await after.app.inject({ method: 'GET', url: `/simulations/${old.id}` });
    const fresh = await createSimulation(after, customer.id);
    await after.app.close();

    expect(expectBody(kept, 200, simulationSchema)).toEqual(old);
    expect(fresh.pricing).toMatchObject({ taxRateBps: 2200, taxCents: 3080, totalCents: 17_080 });
    expect(fresh.pricing.tiers).toEqual(old.pricing.tiers);
  });
});
