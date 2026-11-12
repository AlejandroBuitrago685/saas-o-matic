// Test vectors of 02-especificacion/05-frontend.md §3.4.1 (slider scale), copied as typed data with their ids.

export interface PositionVector {
  readonly id: string;
  readonly position: number;
  readonly users: number;
}

/** `aUsuarios(p)` in the spec: position → users. */
export const POSITION_TO_USERS_VECTORS: readonly PositionVector[] = [
  { id: 'TV-SL-01', position: 0, users: 1 },
  { id: 'TV-SL-02', position: 9, users: 10 },
  { id: 'TV-SL-03', position: 10, users: 11 },
  { id: 'TV-SL-04', position: 49, users: 50 },
  { id: 'TV-SL-05', position: 50, users: 51 },
  { id: 'TV-SL-06', position: 99, users: 100 },
  { id: 'TV-SL-07', position: 100, users: 110 },
  { id: 'TV-SL-08', position: 189, users: 1000 },
  { id: 'TV-SL-09', position: 190, users: 1100 },
  { id: 'TV-SL-10', position: 279, users: 10_000 },
];

/** `aPosición(n)` in the spec: users → closest position, the lower one on a tie. */
export const USERS_TO_POSITION_VECTORS: readonly PositionVector[] = [
  { id: 'TV-SL-11', users: 105, position: 99 }, // value 100; tie between 100 and 110
  { id: 'TV-SL-12', users: 106, position: 100 }, // value 110
  { id: 'TV-SL-13', users: 995, position: 188 }, // value 990; tie between 990 and 1 000
  { id: 'TV-SL-14', users: 1049, position: 189 }, // value 1 000
  { id: 'TV-SL-15', users: 1051, position: 190 }, // value 1 100
  { id: 'TV-SL-16', users: 9999, position: 279 }, // value 10 000
];
