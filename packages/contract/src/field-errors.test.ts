import { describe, expect, it } from 'vitest';

import { fieldErrorsOf, pointerOf } from './field-errors.js';
import { SCHEMA_ERROR_CODES } from './problem.js';

describe('D-109 translation of schema issues to the contract codes (03-arquitectura/03-backend §4.2)', () => {
  const cases = [
    { issue: { code: 'invalid_type', path: ['name'] }, input: {}, expected: 'REQUIRED' },
    { issue: { code: 'invalid_type', path: ['name'] }, input: { name: null }, expected: 'REQUIRED' },
    { issue: { code: 'invalid_type', path: ['name'] }, input: { name: 7 }, expected: 'INVALID_TYPE' },
    { issue: { code: 'too_small', path: ['name'], origin: 'string' }, input: {}, expected: 'TOO_SHORT' },
    { issue: { code: 'too_big', path: ['name'], origin: 'string' }, input: {}, expected: 'TOO_LONG' },
    { issue: { code: 'too_small', path: ['n'], origin: 'number' }, input: {}, expected: 'OUT_OF_RANGE' },
    { issue: { code: 'too_big', path: ['n'], origin: 'bigint' }, input: {}, expected: 'OUT_OF_RANGE' },
    { issue: { code: 'invalid_format', path: ['email'] }, input: {}, expected: 'INVALID_FORMAT' },
    { issue: { code: 'invalid_value', path: ['plan'] }, input: {}, expected: 'INVALID_ENUM' },
    {
      issue: { code: 'custom', path: ['name'], params: { code: 'TOO_LONG' } },
      input: {},
      expected: 'TOO_LONG',
    },
    {
      issue: { code: 'custom', path: ['name'], params: { code: 'NOT_A_CODE' } },
      input: {},
      expected: 'INVALID_FORMAT',
    },
    { issue: { code: 'custom', path: ['name'] }, input: {}, expected: 'INVALID_FORMAT' },
    { issue: { code: 'constructor', path: ['x'] }, input: {}, expected: 'INVALID_FORMAT' },
    {
      issue: { code: 'unrecognized_keys', path: [], keys: ['isAdmin'] },
      input: {},
      expected: 'UNKNOWN_FIELD',
    },
  ];

  it.each(cases)('$issue.code → $expected', ({ issue, input, expected }) => {
    expect(fieldErrorsOf([issue], input, 'body').map((error) => error.code)).toEqual([expected]);
  });

  it('produces every schema code of the contract at least once', () => {
    expect([...new Set(cases.map((testCase) => testCase.expected))].sort()).toEqual(
      [...SCHEMA_ERROR_CODES].sort(),
    );
  });

  it('gives one UNKNOWN_FIELD per unknown key, below the object that has them', () => {
    const errors = fieldErrorsOf(
      [{ code: 'unrecognized_keys', path: ['pricing'], keys: ['a', 'b'] }],
      {},
      'body',
    );

    expect(errors).toEqual([
      { location: 'body', pointer: '/pricing/a', code: 'UNKNOWN_FIELD' },
      { location: 'body', pointer: '/pricing/b', code: 'UNKNOWN_FIELD' },
    ]);
  });

  it('keeps the location given by the caller (body, query or path)', () => {
    expect(fieldErrorsOf([{ code: 'invalid_format', path: ['id'] }], {}, 'path')).toEqual([
      { location: 'path', pointer: '/id', code: 'INVALID_FORMAT' },
    ]);
  });

  it('does not read inherited properties when it looks for the original value', () => {
    expect(fieldErrorsOf([{ code: 'invalid_type', path: ['toString'] }], {}, 'body')[0]?.code).toBe(
      'REQUIRED',
    );
  });
});

describe('D-109 JSON Pointer of the errors (RFC 6901)', () => {
  it('escapes ~ and / and joins nested paths', () => {
    expect(pointerOf(['a/b', 'c~d', 0])).toBe('/a~1b/c~0d/0');
    expect(pointerOf([])).toBe('');
  });
});
