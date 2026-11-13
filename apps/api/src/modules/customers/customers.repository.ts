import { and, eq } from 'drizzle-orm';

import type { DatabaseClient } from '../../db/database.js';
import { customers } from '../../db/schema/index.js';
import { ConflictError } from '../../shared/app-error.js';
import { toCustomer, toCustomerRow } from './customers.mapper.js';
import type { Customer, CustomerRepository, NewCustomer } from './customers.types.js';

const UNIQUE_VIOLATION = 'SQLITE_CONSTRAINT_UNIQUE';
/** The columns of `customers_country_tax_id_uq`, as SQLite names them in the message of the violation. */
const TAX_ID_COLUMNS = 'customers.country, customers.tax_id';

/** Only the unique index on (country, tax id) is a duplicate customer: any other violation is a bug (a 500). */
function isDuplicateTaxId(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    error.code === UNIQUE_VIOLATION &&
    error.message.includes(TAX_ID_COLUMNS)
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
  };
}
