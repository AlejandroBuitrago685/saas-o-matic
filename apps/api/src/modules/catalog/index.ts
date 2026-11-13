// Public API of the catalog module: what `app.ts` and other modules may use (03-backend §2).

export { catalogRoutes } from './catalog.routes.js';
export { createGetCatalog } from './get-catalog.use-case.js';
