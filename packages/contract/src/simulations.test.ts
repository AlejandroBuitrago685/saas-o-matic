import { describe, expect, it } from 'vitest';

import { codesOf, errorsOf } from '../test/errors-of.js';
import { createSimulationRequestSchema } from './simulations.js';

const VALID = {
  customerId: '01a1cf33-2d00-7a3e-9c41-5b7d2e8f1a60',
  activeUsers: 15,
  storageGb: 250,
  apiCallsPerMonth: 1_200_000,
};

describe('TV-PR-10…15 invalid numbers of users in POST /simulations are schema errors (400, D-93)', () => {
  it.each([
    ['TV-PR-10', 0, '/activeUsers OUT_OF_RANGE'],
    ['TV-PR-11', 10_001, '/activeUsers OUT_OF_RANGE'],
    ['TV-PR-12', -1, '/activeUsers OUT_OF_RANGE'],
    ['TV-PR-13', 10.5, '/activeUsers INVALID_TYPE'],
    ['TV-PR-14', '15', '/activeUsers INVALID_TYPE'],
    ['TV-PR-15', null, '/activeUsers REQUIRED'],
  ])('%s: activeUsers = %o → %s', (_id, activeUsers, expected) => {
    expect(codesOf(errorsOf(createSimulationRequestSchema, { ...VALID, activeUsers }))).toEqual([expected]);
  });

  it('TV-PR-15: an absent activeUsers is REQUIRED too', () => {
    const { customerId, storageGb, apiCallsPerMonth } = VALID;

    expect(
      codesOf(errorsOf(createSimulationRequestSchema, { customerId, storageGb, apiCallsPerMonth })),
    ).toEqual(['/activeUsers REQUIRED']);
  });

  it('accepts 15 and 15.0, which are the same JSON number', () => {
    expect(
      createSimulationRequestSchema.safeParse(
        JSON.parse(
          '{"customerId":"01a1cf33-2d00-7a3e-9c41-5b7d2e8f1a60","activeUsers":15.0,"storageGb":0,"apiCallsPerMonth":0}',
        ) as unknown,
      ).success,
    ).toBe(true);
  });
});

describe('D-43 a computed amount sent by the client is an unknown field (RNF-SEC-03)', () => {
  it.each(['baseCents', 'totalCents', 'pricing'])('rejects %s', (field) => {
    expect(codesOf(errorsOf(createSimulationRequestSchema, { ...VALID, [field]: 0 }))).toEqual([
      `/${field} UNKNOWN_FIELD`,
    ]);
  });

  it('rejects a customerId that is not a UUID as INVALID_FORMAT', () => {
    expect(codesOf(errorsOf(createSimulationRequestSchema, { ...VALID, customerId: '42' }))).toEqual([
      '/customerId INVALID_FORMAT',
    ]);
  });
});
