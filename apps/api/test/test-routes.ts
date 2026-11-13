import { z } from 'zod';

import type { App } from '../src/app.js';
import type { Database } from '../src/db/database.js';
import { BusinessRuleError, ConflictError, NotFoundError } from '../src/shared/app-error.js';

/** Body of the test-only `POST /__test/echo`: strict, like every request schema of the contract. */
export const echoBodySchema = z.strictObject({
  name: z.string().min(2).max(10),
  units: z.number().int().min(1).max(5),
  tags: z.array(z.string()).optional(),
});

export const TEST_CUSTOMER_ID = '019a7a3c-0000-7000-8000-000000000001';

/**
 * Routes that only exist in the test app: they let P3 prove the cross-cutting behaviour of every `POST` and of the
 * error handler before the business routes arrive in P4. They are registered after `buildApp`, so they go through
 * the same hooks and handlers as the real ones.
 */
export function registerTestRoutes(app: App, database: Database): void {
  app.post('/__test/echo', { schema: { body: echoBodySchema } }, (request) => request.body);
  app.get('/__test/whoami', (request) => ({ ip: request.ip }));
  app.get('/__test/search', { schema: { querystring: z.strictObject({ q: z.string() }) } }, () => ({
    items: [],
  }));
  app.get('/__test/business-rule', () => {
    throw new BusinessRuleError([{ location: 'body', pointer: '/taxId', code: 'TAX_ID_INVALID_CHECK' }]);
  });
  app.get('/__test/conflict', () => {
    throw new ConflictError(TEST_CUSTOMER_ID);
  });
  app.get('/__test/not-found', () => {
    throw new NotFoundError();
  });
  // A failure in the data layer (AC-50): the NOT NULL constraints reject this row.
  app.get('/__test/database-failure', () => {
    database.db.$client.prepare("insert into customers (id) values ('broken')").run();
    return { ok: true };
  });
}
