import {
  createCustomerRequestSchema,
  customerSchema,
  idParamsSchema,
  noQuerySchema,
} from '@saas-o-matic/contract';
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';

import { problemResponses, READ_PROBLEMS, WRITE_PROBLEMS } from '../../shared/problem-responses.js';
import type { CreateCustomer } from './create-customer.use-case.js';
import { toCustomerResponse } from './customers.mapper.js';
import type { GetCustomer } from './get-customer.use-case.js';

export interface CustomersRoutesOptions {
  readonly createCustomer: CreateCustomer;
  readonly getCustomer: GetCustomer;
}

/** POST /customers and GET /customers/{id} (04-contrato-api §3.2 and §3.4). The listing is P7. */
export const customersRoutes: FastifyPluginCallbackZod<CustomersRoutesOptions> = (
  app,
  { createCustomer, getCustomer },
  done,
) => {
  app.post(
    '/customers',
    {
      schema: {
        body: createCustomerRequestSchema,
        response: {
          201: customerSchema,
          ...problemResponses(...WRITE_PROBLEMS, 'BUSINESS_RULE_VIOLATION', 'CUSTOMER_ALREADY_EXISTS'),
        },
      },
    },
    (request, reply) => {
      const customer = createCustomer(request.body);
      request.log.info({ customerId: customer.id }, 'customer.created');
      void reply.code(201).header('location', `/customers/${customer.id}`);
      return toCustomerResponse(customer);
    },
  );

  app.get(
    '/customers/:id',
    {
      schema: {
        params: idParamsSchema,
        querystring: noQuerySchema,
        response: { 200: customerSchema, ...problemResponses(...READ_PROBLEMS, 'NOT_FOUND') },
      },
    },
    (request) => toCustomerResponse(getCustomer(request.params.id)),
  );
  done();
};
