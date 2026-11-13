import {
  COUNTRIES,
  MAX_ACTIVE_USERS,
  MAX_API_CALLS_PER_MONTH,
  MAX_STORAGE_GB,
  MAX_TAX_RATE_BPS,
  MIN_ACTIVE_USERS,
  MIN_API_CALLS_PER_MONTH,
  MIN_STORAGE_GB,
  MIN_TAX_RATE_BPS,
} from '@saas-o-matic/domain';
import { z } from 'zod';

import { pageOf } from './pagination.js';
import { centsSchema, isoDateTimeSchema, uuidSchema } from './shared.js';

/**
 * Body of POST /simulations (04-contrato-api §3.6). «Integer» is a JSON number without a fractional part: `15` and
 * `15.0` are valid, `"15"` and `15.5` are not. Any computed amount sent by the client is an unknown field (D-43).
 */
export const createSimulationRequestSchema = z.strictObject({
  customerId: uuidSchema,
  activeUsers: z.number().int().min(MIN_ACTIVE_USERS).max(MAX_ACTIVE_USERS),
  storageGb: z.number().int().min(MIN_STORAGE_GB).max(MAX_STORAGE_GB),
  apiCallsPerMonth: z.number().int().min(MIN_API_CALLS_PER_MONTH).max(MAX_API_CALLS_PER_MONTH),
});

const pricingLineSchema = z.object({
  tier: z.number().int().positive(),
  fromUser: z.number().int().positive(),
  toUser: z.number().int().positive().nullable(),
  units: z.number().int().positive(),
  unitPriceCents: z.number().int().positive(),
  subtotalCents: centsSchema,
});

/** The pricing snapshot a simulation stores (02-reglas §1.2), always computed by the server. */
export const pricingSchema = z.object({
  currency: z.literal('EUR'),
  tariffCode: z.string(),
  tiers: z.array(pricingLineSchema),
  baseCents: centsSchema,
  taxCountry: z.enum(COUNTRIES),
  taxRateBps: z.number().int().min(MIN_TAX_RATE_BPS).max(MAX_TAX_RATE_BPS),
  taxCents: centsSchema,
  totalCents: centsSchema,
});

/** A simulation as the API returns it (201 of POST /simulations and GET /simulations/{id}). */
export const simulationSchema = z.object({
  id: uuidSchema,
  customerId: uuidSchema,
  activeUsers: z.number().int(),
  storageGb: z.number().int(),
  apiCallsPerMonth: z.number().int(),
  pricing: pricingSchema,
  createdAt: isoDateTimeSchema,
});

export const simulationPageSchema = pageOf(simulationSchema);

export type CreateSimulationRequest = z.input<typeof createSimulationRequestSchema>;
export type SimulationResponse = z.output<typeof simulationSchema>;
export type SimulationPage = z.output<typeof simulationPageSchema>;
