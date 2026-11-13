import { COUNTRIES, MAX_TAX_RATE_BPS, MIN_TAX_RATE_BPS, PLANS, TAX_ID_TYPES } from '@saas-o-matic/domain';
import { z } from 'zod';

const positiveInt = z.number().int().positive();
const range = z.object({ min: z.number().int(), max: z.number().int() });

const tariffTierSchema = z.object({
  tier: positiveInt,
  fromUser: positiveInt,
  toUser: positiveInt.nullable(),
  unitPriceCents: positiveInt,
});

/** Response of GET /catalog (04-contrato-api §3.1). */
export const catalogResponseSchema = z.object({
  countries: z.array(
    z.object({
      code: z.enum(COUNTRIES),
      taxRateBps: z.number().int().min(MIN_TAX_RATE_BPS).max(MAX_TAX_RATE_BPS),
      taxIdTypes: z.array(z.enum(TAX_ID_TYPES)),
      taxIdPrefix: z.string().nullable(),
    }),
  ),
  plans: z.array(z.object({ code: z.enum(PLANS), tariffCode: z.string() })),
  tariffs: z.array(
    z.object({ code: z.string(), currency: z.literal('EUR'), tiers: z.array(tariffTierSchema) }),
  ),
  limits: z.object({
    activeUsers: range,
    storageGb: range,
    apiCallsPerMonth: range,
    companyName: range,
    contactEmail: z.object({ max: z.number().int() }),
    taxId: range,
    searchQuery: z.object({ max: z.number().int() }),
    pageSize: z.object({ default: z.number().int(), max: z.number().int() }),
  }),
});

export type CatalogResponse = z.output<typeof catalogResponseSchema>;
