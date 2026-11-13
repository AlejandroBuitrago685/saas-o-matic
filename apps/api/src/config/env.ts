import { err, ok, type Result } from '@saas-o-matic/domain';
import { z } from 'zod';

import { commaList } from './comma-list.js';
import { trustProxySchema } from './trust-proxy.js';

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;
const ENVIRONMENTS = ['development', 'test', 'production'] as const;

const flag = z.enum(['true', 'false']).transform((value) => value === 'true');

/** An http(s) origin: scheme, host and port, nothing else (RNF-SEC-07). `*` is not a URL, so it fails. */
const originSchema = z
  .url({ protocol: /^https?$/ })
  .refine((url) => {
    // Zod 4 runs refinements even when z.url() already failed: guard before parsing.
    if (!URL.canParse(url)) return true;
    const { pathname, search, hash } = new URL(url);
    return pathname === '/' && search === '' && hash === '';
  }, 'must be an origin: scheme://host[:port]')
  .transform((url) => new URL(url).origin);

const corsOriginsSchema = z.string().transform(commaList).pipe(z.array(originSchema).min(1));

const envSchema = z
  .object({
    NODE_ENV: z.enum(ENVIRONMENTS).default('development'),
    HOST: z.union([z.ipv4(), z.ipv6()]).default('127.0.0.1'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    DATABASE_PATH: z.string().min(1).default('./data/saas-o-matic.db'),
    CORS_ORIGINS: corsOriginsSchema.default(['http://localhost:4200']),
    RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(100),
    RATE_LIMIT_WRITES_PER_MINUTE: z.coerce.number().int().positive().default(20),
    TRUST_PROXY: trustProxySchema.default(false),
    LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
    DEMO_MODE: flag.default(false),
  })
  .refine((env) => env.DATABASE_PATH !== ':memory:' || env.NODE_ENV === 'test', {
    path: ['DATABASE_PATH'],
    message: 'an in-memory database is only allowed in tests',
  });

export interface AppConfig {
  readonly environment: (typeof ENVIRONMENTS)[number];
  readonly host: string;
  readonly port: number;
  readonly databasePath: string;
  readonly corsOrigins: readonly string[];
  readonly rateLimit: { readonly perMinute: number; readonly writesPerMinute: number };
  /** D-105: `false`, or the addresses and ranges of the proxies in front. */
  readonly trustProxy: false | readonly string[];
  readonly logLevel: (typeof LOG_LEVELS)[number];
  /** Resets the demo data at startup (08-despliegue §4, P11); the demo limits are the RATE_LIMIT_* variables. */
  readonly isDemoMode: boolean;
}

/**
 * Validates the environment at startup (03-backend §5, RNF-SEC-12): an invalid value stops the process before it
 * listens (AC-55). The message names each variable and its problem, never the value. This module is the only one
 * allowed to read `process.env` (CLAUDE.md).
 */
export function loadConfig(
  env: Readonly<Record<string, string | undefined>> = process.env,
): Result<AppConfig, string> {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    // The first segment is the variable (`CORS_ORIGINS`, not `CORS_ORIGINS.0`): that is what the operator sets.
    const problems = parsed.error.issues.map((issue) => `${String(issue.path[0])}: ${issue.message}`);
    return err(`Invalid environment configuration -> ${problems.join('; ')}`);
  }
  const value = parsed.data;
  return ok({
    environment: value.NODE_ENV,
    host: value.HOST,
    port: value.PORT,
    databasePath: value.DATABASE_PATH,
    corsOrigins: value.CORS_ORIGINS,
    rateLimit: {
      perMinute: value.RATE_LIMIT_PER_MINUTE,
      writesPerMinute: value.RATE_LIMIT_WRITES_PER_MINUTE,
    },
    trustProxy: value.TRUST_PROXY,
    logLevel: value.LOG_LEVEL,
    isDemoMode: value.DEMO_MODE,
  });
}
