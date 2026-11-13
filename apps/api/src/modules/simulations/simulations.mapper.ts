import type { SimulationResponse } from '@saas-o-matic/contract';
import type { Country, PricingLine } from '@saas-o-matic/domain';

import type { Simulation } from './simulations.types.js';

/** A row of `simulations`, by shape: only the repository may import the Drizzle schema (03-backend §2). */
export interface SimulationRow {
  readonly id: string;
  readonly customerId: string;
  readonly activeUsers: number;
  readonly storageGb: number;
  readonly apiCallsPerMonth: number;
  readonly currency: string;
  readonly tariffCode: string;
  readonly baseCents: number;
  readonly taxCountry: Country;
  readonly taxRateBps: number;
  readonly taxCents: number;
  readonly totalCents: number;
  /** Unix milliseconds, UTC. */
  readonly createdAt: number;
}

/** A row of `simulation_tiers`. */
export interface TierRow extends PricingLine {
  readonly simulationId: string;
}

export function toSimulationRow({
  id,
  customerId,
  pricing,
  createdAt,
  ...request
}: Simulation): SimulationRow {
  return {
    id,
    customerId,
    activeUsers: request.activeUsers,
    storageGb: request.storageGb,
    apiCallsPerMonth: request.apiCallsPerMonth,
    currency: pricing.currency,
    tariffCode: pricing.tariffCode,
    baseCents: pricing.baseCents,
    taxCountry: pricing.taxCountry,
    taxRateBps: pricing.taxRateBps,
    taxCents: pricing.taxCents,
    totalCents: pricing.totalCents,
    createdAt: createdAt.getTime(),
  };
}

export const toTierRows = ({ id, pricing }: Simulation): TierRow[] =>
  pricing.tiers.map((line) => ({ ...line, simulationId: id }));

/** The `simulations_currency_ck` constraint keeps the column at `EUR`, the only currency of the prices (D-10). */
export function toSimulation(row: SimulationRow, tiers: readonly TierRow[]): Simulation {
  return {
    id: row.id,
    customerId: row.customerId,
    activeUsers: row.activeUsers,
    storageGb: row.storageGb,
    apiCallsPerMonth: row.apiCallsPerMonth,
    pricing: {
      currency: 'EUR',
      tariffCode: row.tariffCode,
      tiers: tiers.map(({ tier, fromUser, toUser, units, unitPriceCents, subtotalCents }) => ({
        tier,
        fromUser,
        toUser,
        units,
        unitPriceCents,
        subtotalCents,
      })),
      baseCents: row.baseCents,
      taxCountry: row.taxCountry,
      taxRateBps: row.taxRateBps,
      taxCents: row.taxCents,
      totalCents: row.totalCents,
    },
    createdAt: new Date(row.createdAt),
  };
}

/** The DTO of the contract (04-contrato-api §3.6). */
export function toSimulationResponse(simulation: Simulation): SimulationResponse {
  const { pricing } = simulation;
  return {
    ...simulation,
    pricing: { ...pricing, tiers: [...pricing.tiers] },
    createdAt: simulation.createdAt.toISOString(),
  };
}
