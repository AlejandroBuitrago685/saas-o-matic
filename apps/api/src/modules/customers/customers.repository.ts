import { and, asc, count, eq, or, sql, type SQL } from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';

import type { DatabaseClient } from '../../db/database.js';
import { containsPattern, LIKE_ESCAPE } from '../../db/like-pattern.js';
import { customers } from '../../db/schema/index.js';
import { ConflictError } from '../../shared/app-error.js';
import { toCustomer, toCustomerRow, toCustomerSummary } from './customers.mapper.js';
import type { Customer, CustomerRepository, NewCustomer, SearchTerms } from './customers.types.js';

const UNIQUE_VIOLATION = 'SQLITE_CONSTRAINT_UNIQUE';
/** The columns of `customers_country_tax_id_uq`, as SQLite names them in the message of the violation. */
const TAX_ID_COLUMNS = 'customers.country, customers.tax_id';

/** The columns of the listing: never the email (D-42) nor the search key. */
const SUMMARY_COLUMNS = {
  id: customers.id,
  companyName: customers.companyName,
  taxId: customers.taxId,
  taxIdType: customers.taxIdType,
  country: customers.country,
  plan: customers.plan,
  createdAt: customers.createdAt,
};

/** Only the unique index on (country, tax id) is a duplicate customer: any other violation is a bug (a 500). */
function isDuplicateTaxId(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    error.code === UNIQUE_VIOLATION &&
    error.message.includes(TAX_ID_COLUMNS)
  );
}

/** `column LIKE ? ESCAPE ?`, with the pattern and the escape bound as parameters (RNF-SEC-02). */
function contains(column: SQLiteColumn, term: string): SQL {
  return sql`${column} LIKE ${containsPattern(term)} ESCAPE ${LIKE_ESCAPE}`;
}

/** `name OR tax id` with the terms that are set (04-contrato-api §3.3); undefined lists every customer. */
function matching(terms: SearchTerms | undefined): SQL | undefined {
  if (terms === undefined) return undefined;
  return or(
    terms.name === null ? undefined : contains(customers.companyNameSearch, terms.name),
    terms.taxId === null ? undefined : contains(customers.taxId, terms.taxId),
  );
}

/**
 * Customers with Drizzle (04-base-de-datos §2.1). There is no «check, then insert»: the unique index is the single
 * judge, so two requests at once cannot both win, and its violation becomes the 409 of the contract (D-17).
 */
export function createCustomersRepository(db: DatabaseClient): CustomerRepository {
  const existingId = ({ country, taxId }: NewCustomer): string | undefined =>
    db
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.country, country), eq(customers.taxId, taxId)))
      .get()?.id;

  return {
    insert: (customer) => {
      try {
        db.insert(customers).values(toCustomerRow(customer)).run();
      } catch (error) {
        const id = isDuplicateTaxId(error) ? existingId(customer) : undefined;
        if (id === undefined) throw error;
        throw new ConflictError(id);
      }
    },
    findById: (id): Customer | undefined => {
      const row = db.select().from(customers).where(eq(customers.id, id)).get();
      return row === undefined ? undefined : toCustomer(row);
    },
    // The order walks `customers_name_search_idx` (04-base-de-datos §3): the same key and the id as tie-break.
    list: ({ limit, offset }, terms) => {
      const where = matching(terms);
      const rows = db
        .select(SUMMARY_COLUMNS)
        .from(customers)
        .where(where)
        .orderBy(asc(customers.companyNameSearch), asc(customers.id))
        .limit(limit)
        .offset(offset)
        .all();
      const total = db.select({ total: count() }).from(customers).where(where).get()?.total ?? 0;
      return { items: rows.map(toCustomerSummary), total };
    },
  };
}
