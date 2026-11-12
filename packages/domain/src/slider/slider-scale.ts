import { MAX_ACTIVE_USERS, MIN_ACTIVE_USERS } from '../pricing/active-users.js';
import { err, ok, type Result } from '../shared/result.js';

/** 280 positions, 0–279 (D-49). */
export const MIN_SLIDER_POSITION = 0;
export const MAX_SLIDER_POSITION = 279;

interface Segment {
  /** Position and value where the segment starts counting (the last point of the previous segment). */
  readonly anchorPosition: number;
  readonly anchorUsers: number;
  readonly lastPosition: number;
  readonly lastUsers: number;
  readonly step: number;
}

// 05-frontend §3.4.1: 0–99 → 1–100 (step 1), 100–189 → 110–1 000 (step 10), 190–279 → 1 100–10 000 (step 100).
const ONES: Segment = { anchorPosition: 0, anchorUsers: 1, lastPosition: 99, lastUsers: 100, step: 1 };
const TENS: Segment = { anchorPosition: 99, anchorUsers: 100, lastPosition: 189, lastUsers: 1000, step: 10 };
const HUNDREDS: Segment = {
  anchorPosition: 189,
  anchorUsers: 1000,
  lastPosition: MAX_SLIDER_POSITION,
  lastUsers: MAX_ACTIVE_USERS,
  step: 100,
};

const isInRange = (value: number, min: number, max: number): boolean =>
  Number.isInteger(value) && value >= min && value <= max;

/** Users at a slider position (`aUsuarios` in the spec). */
export function positionToUsers(position: number): Result<number, 'OUT_OF_RANGE'> {
  if (!isInRange(position, MIN_SLIDER_POSITION, MAX_SLIDER_POSITION)) return err('OUT_OF_RANGE');
  const segment = position <= ONES.lastPosition ? ONES : position <= TENS.lastPosition ? TENS : HUNDREDS;
  return ok(segment.anchorUsers + (position - segment.anchorPosition) * segment.step);
}

/**
 * Position whose value is closest to `users`; on a tie, the lower one (`aPosición` in the spec). Any value from 1 to
 * 10 000 has a position, even if no position has exactly that value (the numeric field keeps the real value, D-49).
 */
export function usersToPosition(users: number): Result<number, 'OUT_OF_RANGE'> {
  if (!isInRange(users, MIN_ACTIVE_USERS, MAX_ACTIVE_USERS)) return err('OUT_OF_RANGE');
  const segment = users <= ONES.lastUsers ? ONES : users <= TENS.lastUsers ? TENS : HUNDREDS;
  // Rounds the step count to the nearest integer, halves down: (offset + ⌈step / 2⌉ − 1) / step, floored.
  const steps = Math.floor((users - segment.anchorUsers + Math.ceil(segment.step / 2) - 1) / segment.step);
  return ok(segment.anchorPosition + steps);
}
