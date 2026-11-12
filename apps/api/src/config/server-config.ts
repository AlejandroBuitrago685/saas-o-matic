import { err, ok, type Result } from '@saas-o-matic/domain';
import { z } from 'zod';

const serverEnvSchema = z.object({
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export interface ServerConfig {
  readonly host: string;
  readonly port: number;
  readonly logLevel: z.infer<typeof serverEnvSchema>['LOG_LEVEL'];
}

/**
 * Validates the server part of the environment (03-arquitectura/03-backend.md §5).
 * The rest of the variables (database, CORS, rate limits, demo mode) are added in P3.
 * This module is the only place allowed to read `process.env` (CLAUDE.md).
 */
export function loadServerConfig(
  env: Readonly<Record<string, string | undefined>> = process.env,
): Result<ServerConfig, string> {
  const parsed = serverEnvSchema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    return err(`Invalid environment configuration -> ${problems.join('; ')}`);
  }
  const { HOST, PORT, LOG_LEVEL } = parsed.data;
  return ok({ host: HOST, port: PORT, logLevel: LOG_LEVEL });
}
