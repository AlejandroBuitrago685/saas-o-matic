import { simulationSchema } from '@saas-o-matic/contract';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createCustomer, postSimulation, simulationBody } from '../../../test/api-helpers.js';
import { buildApiTestApp, settableClock, type TestApp } from '../../../test/build-test-app.js';
import { simulationExamples } from '../../../test/contract-examples.js';
import { expectBody } from '../../../test/expect-response.js';

const clock = settableClock(new Date('2026-11-12T10:20:00.000Z'));

let testApp: TestApp;
let customerId: string;

beforeAll(async () => {
  testApp = await buildApiTestApp({ clock });
  customerId = (await createCustomer(testApp)).id;
});

afterAll(async () => {
  await testApp.close();
});

describe('AC-40 POST /simulations creates a simulation with the pricing the server computes', () => {
  it('answers 201 with Location and the pricing of the example of the contract, and GET returns the same', async () => {
    const { request, created } = simulationExamples();

    const response = await postSimulation(testApp, { ...request, customerId });
    const simulation = expectBody(response, 201, simulationSchema);

    expect(response.headers.location).toBe(`/simulations/${simulation.id}`);
    expect(simulation).toEqual({ ...created, id: simulation.id, customerId });
    const fetched = await testApp.app.inject({ method: 'GET', url: `/simulations/${simulation.id}` });
    expect(expectBody(fetched, 200, simulationSchema)).toEqual(simulation);
  });
});

/** TV-PR-01…09 (02-reglas-negocio §2.3): the API prices every vector as the domain does, ES at 21 %. */
const VECTORS = [
  { vector: 'TV-PR-01', users: 1, tiers: [1], base: 1000, tax: 210, total: 1210 },
  { vector: 'TV-PR-02', users: 10, tiers: [10], base: 10_000, tax: 2100, total: 12_100 },
  { vector: 'TV-PR-03', users: 11, tiers: [10, 1], base: 10_800, tax: 2268, total: 13_068 },
  { vector: 'TV-PR-04', users: 15, tiers: [10, 5], base: 14_000, tax: 2940, total: 16_940 },
  { vector: 'TV-PR-05', users: 50, tiers: [10, 40], base: 42_000, tax: 8820, total: 50_820 },
  { vector: 'TV-PR-06', users: 51, tiers: [10, 40, 1], base: 42_500, tax: 8925, total: 51_425 },
  { vector: 'TV-PR-07', users: 100, tiers: [10, 40, 50], base: 67_000, tax: 14_070, total: 81_070 },
  { vector: 'TV-PR-08', users: 1000, tiers: [10, 40, 950], base: 517_000, tax: 108_570, total: 625_570 },
  {
    vector: 'TV-PR-09',
    users: 10_000,
    tiers: [10, 40, 9950],
    base: 5_017_000,
    tax: 1_053_570,
    total: 6_070_570,
  },
] as const;

describe('TV-PR-01…09 the pricing of the API matches the vectors of the specification', () => {
  it.each(VECTORS)('$vector: $users users → $total cents', async ({ users, tiers, base, tax, total }) => {
    const response = await postSimulation(testApp, simulationBody(customerId, { activeUsers: users }));
    const { pricing } = expectBody(response, 201, simulationSchema);

    expect(pricing.tiers.map(({ units }) => units)).toEqual(tiers);
    expect([pricing.baseCents, pricing.taxCents, pricing.totalCents]).toEqual([base, tax, total]);
    expect(pricing).toMatchObject({
      currency: 'EUR',
      tariffCode: 'STANDARD',
      taxCountry: 'ES',
      taxRateBps: 2100,
    });
    expect(pricing.tiers.reduce((sum, { subtotalCents }) => sum + subtotalCents, 0)).toBe(base);
  });
});
