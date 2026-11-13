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
  /** Routes that only exist in this test app, never in production (AC-23, AC-24, AC-50, AC-53). */
  readonly routes?: (app: App, database: Database) => void;
}

/**
 * The real app (ADR-010) with SQLite in memory and the same migrations as production, a fixed clock, deterministic
 * ids and captured logs. Requests go through `app.inject()`, without opening ports (03-arquitectura/07-tests.md).
 */
export async function buildTestApp({ config = {}, routes }: TestAppOptions = {}): Promise<TestApp> {
  const startup = prepareStartup({ env: { NODE_ENV: 'test', DATABASE_PATH: ':memory:' } });
  if (!startup.ok) throw new Error(startup.error);
  const database = openDatabase(':memory:');
  const lines: string[] = [];
  const app = await buildApp({
    config: { ...startup.value.config, ...config },
    catalog: startup.value.catalog,
    database,
    clock: fixedClock,
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
      if (database.isOpen()) database.close();
    },
  };
}
