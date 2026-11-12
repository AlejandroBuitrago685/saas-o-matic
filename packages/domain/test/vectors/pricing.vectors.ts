// Test vectors of 02-especificacion/02-reglas-negocio.md §2.1, §6.1 and §6.2, copied as typed data with their ids.

/** STANDARD tariff of the statement (§2.1), as the catalog would configure it. */
export const STANDARD_TARIFF = {
  code: 'STANDARD',
  tiers: [
    { tier: 1, fromUser: 1, toUser: 10, unitPriceCents: 1000 },
    { tier: 2, fromUser: 11, toUser: 50, unitPriceCents: 800 },
    { tier: 3, fromUser: 51, toUser: null, unitPriceCents: 500 },
  ],
} as const;

export const ES_TAX_RATE_BPS = 2100;

/** Base, tax (ES, 21 %) and total per number of users, §6.1. Units are per tier 1, 2 and 3. */
export interface PricingVector {
  readonly id: string;
  readonly users: number;
  readonly units: readonly [number, number, number];
  readonly baseCents: number;
  readonly taxCents: number;
  readonly totalCents: number;
}

export const PRICING_VECTORS: readonly PricingVector[] = [
  { id: 'TV-PR-01', users: 1, units: [1, 0, 0], baseCents: 1000, taxCents: 210, totalCents: 1210 },
  { id: 'TV-PR-02', users: 10, units: [10, 0, 0], baseCents: 10_000, taxCents: 2100, totalCents: 12_100 },
  { id: 'TV-PR-03', users: 11, units: [10, 1, 0], baseCents: 10_800, taxCents: 2268, totalCents: 13_068 },
  { id: 'TV-PR-04', users: 15, units: [10, 5, 0], baseCents: 14_000, taxCents: 2940, totalCents: 16_940 },
  { id: 'TV-PR-05', users: 50, units: [10, 40, 0], baseCents: 42_000, taxCents: 8820, totalCents: 50_820 },
  { id: 'TV-PR-06', users: 51, units: [10, 40, 1], baseCents: 42_500, taxCents: 8925, totalCents: 51_425 },
  {
    id: 'TV-PR-07',
    users: 100,
    units: [10, 40, 50],
    baseCents: 67_000,
    taxCents: 14_070,
    totalCents: 81_070,
  },
  {
    id: 'TV-PR-08',
    users: 1000,
    units: [10, 40, 950],
    baseCents: 517_000,
    taxCents: 108_570,
    totalCents: 625_570,
  },
  {
    id: 'TV-PR-09',
    users: 10_000,
    units: [10, 40, 9950],
    baseCents: 5_017_000,
    taxCents: 1_053_570,
    totalCents: 6_070_570,
  },
];

/**
 * Invalid numbers of users that a typed domain can receive, §6.2. The last two vectors of §6.2 (the string `"15"`
 * and `null`) cannot reach a typed function: the contract schema tests them in P3 (D-93). Their ids are not written
 * here on purpose: the traceability script would count them as covered.
 */
export interface InvalidUsersVector {
  readonly id: string;
  readonly users: number;
  readonly error: 'OUT_OF_RANGE' | 'INVALID_TYPE';
}

export const INVALID_USERS_VECTORS: readonly InvalidUsersVector[] = [
  { id: 'TV-PR-10', users: 0, error: 'OUT_OF_RANGE' },
  { id: 'TV-PR-11', users: 10_001, error: 'OUT_OF_RANGE' },
  { id: 'TV-PR-12', users: -1, error: 'OUT_OF_RANGE' },
  { id: 'TV-PR-13', users: 10.5, error: 'INVALID_TYPE' },
];
