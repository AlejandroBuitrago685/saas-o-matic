import { err, ok, type Result } from '@saas-o-matic/domain';

/** Port: something that fails if the database does not answer. */
export interface DatabaseProbe {
  readonly ping: () => void;
}

export type CheckHealth = () => Result<void, unknown>;

/**
 * GET /health (RNF-24): the service is healthy when the database answers a trivial query. The failure keeps its
 * cause, so the route can log it while the response says nothing internal (AC-48).
 */
export function createCheckHealth(probe: DatabaseProbe): CheckHealth {
  return () => {
    try {
      probe.ping();
      return ok(undefined);
    } catch (error) {
      return err(error);
    }
  };
}
