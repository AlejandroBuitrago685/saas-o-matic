import { describe, expect, expectTypeOf, it } from 'vitest';

import { err, ok, type Result } from './result.js';

describe('D-62 Result: business failures are values, not exceptions', () => {
  it('ok() wraps a successful value', () => {
    const result = ok(14000);

    expect(result).toEqual({ ok: true, value: 14000 });
  });

  it('err() wraps a typed failure', () => {
    const result = err({ reason: 'INVALID_CHECK' as const });

    expect(result).toEqual({ ok: false, error: { reason: 'INVALID_CHECK' } });
  });

  it('narrows to the value or the error through the ok discriminant', () => {
    const parse = (input: string): Result<number, 'NOT_A_NUMBER'> =>
      Number.isInteger(Number(input)) ? ok(Number(input)) : err('NOT_A_NUMBER');

    const success = parse('15');
    const failure = parse('quince');

    if (success.ok) {
      expectTypeOf(success.value).toEqualTypeOf<number>();
      expect(success.value).toBe(15);
    } else {
      expect.unreachable('15 must parse');
    }

    if (!failure.ok) {
      expectTypeOf(failure.error).toEqualTypeOf<'NOT_A_NUMBER'>();
      expect(failure.error).toBe('NOT_A_NUMBER');
    } else {
      expect.unreachable('"quince" must not parse');
    }
  });
});
