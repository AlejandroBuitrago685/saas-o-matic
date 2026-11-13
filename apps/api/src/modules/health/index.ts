// Public API of the health module: what `app.ts` and other modules may use (03-backend §2).

export { createCheckHealth } from './check-health.use-case.js';
export { createDatabaseProbe } from './health.repository.js';
export { healthRoutes } from './health.routes.js';
