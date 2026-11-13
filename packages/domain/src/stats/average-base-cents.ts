import { roundHalfUpDivide } from '../money/round-half-up.js';
import { err, ok, type Result } from '../shared/result.js';

export type StatsError = 'INVALID_TOTALS';

/**
 * Average base of the simulations (02-reglas §5, D-26): `Σ baseCents / simulationsCount`, rounded half up; `null` when
 * there are no simulations. It takes the sum and the count, which the database computes in one query; a negative or
 * unsafe total, or a sum without simulations, cannot come from valid data.
 */
export function averageBaseCents(sumCents: number, count: number): Result<number | null, StatsError> {
  if (count === 0) return sumCents === 0 ? ok(null) : err('INVALID_TOTALS');
  const average = roundHalfUpDivide(sumCents, count);
  return average.ok ? average : err('INVALID_TOTALS');
}
