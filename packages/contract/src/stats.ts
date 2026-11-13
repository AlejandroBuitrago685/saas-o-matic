import { z } from 'zod';

import { centsSchema } from './shared.js';

/** Response of GET /stats (04-contrato-api §3.8): `averageBaseCents` is null without simulations (TV-ST-03). */
export const statsResponseSchema = z.object({
  customersCount: z.number().int().min(0),
  simulationsCount: z.number().int().min(0),
  averageBaseCents: centsSchema.nullable(),
  currency: z.literal('EUR'),
});

export type StatsResponse = z.output<typeof statsResponseSchema>;
