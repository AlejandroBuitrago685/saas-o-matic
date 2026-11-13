/** Source of the current instant: use cases never call `Date.now()` (03-backend §2), so tests fix the time. */
export interface Clock {
  readonly now: () => Date;
}

export const systemClock: Clock = { now: () => new Date() };
