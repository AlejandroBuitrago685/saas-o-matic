import { z } from 'zod';

/** Response 200 of GET /health (04-contrato-api §3.9): the database answers. */
export const healthResponseSchema = z.object({ status: z.literal('ok') });

/** Response 503 of GET /health: no internal details (AC-48). */
export const healthUnavailableResponseSchema = z.object({ status: z.literal('unavailable') });

export type HealthResponse = z.output<typeof healthResponseSchema>;
export type HealthUnavailableResponse = z.output<typeof healthUnavailableResponseSchema>;
