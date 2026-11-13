// Public API of the stats module: what `app.ts` and other modules may use (03-backend §2).

export { createGetStats } from './get-stats.use-case.js';
export { createStatsRepository } from './stats.repository.js';
export { statsRoutes } from './stats.routes.js';
