import { NotFoundError } from '../../shared/app-error.js';
import type {
  CustomerLookup,
  PageRequest,
  SimulationList,
  SimulationRepository,
} from './simulations.types.js';

export type ListCustomerSimulations = (customerId: string, page: PageRequest) => SimulationList;

export interface ListCustomerSimulationsPorts {
  readonly customers: CustomerLookup;
  readonly simulations: SimulationRepository;
}

/** RF-11: the history of a customer. The customer is the resource of the URL, so a missing one is 404, not 422. */
export function createListCustomerSimulations({
  customers,
  simulations,
}: ListCustomerSimulationsPorts): ListCustomerSimulations {
  return (customerId, page) => {
    if (customers.findById(customerId) === undefined) throw new NotFoundError();
    return simulations.listByCustomer(customerId, page);
  };
}
