import { describe, expect, it } from 'vitest';

import { createUuidV7Generator, uuidV7Generator } from './id-generator.js';

const CANONICAL_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ids = Array.from({ length: 200 }, () => uuidV7Generator.next());

/** A random source that fills each call with the next of the given bytes. */
const randomOf = (...fills: number[]) => {
  let call = 0;
  return (bytes: Uint8Array): void => {
    bytes.fill(fills[call % fills.length] ?? 0);
    call += 1;
  };
};

/** `rand_a`, the 12-bit counter: the three hex digits after the version. */
const counterOf = (id: string): number => Number.parseInt(id.slice(15, 18), 16);

describe('AC-62 ids are UUID v7 (RFC 9562, D-41)', () => {
  it('have version 7 and the RFC 9562 variant, in canonical lower case', () => {
    for (const id of ids) expect(id).toMatch(CANONICAL_V7);
  });

  it('increase in creation order, so the database index follows time', () => {
    expect([...ids].sort()).toEqual(ids);
  });

  it('are not correlative: consecutive ids differ in their random part', () => {
    const randomParts = ids.map((id) => id.slice(-12));

    expect(new Set(randomParts).size).toBe(ids.length);
  });

  it('start with the 48-bit timestamp in milliseconds', () => {
    const generator = createUuidV7Generator({ now: () => 0x0123_4567_89ab, fillRandom: randomOf(0) });

    expect(generator.next()).toMatch(/^01234567-89ab-7/);
  });
});

describe('RNF-SEC-04 / D-115 every id carries 62 new random bits, even within the same millisecond', () => {
  it('rand_b comes whole from the random source on every call', () => {
    const generator = createUuidV7Generator({ now: () => 1_000, fillRandom: randomOf(0x00, 0xff, 0x00) });

    const [first, second, third] = [generator.next(), generator.next(), generator.next()];

    expect(first.slice(19)).toBe('8000-000000000000');
    expect(second.slice(19)).toBe('bfff-ffffffffffff');
    expect(third.slice(19)).toBe('8000-000000000000');
  });

  it('within a millisecond only the 12-bit counter goes up, starting at random in its lower half', () => {
    const generator = createUuidV7Generator({ now: () => 1_000, fillRandom: randomOf(0xff) });

    const [first, second] = [generator.next(), generator.next()];

    expect(counterOf(first)).toBe(0x7ff);
    expect(counterOf(second)).toBe(0x800);
    expect(first.slice(0, 13)).toBe(second.slice(0, 13));
  });

  it('borrows the next millisecond when the counter runs out, and keeps increasing', () => {
    const generator = createUuidV7Generator({ now: () => 1_000, fillRandom: randomOf(0x00) });

    const burst = Array.from({ length: 5_000 }, () => generator.next());

    expect([...burst].sort()).toEqual(burst);
    expect(new Set(burst).size).toBe(burst.length);
    expect(burst.at(-1)?.slice(0, 13)).not.toBe(burst[0]?.slice(0, 13));
  });

  it('keeps increasing when the clock goes back', () => {
    const times = [5_000, 4_000, 4_000];
    const generator = createUuidV7Generator({ now: () => times.shift() ?? 0, fillRandom: randomOf(0x00) });

    const burst = [generator.next(), generator.next(), generator.next()];

    expect([...burst].sort()).toEqual(burst);
  });
});
