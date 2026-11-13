/** The raw totals of the dashboard metrics, all taken from the same snapshot of the database. */
export interface StatsTotals {
  readonly customersCount: number;
  readonly simulationsCount: number;
  readonly baseCentsSum: number;
}

/** Port: reads the totals; implemented by `stats.repository.ts`. */
export interface StatsReader {
  readonly totals: () => StatsTotals;
}

/** The metrics of GET /stats (04-contrato-api §3.8), always in EUR. */
export interface Stats {
  readonly customersCount: number;
  readonly simulationsCount: number;
  readonly averageBaseCents: number | null;
  readonly currency: 'EUR';
}
