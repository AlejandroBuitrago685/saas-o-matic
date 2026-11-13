import type { Country, Plan, Pricing } from '@saas-o-matic/domain';

/** The pricing a simulation stores (02-reglas-negocio §1.2): the one of `domain` plus its currency and tax country. */
export interface SimulationPricing extends Pricing {
  readonly currency: 'EUR';
  readonly taxCountry: Country;
}

export interface Simulation {
  readonly id: string;
  readonly customerId: string;
  readonly activeUsers: number;
  readonly storageGb: number;
  readonly apiCallsPerMonth: number;
  readonly pricing: SimulationPricing;
  readonly createdAt: Date;
}

/** What a simulation needs to know of its customer: whether it exists, its country (tax) and its plan (tariff). */
export interface PricedCustomer {
  readonly id: string;
  readonly country: Country;
  readonly plan: Plan;
}

/**
 * Port of the customers module, declared here and implemented by its repository (03-backend §2): `app.ts` connects
 * them, so the two modules do not depend on each other.
 */
export interface CustomerLookup {
  readonly findById: (id: string) => PricedCustomer | undefined;
}

export interface PageRequest {
  readonly limit: number;
  readonly offset: number;
}

export interface SimulationList {
  readonly items: readonly Simulation[];
  /** Simulations of the customer, not only of this page. */
  readonly total: number;
}

export interface SimulationRepository {
  /** The simulation and its pricing lines, in one transaction: all of them or none (04-base-de-datos §2.3). */
  readonly insert: (simulation: Simulation) => void;
  readonly findById: (id: string) => Simulation | undefined;
  /** From the most recent to the oldest; at the same instant, the greater id first (04-contrato-api §3.5). */
  readonly listByCustomer: (customerId: string, page: PageRequest) => SimulationList;
}
