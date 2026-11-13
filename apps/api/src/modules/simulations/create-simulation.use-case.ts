import type { CreateSimulationCommand } from '@saas-o-matic/contract';
import { calculatePricing, type Catalog } from '@saas-o-matic/domain';

import { BusinessRuleError } from '../../shared/app-error.js';
import type { Clock } from '../../shared/clock.js';
import type { IdGenerator } from '../../shared/id-generator.js';
import type { CustomerLookup, Simulation, SimulationRepository } from './simulations.types.js';

export type CreateSimulation = (command: CreateSimulationCommand) => Simulation;

export interface CreateSimulationPorts {
  readonly customers: CustomerLookup;
  readonly simulations: SimulationRepository;
  readonly catalog: Catalog;
  readonly clock: Clock;
  readonly ids: IdGenerator;
}

/**
 * RF-07, RF-10: the tariff comes from the plan of the customer and the tax from its country, both in the catalog; the
 * client only sends quantities (D-43). `calculatePricing` is the one function the web projects with too (ADR-008), and
 * what it returns is stored as it is: the later changes of the catalog do not touch it (D-18).
 */
export function createCreateSimulation({
  customers,
  simulations,
  catalog,
  clock,
  ids,
}: CreateSimulationPorts): CreateSimulation {
  return (command) => {
    const customer = customers.findById(command.customerId);
    if (customer === undefined) {
      throw new BusinessRuleError([{ location: 'body', pointer: '/customerId', code: 'CUSTOMER_NOT_FOUND' }]);
    }
    const priced = calculatePricing(
      catalog.tariffByPlan[customer.plan],
      command.activeUsers,
      catalog.taxRateBps[customer.country],
    );
    // The schema has already checked the range, and the catalog was validated at startup: a failure is a bug (500).
    if (!priced.ok) throw new Error(`The pricing of a valid simulation failed: ${priced.error}`);
    const simulation: Simulation = {
      id: ids.next(),
      customerId: customer.id,
      activeUsers: command.activeUsers,
      storageGb: command.storageGb,
      apiCallsPerMonth: command.apiCallsPerMonth,
      pricing: { ...priced.value, currency: 'EUR', taxCountry: customer.country },
      createdAt: clock.now(),
    };
    simulations.insert(simulation);
    return simulation;
  };
}
