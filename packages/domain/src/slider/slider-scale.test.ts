import { describe, expect, it } from 'vitest';

import { POSITION_TO_USERS_VECTORS, USERS_TO_POSITION_VECTORS } from '../../test/vectors/slider.vectors.js';
import { MAX_ACTIVE_USERS, MIN_ACTIVE_USERS } from '../pricing/active-users.js';
import { MAX_SLIDER_POSITION, positionToUsers, usersToPosition } from './slider-scale.js';

function users(position: number): number {
  const result = positionToUsers(position);
  if (!result.ok) throw new Error(`position ${String(position)} rejected`);
  return result.value;
}

function position(n: number): number {
  const result = usersToPosition(n);
  if (!result.ok) throw new Error(`users ${String(n)} rejected`);
  return result.value;
}

const ALL_POSITIONS = Array.from({ length: MAX_SLIDER_POSITION + 1 }, (_value, index) => index);
const ALL_VALUES = Array.from({ length: MAX_ACTIVE_USERS }, (_value, index) => index + MIN_ACTIVE_USERS);
const halfStepOf = (n: number): number => (n <= 100 ? 0 : n <= 1000 ? 5 : 50);

describe('AC-91 slider scale (RF-16, D-48, D-49)', () => {
  it.each(POSITION_TO_USERS_VECTORS)('$id: position $position → $users users', (vector) => {
    expect(positionToUsers(vector.position)).toEqual({ ok: true, value: vector.users });
  });

  it.each(USERS_TO_POSITION_VECTORS)('$id: $users users → position $position', (vector) => {
    expect(usersToPosition(vector.users)).toEqual({ ok: true, value: vector.position });
  });
});

describe('AC-91 the four properties, over all 280 positions and all 10 000 values (D-90)', () => {
  it('1 · strictly increasing, from 1 at position 0 to 10 000 at position 279', () => {
    expect(users(0)).toBe(MIN_ACTIVE_USERS);
    expect(users(MAX_SLIDER_POSITION)).toBe(MAX_ACTIVE_USERS);
    for (const p of ALL_POSITIONS.slice(1))
      expect(users(p), `position ${String(p)}`).toBeGreaterThan(users(p - 1));
  });

  it('2 · round trip from the position: usersToPosition(positionToUsers(p)) = p', () => {
    for (const p of ALL_POSITIONS) expect(position(users(p)), `position ${String(p)}`).toBe(p);
  });

  it('3 · round trip from the value for every value with a position; 10, 11, 50 and 51 are reached exactly', () => {
    const reachable = new Set(ALL_POSITIONS.map(users));
    for (const n of reachable) expect(users(position(n)), `value ${String(n)}`).toBe(n);
    expect([10, 11, 50, 51].every((n) => reachable.has(n))).toBe(true);
  });

  it('4 · any value is at most half a step (0, 5 or 50) from the value of its position', () => {
    for (const n of ALL_VALUES) {
      expect(Math.abs(users(position(n)) - n), `value ${String(n)}`).toBeLessThanOrEqual(halfStepOf(n));
    }
  });
});

describe('AC-91 usersToPosition agrees with a brute-force oracle on all 10 000 values (P1 review)', () => {
  /** Closest position by scanning all 280; on a tie, the lower one (05-frontend §3.4.1). */
  const oracle = (n: number): number =>
    ALL_POSITIONS.reduce((best, p) => (Math.abs(users(p) - n) < Math.abs(users(best) - n) ? p : best), 0);

  it('chooses the closest position, the lower one on a tie, in every segment', () => {
    const mismatches = ALL_VALUES.filter((n) => position(n) !== oracle(n));

    expect(mismatches).toEqual([]);
  });
});

describe('AC-91 inputs outside the scale', () => {
  it.each([-1, 280, 1.5, Number.NaN])('rejects position %d', (p) => {
    expect(positionToUsers(p)).toEqual({ ok: false, error: 'OUT_OF_RANGE' });
  });

  it.each([0, 10_001, 10.5, Number.NaN])('rejects %d users', (n) => {
    expect(usersToPosition(n)).toEqual({ ok: false, error: 'OUT_OF_RANGE' });
  });
});
