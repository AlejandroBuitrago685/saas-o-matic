import { err, ok, validateCatalog, type Catalog, type CatalogInput, type Result } from '@saas-o-matic/domain';

import { CATALOG_DATA } from './catalog.data.js';
import { loadConfig, type AppConfig } from './env.js';

export interface StartupInput {
  /** The process environment unless a test passes its own. */
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly catalog?: CatalogInput;
}

export interface StartupSettings {
  readonly config: AppConfig;
  readonly catalog: Catalog;
}

/**
 * Everything the service needs before it opens the database or listens (03-backend §3, RNF-SEC-12): the environment
 * and the business catalog, both validated. Any problem stops the startup with a message that names each datum
 * (AC-07, AC-55); `main.ts` prints it and exits with a non-zero code.
 */
export function prepareStartup({ env = process.env, catalog = CATALOG_DATA }: StartupInput = {}): Result<
  StartupSettings,
  string
> {
  const config = loadConfig(env);
  if (!config.ok) return config;
  const validated = validateCatalog(catalog);
  if (!validated.ok) {
    const problems = validated.error.map(({ path, message }) => `${path}: ${message}`);
    return err(`Invalid business catalog -> ${problems.join('; ')}`);
  }
  return ok({ config: config.value, catalog: validated.value });
}
