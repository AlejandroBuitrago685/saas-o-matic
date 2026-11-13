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
