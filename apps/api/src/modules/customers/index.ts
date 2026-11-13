// Public API of the customers module: what `app.ts` and other modules may use (03-backend §2).

export { createCreateCustomer } from './create-customer.use-case.js';
export { createCustomersRepository } from './customers.repository.js';
export { customersRoutes } from './customers.routes.js';
export { createGetCustomer } from './get-customer.use-case.js';
export { createSearchCustomers } from './search-customers.use-case.js';
export type { Customer, CustomerRepository } from './customers.types.js';
