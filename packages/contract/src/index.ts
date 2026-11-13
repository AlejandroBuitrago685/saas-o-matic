// Public API of @saas-o-matic/contract. The web app may only use `import type` from here.

export { catalogResponseSchema } from './catalog.js';
export type { CatalogResponse } from './catalog.js';
export {
  createCustomerRequestSchema,
  customerPageSchema,
  customerSchema,
  customerSummarySchema,
  searchCustomersQuerySchema,
} from './customers.js';
export type {
  CreateCustomerCommand,
  CreateCustomerRequest,
  CustomerPage,
  CustomerResponse,
  CustomerSummary,
  SearchCustomersQuery,
} from './customers.js';
export { fieldErrorsOf, pointerOf } from './field-errors.js';
export type { SchemaIssue } from './field-errors.js';
export { healthResponseSchema, healthUnavailableResponseSchema } from './health.js';
export type { HealthResponse, HealthUnavailableResponse } from './health.js';
export { pageOf, pageSchema, paginationQuerySchema } from './pagination.js';
export type { Page, PaginationQuery } from './pagination.js';
export {
  BUSINESS_ERROR_CODES,
  ERROR_LOCATIONS,
  fieldErrorSchema,
  PROBLEM_CODES,
  PROBLEMS,
  problemSchema,
  SCHEMA_ERROR_CODES,
} from './problem.js';
export type {
  BusinessErrorCode,
  ErrorLocation,
  FieldError,
  Problem,
  ProblemCode,
  SchemaErrorCode,
} from './problem.js';
export { API_ROUTES } from './routes.js';
export type { ApiRoute } from './routes.js';
export { idParamsSchema, noQuerySchema, uuidSchema } from './shared.js';
export {
  createSimulationRequestSchema,
  pricingSchema,
  simulationPageSchema,
  simulationSchema,
} from './simulations.js';
export type { CreateSimulationRequest, SimulationPage, SimulationResponse } from './simulations.js';
export { statsResponseSchema } from './stats.js';
export type { StatsResponse } from './stats.js';
