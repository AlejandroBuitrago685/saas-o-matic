import { NotFoundError } from '../../shared/app-error.js';
import type { Customer, CustomerRepository } from './customers.types.js';

export type GetCustomer = (id: string) => Customer;

/** RF-05: the customer of the URL, or 404 (the URL names the resource, so it is not a 422). */
export function createGetCustomer(customers: CustomerRepository): GetCustomer {
  return (id) => {
    const customer = customers.findById(id);
    if (customer === undefined) throw new NotFoundError();
    return customer;
  };
}
