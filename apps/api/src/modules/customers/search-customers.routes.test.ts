import { customerPageSchema, type CustomerPage } from '@saas-o-matic/contract';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createCustomer } from '../../../test/api-helpers.js';
import { buildApiTestApp, type TestApp } from '../../../test/build-test-app.js';
import { expectBody, expectProblem } from '../../../test/expect-response.js';

// Built from its code point: a combining accent on its own cannot be seen in a review (D-96).
const COMBINING_ACUTE = String.fromCodePoint(0x0301);

let testApp: TestApp;

/** The customers of AC-29 to AC-31, plus one whose name has a hyphen (D-136). */
beforeAll(async () => {
  testApp = await buildApiTestApp();
  await createCustomer(testApp, { companyName: 'Telefonía Ñandú S.A.', taxId: '12345678Z' });
  await createCustomer(testApp, { companyName: 'Acme S.L.', taxId: 'B12345674' });
  await createCustomer(testApp, { companyName: '100% Digital S.L.', taxId: 'W1234567D' });
  await createCustomer(testApp, { companyName: 'Coca-Lola Ibérica S.A.', taxId: 'X1234567L' });
});

afterAll(async () => {
  await testApp.close();
});

const list = (query: Record<string, string> = {}) =>
  testApp.app.inject({ method: 'GET', url: '/customers', query });

async function search(q: string): Promise<CustomerPage> {
  return expectBody(await list({ q }), 200, customerPageSchema);
}

const names = (page: CustomerPage): string[] => page.items.map(({ companyName }) => companyName);

describe('AC-29 GET /customers ignores case and accents', () => {
  it.each(['telefonia', 'ÑANDÚ', 'fonía'])('«%s» finds «Telefonía Ñandú S.A.»', async (q) => {
    expect(names(await search(q))).toEqual(['Telefonía Ñandú S.A.']);
  });
});

describe('AC-30 GET /customers finds a customer by its tax id', () => {
  it.each(['b-1234', '12345674', 'B12345674'])('«%s» finds the CIF B12345674', async (q) => {
    expect(names(await search(q))).toEqual(['Acme S.L.']);
  });
});

describe('AC-31 RNF-SEC-02 the wildcards of q are literal characters', () => {
  it.each(['%', '100%'])('«%s» only finds the customer whose name has a percent sign', async (q) => {
    const page = await search(q);

    expect(names(page)).toEqual(['100% Digital S.L.']);
    expect(page.page.total).toBe(1);
  });

  it('«_» finds nobody: no name or tax id has an underscore', async () => {
    const page = await search('_');

    expect(page.items).toEqual([]);
    expect(page.page.total).toBe(0);
  });

  it('«!», the escape character, is literal too', async () => {
    expect((await search('!')).page.total).toBe(0);
  });
});

describe('D-136 a term that normalizes to nothing does not filter by its field, and never returns all', () => {
  it('«-» is searched in the names only: the hyphen of the tax ids is a separator', async () => {
    expect(names(await search('-'))).toEqual(['Coca-Lola Ibérica S.A.']);
  });

  it('a lone combining accent leaves no term at all: no results', async () => {
    const page = await search(COMBINING_ACUTE);

    expect(page.items).toEqual([]);
    expect(page.page.total).toBe(0);
  });
});

describe('AC-32 RNF-SEC-09 limits of the pagination and of q', () => {
  it.each([
    [{ limit: '0' }, '/limit', 'OUT_OF_RANGE'],
    [{ limit: '101' }, '/limit', 'OUT_OF_RANGE'],
    [{ limit: 'abc' }, '/limit', 'INVALID_TYPE'],
    [{ offset: '-1' }, '/offset', 'OUT_OF_RANGE'],
    [{ q: 'a'.repeat(101) }, '/q', 'TOO_LONG'],
    [{ sort: 'name' }, '/sort', 'UNKNOWN_FIELD'],
  ] as const)('%o is 400 with the pointer %s', async (query, pointer, code) => {
    expectProblem(await list(query), 'VALIDATION_ERROR', [{ location: 'query', pointer, code }]);
  });

  it('q of exactly 100 characters is accepted', async () => {
    expect((await search('a'.repeat(100))).page.total).toBe(0);
  });

  it('the page echoes the limit and offset it applied', async () => {
    const page = expectBody(await list({ limit: '2', offset: '1' }), 200, customerPageSchema);

    expect(page.page).toEqual({ limit: 2, offset: 1, total: 4 });
    expect(page.items).toHaveLength(2);
  });
});

describe('AC-33 RNF-SEC-05 D-42 the listing has no email', () => {
  it('no item carries contactEmail, with or without q', async () => {
    const all = await list();
    const found = await list({ q: 'acme' });

    for (const response of [all, found]) {
      expect(response.statusCode).toBe(200);
      expect(response.body).not.toContain('contactEmail');
      expect(response.body).not.toContain('@');
    }
  });
});
