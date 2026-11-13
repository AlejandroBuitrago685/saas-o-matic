import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { openDatabase, type Database } from '../../db/database.js';
import { ConflictError } from '../../shared/app-error.js';
import { createCustomersRepository } from './customers.repository.js';
import type { CustomerRepository, NewCustomer } from './customers.types.js';

const FIRST_ID = '019a7a3c-0000-7000-8000-000000000001';
const SECOND_ID = '019a7a3c-0000-7000-8000-000000000002';

const customer = (overrides: Partial<NewCustomer> = {}): NewCustomer => ({
  id: FIRST_ID,
  companyName: 'Acme Ibérica S.L.',
  companyNameSearch: 'acme iberica s.l.',
  taxId: 'B12345674',
  taxIdType: 'CIF',
  country: 'ES',
  contactEmail: 'compras@acme-iberica.example',
  plan: 'BUSINESS',
  createdAt: new Date('2026-11-12T10:00:00.000Z'),
  ...overrides,
});

let database: Database;
let repository: CustomerRepository;

beforeEach(() => {
  database = openDatabase(':memory:');
  repository = createCustomersRepository(database.db);
});

afterEach(() => {
  database.close();
});

describe('customers repository (D-17, RF-01)', () => {
  it('stores a customer and reads it back with the same instant', () => {
    repository.insert(customer());

    expect(repository.findById(FIRST_ID)).toEqual({
      id: FIRST_ID,
      companyName: 'Acme Ibérica S.L.',
      taxId: 'B12345674',
      taxIdType: 'CIF',
      country: 'ES',
      contactEmail: 'compras@acme-iberica.example',
      plan: 'BUSINESS',
      createdAt: new Date('2026-11-12T10:00:00.000Z'),
    });
  });

  it('an id that does not exist is undefined', () => {
    expect(repository.findById(SECOND_ID)).toBeUndefined();
  });

  it('the unique index on country and tax id becomes a ConflictError with the existing id', () => {
    repository.insert(customer());

    expect(() => {
      repository.insert(customer({ id: SECOND_ID }));
    }).toThrow(new ConflictError(FIRST_ID));
  });

  it('the same tax id in another country is not a duplicate', () => {
    repository.insert(customer());

    expect(() => {
      repository.insert(customer({ id: SECOND_ID, country: 'PT' }));
    }).not.toThrow();
  });

  it('any other violation is not a conflict: a repeated id stays an error of the data layer', () => {
    repository.insert(customer());

    let thrown: unknown;
    try {
      repository.insert(customer({ taxId: 'B99999999' }));
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown).not.toBeInstanceOf(ConflictError);
  });
});

const THIRD_ID = '019a7a3c-0000-7000-8000-000000000003';
const FOURTH_ID = '019a7a3c-0000-7000-8000-000000000004';

describe('AC-28 customers repository listing (04-base-de-datos §3)', () => {
  beforeEach(() => {
    repository.insert(
      customer({
        id: THIRD_ID,
        companyName: 'Zeta S.A.',
        companyNameSearch: 'zeta s.a.',
        taxId: 'J0000000J',
      }),
    );
    repository.insert(
      customer({
        id: SECOND_ID,
        companyName: 'Ñandú S.L.',
        companyNameSearch: 'nandu s.l.',
        taxId: 'W1234567D',
      }),
    );
    repository.insert(
      customer({
        id: FOURTH_ID,
        companyName: 'Acme S.L.',
        companyNameSearch: 'acme s.l.',
        taxId: 'C12345674',
      }),
    );
    repository.insert(customer({ id: FIRST_ID, companyName: 'ACME S.L.', companyNameSearch: 'acme s.l.' }));
  });

  const ids = (terms?: Parameters<CustomerRepository['list']>[1]) =>
    repository.list({ limit: 10, offset: 0 }, terms).items.map(({ id }) => id);

  it('orders by the search key (Ñ with the N) and, at the same key, by id', () => {
    expect(ids()).toEqual([FIRST_ID, FOURTH_ID, SECOND_ID, THIRD_ID]);
  });

  it('pages with limit and offset, and the total counts every match', () => {
    const page = repository.list({ limit: 2, offset: 1 });

    expect(page.items.map(({ id }) => id)).toEqual([FOURTH_ID, SECOND_ID]);
    expect(page.total).toBe(4);
  });

  it('matches the name term OR the tax id term', () => {
    expect(ids({ name: 'zeta', taxId: 'W123' })).toEqual([SECOND_ID, THIRD_ID]);
  });

  it('a null term does not filter by its field (D-136)', () => {
    expect(ids({ name: null, taxId: 'C1234' })).toEqual([FOURTH_ID]);
    expect(ids({ name: 'nandu', taxId: null })).toEqual([SECOND_ID]);
  });

  it('AC-33 the items carry no email', () => {
    for (const item of repository.list({ limit: 10, offset: 0 }).items) {
      expect(item).not.toHaveProperty('contactEmail');
      expect(item).not.toHaveProperty('companyNameSearch');
    }
  });
});
