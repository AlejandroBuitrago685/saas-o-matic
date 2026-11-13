import type { CatalogInput } from '@saas-o-matic/domain';

import { buildApp, type App } from '../src/app.js';
import type { AppConfig } from '../src/config/env.js';
import { prepareStartup } from '../src/config/startup.js';
import { openDatabase, type Database } from '../src/db/database.js';
import type { Clock } from '../src/shared/clock.js';
import { createUuidV7Generator, type IdGenerator } from '../src/shared/id-generator.js';

/** The instant every test lives in (03-backend §3). */
export const FIXED_NOW = new Date('2026-11-12T10:00:00.000Z');

const fixedClock: Clock = { now: () => new Date(FIXED_NOW) };

/** The real UUID v7 generator on the fixed clock, with a predictable "random" source: the same ids on every run. */
export function deterministicIds(): IdGenerator {
  let call = 0;
  return createUuidV7Generator({
    now: () => FIXED_NOW.getTime(),
    fillRandom: (bytes) => {
      call += 1;
      bytes.forEach((_, index) => (bytes[index] = (call * 31 + index * 7) % 256));
    },
  });
}

export interface TestApp {
  readonly app: App;
  readonly database: Database;
  /** Every log line written so far, as pino wrote it (AC-54). */
  readonly logs: () => string;
  readonly close: () => Promise<void>;
}

export interface TestAppOptions {
  /** Changes over the test configuration (`NODE_ENV=test`, SQLite in memory). */
  readonly config?: Partial<AppConfig>;
  /** The business catalog; the one of production unless a test changes it (AC-46). */
  readonly catalog?: CatalogInput;
  /** An open database to share between apps: a restart of the service (AC-46). The caller closes it. */
  readonly database?: Database;
  /** The clock of the app; the fixed `FIXED_NOW` by default. */
  readonly clock?: Clock;
  /** Routes that only exist in this test app, never in production (AC-23, AC-24, AC-50, AC-53). */
  readonly routes?: (app: App, database: Database) => void;
}

/** A clock a test moves by hand, for the things that depend on the order in time (AC-44). */
export interface SettableClock extends Clock {
  readonly set: (instant: Date) => void;
}

export function settableClock(start: Date = FIXED_NOW): SettableClock {
  let current: Date = start;
  return {
    now: () => new Date(current),
    set: (instant: Date) => {
      current = instant;
    },
  };
}

/**
 * The real app (ADR-010) with SQLite in memory and the same migrations as production, a fixed clock, deterministic
 * ids and captured logs. Requests go through `app.inject()`, without opening ports (03-arquitectura/07-tests.md).
 */
export async function buildTestApp({
  config = {},
  catalog,
  database: shared,
  clock = fixedClock,
  routes,
}: TestAppOptions = {}): Promise<TestApp> {
  const startup = prepareStartup({
    env: { NODE_ENV: 'test', DATABASE_PATH: ':memory:' },
    ...(catalog === undefined ? {} : { catalog }),
  });
  if (!startup.ok) throw new Error(startup.error);
  const database = shared ?? openDatabase(':memory:');
  const lines: string[] = [];
  const app = await buildApp({
    config: { ...startup.value.config, ...config },
    catalog: startup.value.catalog,
    database,
    clock,
    ids: deterministicIds(),
    logStream: { write: (line) => void lines.push(line) },
  });
  routes?.(app, database);
  await app.ready();
  return {
    app,
    database,
    logs: () => lines.join(''),
    close: async () => {
      await app.close();
      if (shared === undefined && database.isOpen()) database.close();
    },
  };
}

/** Limits high enough for a test that makes many requests; the limit tests set their own (D-44). */
const GENEROUS_LIMITS = { perMinute: 100_000, writesPerMinute: 100_000 } as const;

/** `buildTestApp` for the business routes: the default 20 writes per minute would stop any integration test. */
export function buildApiTestApp(options: TestAppOptions = {}): Promise<TestApp> {
  return buildTestApp({ ...options, config: { rateLimit: GENEROUS_LIMITS, ...options.config } });
}
