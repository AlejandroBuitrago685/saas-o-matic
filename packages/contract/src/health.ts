import { z } from 'zod';

/** Response of GET /health (spec 04 §3.9). Strict: anything not declared here cannot be returned. */
export const healthResponseSchema = z.strictObject({
  status: z.literal('ok'),
});

export type HealthResponse = z.output<typeof healthResponseSchema>;
