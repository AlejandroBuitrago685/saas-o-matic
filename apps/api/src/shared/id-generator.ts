import { randomFillSync } from 'node:crypto';

/** Source of new ids: use cases never generate them themselves (03-backend §2), so tests get deterministic ids. */
export interface IdGenerator {
  readonly next: () => string;
}

export interface UuidV7Sources {
  /** Milliseconds since the Unix epoch. */
  readonly now: () => number;
  /** Fills the buffer with cryptographically secure random bytes. */
  readonly fillRandom: (bytes: Uint8Array) => void;
}

/** `rand_a` is a 12-bit counter. */
const MAX_COUNTER = 0xfff;
/** A new millisecond starts the counter at random in its lower half: room for at least 2 048 more ids in it. */
const COUNTER_SEED_MASK = 0x7ff;
/** 8 bytes for `rand_b` (62 bits used) and 2 to seed the counter. */
const RANDOM_BYTES = 10;

function canonical(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** RFC 9562 §5.7: 48-bit timestamp, version 7, 12-bit `rand_a`, variant `10` and 62-bit `rand_b`. */
function layout(msecs: number, counter: number, random: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(16);
  let time = msecs;
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = time % 256;
    time = Math.floor(time / 256);
  }
  bytes[6] = 0x70 | (counter >> 8);
  bytes[7] = counter & 0xff;
  bytes[8] = 0x80 | ((random[0] ?? 0) & 0x3f);
  bytes.set(random.subarray(1, 8), 9);
  return bytes;
}

/**
 * UUID v7 with the method 1 of RFC 9562 §6.2 (D-115): `rand_a` is a counter, so ids created in the same millisecond
 * keep their order (the tie-break by `id` of 04-base-de-datos §3.5), and `rand_b` carries 62 new random bits in every
 * id, as RNF-SEC-04 asks. The `uuid` package spends 32 bits of the id on its counter and leaves 42 random bits in the
 * ids of the same millisecond. If the counter runs out, or the clock goes back, the id borrows the next millisecond.
 */
export function createUuidV7Generator({ now, fillRandom }: UuidV7Sources): IdGenerator {
  let msecs = -1;
  let counter = 0;
  const random = new Uint8Array(RANDOM_BYTES);
  return {
    next: () => {
      fillRandom(random);
      const time = now();
      if (time > msecs) {
        msecs = time;
        counter = (((random[8] ?? 0) << 8) | (random[9] ?? 0)) & COUNTER_SEED_MASK;
      } else if (counter < MAX_COUNTER) {
        counter += 1;
      } else {
        msecs += 1;
        counter = 0;
      }
      return canonical(layout(msecs, counter, random));
    },
  };
}

/** Ids are ordered in time but not sequential, so they do not reveal how many customers there are (D-41). */
export const uuidV7Generator: IdGenerator = createUuidV7Generator({
  now: Date.now,
  fillRandom: randomFillSync,
});
