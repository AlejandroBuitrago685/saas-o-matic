import { describe, expect, it } from 'vitest';

import { codesOf, errorsOf } from '../test/errors-of.js';
import { createCustomerRequestSchema, searchCustomersQuerySchema } from './customers.js';

const VALID = {
  companyName: '  Acme   Ibérica S.L. ',
  taxId: 'esb-1234567-4',
  country: 'ES',
  contactEmail: 'Compras@Acme-Iberica.example',
  plan: 'BUSINESS',
};
const without = (key: keyof typeof VALID): Record<string, string> =>
  Object.fromEntries(Object.entries(VALID).filter(([name]) => name !== key));

describe('D-109 schema errors of POST /customers, at the schema level (RF-01, RNF-SEC-01; integration in P4)', () => {
  it('accepts the example of 04-contrato-api §3.2 and normalizes the name and the email', () => {
    expect(createCustomerRequestSchema.parse(VALID)).toEqual({
      ...VALID,
      companyName: 'Acme Ibérica S.L.',
      contactEmail: 'compras@acme-iberica.example',
    });
  });

  it.each([
    ['without companyName', without('companyName'), '/companyName REQUIRED'],
    ['with country XX', { ...VALID, country: 'XX' }, '/country INVALID_ENUM'],
    ['with plan GOLD', { ...VALID, plan: 'GOLD' }, '/plan INVALID_ENUM'],
    ['with a malformed email', { ...VALID, contactEmail: 'not-an-email' }, '/contactEmail INVALID_FORMAT'],
    ['with a 1-character companyName', { ...VALID, companyName: ' A ' }, '/companyName TOO_SHORT'],
    [
      'with a control character in companyName',
      { ...VALID, companyName: 'Acme\tCorp' },
      '/companyName INVALID_FORMAT',
    ],
    [
      'with a 255-character email',
      { ...VALID, contactEmail: `${'a'.repeat(243)}@example.com` },
      '/contactEmail TOO_LONG',
    ],
  ])('rejects a body %s', (_case, body, expected) => {
    expect(codesOf(errorsOf(createCustomerRequestSchema, body))).toEqual([expected]);
  });

  it('TV-NO-12: a taxId of 33 characters is TOO_LONG (a schema error, 400)', () => {
    expect(codesOf(errorsOf(createCustomerRequestSchema, { ...VALID, taxId: 'A'.repeat(33) }))).toEqual([
      '/taxId TOO_LONG',
    ]);
  });

  it('reports every error of a combined body at once', () => {
    const body = { country: 'XX', plan: 'GOLD', contactEmail: 'x', companyName: 'A', taxId: 'A'.repeat(33) };

    expect(codesOf(errorsOf(createCustomerRequestSchema, body)).sort()).toEqual(
      [
        '/companyName TOO_SHORT',
        '/contactEmail INVALID_FORMAT',
        '/country INVALID_ENUM',
        '/plan INVALID_ENUM',
        '/taxId TOO_LONG',
      ].sort(),
    );
  });
});

describe('D-106 unknown fields in POST /customers are rejected, never ignored (RNF-SEC-01, RNF-SEC-03)', () => {
  it.each(['id', 'createdAt', 'isAdmin'])('rejects the extra field %s', (field) => {
    expect(codesOf(errorsOf(createCustomerRequestSchema, { ...VALID, [field]: 'x' }))).toEqual([
      `/${field} UNKNOWN_FIELD`,
    ]);
  });

  it('rejects __proto__ when it arrives as an own key, as JSON.parse creates it (D-106)', () => {
    const body: unknown = JSON.parse(`{"__proto__": {"polluted": true}, ${JSON.stringify(VALID).slice(1)}`);

    expect(codesOf(errorsOf(createCustomerRequestSchema, body))).toEqual(['/__proto__ UNKNOWN_FIELD']);
  });
});

describe('D-109 query of GET /customers (04-contrato-api §1.1, §3.3)', () => {
  it('trims q and applies the default page', () => {
    expect(searchCustomersQuerySchema.parse({ q: '  acme ' })).toEqual({ q: 'acme', limit: 20, offset: 0 });
  });

  it.each([
    [{ q: 'a'.repeat(101) }, '/q TOO_LONG'],
    [{ limit: '0' }, '/limit OUT_OF_RANGE'],
    [{ limit: '101' }, '/limit OUT_OF_RANGE'],
    [{ offset: '1000001' }, '/offset OUT_OF_RANGE'],
    [{ limit: 'abc' }, '/limit INVALID_TYPE'],
    [{ sort: 'name' }, '/sort UNKNOWN_FIELD'],
  ])('rejects %o', (query, expected) => {
    expect(codesOf(errorsOf(searchCustomersQuerySchema, query, 'query'))).toEqual([expected]);
  });
});
