import {
  createCustomerRequestSchema,
  customerPageSchema,
  customerSchema,
  idParamsSchema,
  noQuerySchema,
  searchCustomersQuerySchema,
} from '@saas-o-matic/contract';
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';

import { problemResponses, READ_PROBLEMS, WRITE_PROBLEMS } from '../../shared/problem-responses.js';
import type { CreateCustomer } from './create-customer.use-case.js';
import { toCustomerResponse, toCustomerSummaryResponse } from './customers.mapper.js';
import type { GetCustomer } from './get-customer.use-case.js';
import type { SearchCustomers } from './search-customers.use-case.js';

export interface CustomersRoutesOptions {
  readonly createCustomer: CreateCustomer;
  readonly getCustomer: GetCustomer;
  readonly searchCustomers: SearchCustomers;
}

type CustomersApp = Parameters<FastifyPluginCallbackZod<CustomersRoutesOptions>>[0];

function createRoute(app: CustomersApp, createCustomer: CreateCustomer): void {
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
}

/** The query is never logged: `q` may be a company name or a tax id (RNF-SEC-11, AC-54). */
function listRoute(app: CustomersApp, searchCustomers: SearchCustomers): void {
  app.get(
    '/customers',
    {
      schema: {
        querystring: searchCustomersQuerySchema,
        response: { 200: customerPageSchema, ...problemResponses(...READ_PROBLEMS) },
      },
    },
    (request) => {
      const { limit, offset } = request.query;
      const { items, total } = searchCustomers(request.query);
      return { items: items.map(toCustomerSummaryResponse), page: { limit, offset, total } };
    },
  );
}

function getRoute(app: CustomersApp, getCustomer: GetCustomer): void {
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
}

/** POST /customers, GET /customers and GET /customers/{id} (04-contrato-api §3.2 to §3.4). */
export const customersRoutes: FastifyPluginCallbackZod<CustomersRoutesOptions> = (
  app,
  { createCustomer, getCustomer, searchCustomers },
  done,
) => {
  createRoute(app, createCustomer);
  listRoute(app, searchCustomers);
  getRoute(app, getCustomer);
  done();
};
