import { describe, expect, it } from 'vitest';

import { parseIntegerField } from './integer-field';

const USERS = { min: 1, max: 10000 };

describe('AC-77 numeric fields of the simulator (spec 05 §3.4)', () => {
  it.each([
    ['1', 1],
    ['37', 37],
    ['10000', 10000],
    [' 15 ', 15],
    ['0015', 15],
  ])('accepts %j as %d', (text, value) => {
    expect(parseIntegerField(text, USERS)).toEqual({ ok: true, value });
  });

  it.each([
    ['', 'REQUIRED'],
    ['   ', 'REQUIRED'],
    ['0', 'OUT_OF_RANGE'],
    ['10001', 'OUT_OF_RANGE'],
    ['99999999999999999999', 'OUT_OF_RANGE'],
    ['15.5', 'INVALID_TYPE'],
    ['15,0', 'INVALID_TYPE'],
    ['-3', 'INVALID_TYPE'],
    ['1e3', 'INVALID_TYPE'],
    ['1.000', 'INVALID_TYPE'],
    ['abc', 'INVALID_TYPE'],
  ])('rejects %j with %s', (text, error) => {
    expect(parseIntegerField(text, USERS)).toEqual({ ok: false, error });
  });

  it('accepts 0 where the range starts at 0 (storage, API calls)', () => {
    expect(parseIntegerField('0', { min: 0, max: 100000 })).toEqual({ ok: true, value: 0 });
  });
});
