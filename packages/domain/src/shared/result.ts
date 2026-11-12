/** Successful outcome of an operation that can fail for a business reason. */
export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

/** Expected (business) failure. Bugs are thrown, business failures are returned (ADR-009). */
export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

export type Result<T, E> = Ok<T> | Err<E>;

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}
