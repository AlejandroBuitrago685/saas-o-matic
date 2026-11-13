import { averageBaseCents } from '@saas-o-matic/domain';

import type { Stats, StatsReader } from './stats.types.js';

export type GetStats = () => Stats;

/**
 * GET /stats (RF-19, AC-47): the counts as they are and the average base rounded half up by the domain (D-26).
 * Totals that no valid data can produce (a negative sum, a sum without simulations) are damaged data: a 500.
 */
export function createGetStats(reader: StatsReader): GetStats {
  return () => {
    const { customersCount, simulationsCount, baseCentsSum } = reader.totals();
    const average = averageBaseCents(baseCentsSum, simulationsCount);
    if (!average.ok) throw new Error('The stored simulations give impossible totals');
    return { customersCount, simulationsCount, averageBaseCents: average.value, currency: 'EUR' };
  };
}
