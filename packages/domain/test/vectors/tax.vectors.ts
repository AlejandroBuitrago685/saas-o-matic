// Test vectors of 02-especificacion/02-reglas-negocio.md §6.3 and §6.4, copied as typed data with their ids.

/** Tax per country on a base of 14 000 (15 users), §6.3. */
export interface CountryTaxVector {
  readonly id: string;
  readonly country: string;
  readonly taxRateBps: number;
  readonly taxCents: number;
  readonly totalCents: number;
}

export const COUNTRY_TAX_BASE_CENTS = 14_000;

export const COUNTRY_TAX_VECTORS: readonly CountryTaxVector[] = [
  { id: 'TV-TX-01', country: 'ES', taxRateBps: 2100, taxCents: 2940, totalCents: 16_940 },
  { id: 'TV-TX-02', country: 'PT', taxRateBps: 2300, taxCents: 3220, totalCents: 17_220 },
  { id: 'TV-TX-03', country: 'FR', taxRateBps: 2000, taxCents: 2800, totalCents: 16_800 },
  { id: 'TV-TX-04', country: 'DE', taxRateBps: 1900, taxCents: 2660, totalCents: 16_660 },
  { id: 'TV-TX-05', country: 'IT', taxRateBps: 2200, taxCents: 3080, totalCents: 17_080 },
  { id: 'TV-TX-06', country: 'GB', taxRateBps: 2000, taxCents: 2800, totalCents: 16_800 },
  { id: 'TV-TX-07', country: 'US', taxRateBps: 0, taxCents: 0, totalCents: 14_000 },
];

/** Rounding with hypothetical rates, §6.4. */
export interface RoundingVector {
  readonly id: string;
  readonly baseCents: number;
  readonly taxRateBps: number;
  readonly taxCents: number;
}

export const ROUNDING_VECTORS: readonly RoundingVector[] = [
  // 3 442,5 → 3 443 (banker's rounding would give 3 442).
  { id: 'TV-RD-01', baseCents: 42_500, taxRateBps: 810, taxCents: 3443 },
  { id: 'TV-RD-02', baseCents: 42_400, taxRateBps: 810, taxCents: 3434 },
  { id: 'TV-RD-03', baseCents: 1000, taxRateBps: 810, taxCents: 81 },
  { id: 'TV-RD-04', baseCents: 42_500, taxRateBps: 815, taxCents: 3464 },
  { id: 'TV-RD-05', baseCents: 50, taxRateBps: 1, taxCents: 0 },
];
