/**
 * Closed inventory of the API (04-contrato-api §3, RNF-SEC-17): no other route or method exists (AC-58). Path
 * parameters use Fastify's syntax.
 */
export const API_ROUTES = [
  { method: 'GET', url: '/catalog' },
  { method: 'POST', url: '/customers' },
  { method: 'GET', url: '/customers' },
  { method: 'GET', url: '/customers/:id' },
  { method: 'GET', url: '/customers/:id/simulations' },
  { method: 'POST', url: '/simulations' },
  { method: 'GET', url: '/simulations/:id' },
  { method: 'GET', url: '/stats' },
  { method: 'GET', url: '/health' },
] as const;

export type ApiRoute = (typeof API_ROUTES)[number];
