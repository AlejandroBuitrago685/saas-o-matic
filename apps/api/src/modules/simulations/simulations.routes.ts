import {
  createSimulationRequestSchema,
  idParamsSchema,
  noQuerySchema,
  paginationQuerySchema,
  simulationPageSchema,
  simulationSchema,
} from '@saas-o-matic/contract';
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';

import { problemResponses, READ_PROBLEMS, WRITE_PROBLEMS } from '../../shared/problem-responses.js';
import type { CreateSimulation } from './create-simulation.use-case.js';
import type { GetSimulation } from './get-simulation.use-case.js';
import type { ListCustomerSimulations } from './list-customer-simulations.use-case.js';
import { toSimulationResponse } from './simulations.mapper.js';

export interface SimulationsRoutesOptions {
  readonly createSimulation: CreateSimulation;
  readonly getSimulation: GetSimulation;
  readonly listCustomerSimulations: ListCustomerSimulations;
}

type SimulationsApp = Parameters<FastifyPluginCallbackZod<SimulationsRoutesOptions>>[0];

function createRoute(app: SimulationsApp, createSimulation: CreateSimulation): void {
  app.post(
    '/simulations',
    {
      schema: {
        body: createSimulationRequestSchema,
        response: {
          201: simulationSchema,
          ...problemResponses(...WRITE_PROBLEMS, 'BUSINESS_RULE_VIOLATION'),
        },
      },
    },
    (request, reply) => {
      const simulation = createSimulation(request.body);
      request.log.info({ simulationId: simulation.id }, 'simulation.created');
      void reply.code(201).header('location', `/simulations/${simulation.id}`);
      return toSimulationResponse(simulation);
    },
  );
}

function getRoute(app: SimulationsApp, getSimulation: GetSimulation): void {
  app.get(
    '/simulations/:id',
    {
      schema: {
        params: idParamsSchema,
        querystring: noQuerySchema,
        response: { 200: simulationSchema, ...problemResponses(...READ_PROBLEMS, 'NOT_FOUND') },
      },
    },
    (request) => toSimulationResponse(getSimulation(request.params.id)),
  );
}

function historyRoute(app: SimulationsApp, listCustomerSimulations: ListCustomerSimulations): void {
  app.get(
    '/customers/:id/simulations',
    {
      schema: {
        params: idParamsSchema,
        querystring: paginationQuerySchema,
        response: { 200: simulationPageSchema, ...problemResponses(...READ_PROBLEMS, 'NOT_FOUND') },
      },
    },
    (request) => {
      const { limit, offset } = request.query;
      const { items, total } = listCustomerSimulations(request.params.id, { limit, offset });
      return { items: items.map(toSimulationResponse), page: { limit, offset, total } };
    },
  );
}

/**
 * POST /simulations, GET /simulations/{id} and GET /customers/{id}/simulations (04-contrato-api §3.5 to §3.7). The
 * last one hangs from `/customers` but its data belongs to this module (03-backend §1).
 */
export const simulationsRoutes: FastifyPluginCallbackZod<SimulationsRoutesOptions> = (
  app,
  { createSimulation, getSimulation, listCustomerSimulations },
  done,
) => {
  createRoute(app, createSimulation);
  getRoute(app, getSimulation);
  historyRoute(app, listCustomerSimulations);
  done();
};
