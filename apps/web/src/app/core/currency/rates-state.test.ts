import { describe, expect, it } from 'vitest';

import { REFERENCE_UPDATED_AT } from '../testing/exchange-rates.fixture';
import {
  FRESH_FOR_MS,
  isRequesting,
  nextRatesState,
  type RatesSnapshot,
  type RatesState,
  USABLE_FOR_MS,
} from './rates-state';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/** Rates the provider updated at REFERENCE_UPDATED_AT and this browser fetched `fetchedAfter` ms later. */
function snapshot(fetchedAfter = 0): RatesSnapshot {
  return {
    rates: { updatedAt: REFERENCE_UPDATED_AT, rates: {} },
    fetchedAt: REFERENCE_UPDATED_AT + fetchedAfter,
  };
}

const at = (elapsed: number): number => REFERENCE_UPDATED_AT + elapsed;

describe('D-23 / D-51 start of the rates (spec 05 §4.2 and §4.4)', () => {
  it.each([
    {
      case: 'AC-82: rates fetched 30 min ago are current: no request',
      cached: snapshot(),
      elapsed: 30 * MINUTE,
      status: 'fresh',
    },
    {
      case: 'the last millisecond of the hour is still current',
      cached: snapshot(),
      elapsed: FRESH_FOR_MS - 1,
      status: 'fresh',
    },
    {
      case: 'AC-81: rates of more than 1 h are refreshed while in use',
      cached: snapshot(),
      elapsed: FRESH_FOR_MS,
      status: 'refreshing',
    },
    {
      case: 'AC-82: rates of 3 days cannot be used',
      cached: snapshot(),
      elapsed: 3 * 24 * HOUR,
      status: 'loading',
    },
    {
      case: 'AC-81: without cache, only EUR until the rates arrive',
      cached: undefined,
      elapsed: 0,
      status: 'loading',
    },
  ] as const)('$case', ({ cached, elapsed, status }) => {
    const state = nextRatesState(
      { status: 'loading' },
      { type: 'started', cached, isRateLimited: false },
      at(elapsed),
    );

    expect(state.status).toBe(status);
  });

  it.each([
    {
      case: 'usable saved rates stay in use, marked stale',
      cached: snapshot(),
      elapsed: 2 * HOUR,
      status: 'stale',
    },
    { case: 'without usable rates, error', cached: undefined, elapsed: 0, status: 'error' },
    { case: 'current rates need no request', cached: snapshot(), elapsed: 10 * MINUTE, status: 'fresh' },
  ] as const)('after a 429, no automatic attempt for 20 min: $case', ({ cached, elapsed, status }) => {
    const state = nextRatesState(
      { status: 'loading' },
      { type: 'started', cached, isRateLimited: true },
      at(elapsed),
    );

    expect(state.status).toBe(status);
    if (state.status === 'stale' || state.status === 'error') expect(state.failure).toBe('RATE_LIMITED');
  });
});

describe('D-51 transitions of the rates (spec 05 §4.4)', () => {
  const saved = snapshot();
  const states: Record<RatesState['status'], RatesState> = {
    loading: { status: 'loading' },
    fresh: { status: 'fresh', snapshot: saved },
    refreshing: { status: 'refreshing', snapshot: saved },
    stale: { status: 'stale', snapshot: saved, failure: 'HTTP' },
    error: { status: 'error', failure: 'NETWORK' },
  };

  it.each([
    ['loading', 'loading'],
    ['error', 'loading'],
    ['fresh', 'refreshing'],
    ['stale', 'refreshing'],
    ['refreshing', 'refreshing'],
  ] as const)('«Reintentar» from %s → %s (AC-80: «Cargando…» or «Actualizando…»)', (from, to) => {
    expect(nextRatesState(states[from], { type: 'requested' }, at(2 * HOUR)).status).toBe(to);
  });

  it('a request with saved rates older than 48 h shows «Cargando…»: they are no longer used', () => {
    expect(nextRatesState(states.stale, { type: 'requested' }, at(USABLE_FOR_MS)).status).toBe('loading');
  });

  it.each(['loading', 'refreshing', 'stale', 'error'] as const)('a success from %s → fresh', (from) => {
    const fetched = snapshot(5 * HOUR);

    expect(nextRatesState(states[from], { type: 'succeeded', snapshot: fetched }, at(5 * HOUR))).toEqual({
      status: 'fresh',
      snapshot: fetched,
    });
  });

  it.each([
    { case: 'AC-80: loading without rates', from: 'loading', elapsed: 0, expected: { status: 'error' } },
    {
      case: 'AC-82: refreshing, rates updated 20 h ago',
      from: 'refreshing',
      elapsed: 20 * HOUR,
      expected: { status: 'stale', snapshot: saved },
    },
    {
      case: 'the last millisecond of the 48 h',
      from: 'refreshing',
      elapsed: USABLE_FOR_MS - 1,
      expected: { status: 'stale', snapshot: saved },
    },
    {
      case: 'AC-82: refreshing, rates of 48 h',
      from: 'refreshing',
      elapsed: USABLE_FOR_MS,
      expected: { status: 'error' },
    },
  ] as const)('a failure from $case', ({ from, elapsed, expected }) => {
    expect(nextRatesState(states[from], { type: 'failed', failure: 'RATE_LIMITED' }, at(elapsed))).toEqual({
      ...expected,
      failure: 'RATE_LIMITED',
    });
  });

  it('only loading and refreshing have a request in flight', () => {
    expect(
      Object.values(states)
        .filter(isRequesting)
        .map((state) => state.status),
    ).toEqual(['loading', 'refreshing']);
  });
});
