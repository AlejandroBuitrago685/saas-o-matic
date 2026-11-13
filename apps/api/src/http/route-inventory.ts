import type { FastifyInstance } from 'fastify';

export interface RegisteredRoute {
  readonly method: string;
  readonly url: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    /** Every route registered so far, plugins included: the closed inventory is checked against it (AC-58). */
    readonly routeInventory: () => readonly RegisteredRoute[];
  }
}

/** Must be the first thing registered, so it also sees the routes that plugins add (the CORS `OPTIONS *`). */
export function registerRouteInventory(app: FastifyInstance): void {
  const routes: RegisteredRoute[] = [];
  app.addHook('onRoute', ({ method, url }) => {
    for (const each of [method].flat()) routes.push({ method: each, url });
  });
  app.decorate('routeInventory', () => [...routes]);
}
