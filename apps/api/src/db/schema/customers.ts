import {
  COUNTRIES,
  MAX_COMPANY_NAME_LENGTH,
  MAX_CONTACT_EMAIL_LENGTH,
  MAX_TAX_ID_INPUT_LENGTH,
  MIN_COMPANY_NAME_LENGTH,
  MIN_TAX_ID_INPUT_LENGTH,
  PLANS,
  TAX_ID_TYPES,
} from '@saas-o-matic/domain';
import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { isCanonicalUuid, isInteger, isOneOf } from './checks.js';

/**
 * The search key is the name after NFD, without marks and in lower case (ADR-006): its length can grow (a Hangul
 * syllable is up to three jamo) or shrink (combining marks go away), so it only has a generous upper bound (D-111).
 */
const MAX_SEARCH_KEY_LENGTH = 1000;

/** Customers (04-base-de-datos §2.1). Append-only: triggers reject UPDATE and DELETE (§2.4). */
export const customers = sqliteTable(
  'customers',
  {
    id: text('id').primaryKey(),
    companyName: text('company_name').notNull(),
    companyNameSearch: text('company_name_search').notNull(),
    taxId: text('tax_id').notNull(),
    taxIdType: text('tax_id_type', { enum: TAX_ID_TYPES }).notNull(),
    country: text('country', { enum: COUNTRIES }).notNull(),
    contactEmail: text('contact_email').notNull(),
    plan: text('plan', { enum: PLANS }).notNull(),
    /** Unix milliseconds, UTC. */
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    check('customers_id_ck', isCanonicalUuid(table.id)),
    check(
      'customers_company_name_ck',
      sql`length(${table.companyName}) BETWEEN ${sql.raw(String(MIN_COMPANY_NAME_LENGTH))} AND ${sql.raw(String(MAX_COMPANY_NAME_LENGTH))}`,
    ),
    check(
      'customers_company_name_search_ck',
      sql`length(${table.companyNameSearch}) <= ${sql.raw(String(MAX_SEARCH_KEY_LENGTH))}`,
    ),
    check(
      'customers_tax_id_ck',
      sql`length(${table.taxId}) BETWEEN ${sql.raw(String(MIN_TAX_ID_INPUT_LENGTH))} AND ${sql.raw(String(MAX_TAX_ID_INPUT_LENGTH))} AND ${table.taxId} NOT GLOB '*[^A-Z0-9]*'`,
    ),
    check('customers_tax_id_type_ck', isOneOf(table.taxIdType, TAX_ID_TYPES)),
    check('customers_country_ck', isOneOf(table.country, COUNTRIES)),
    check(
      'customers_contact_email_ck',
      sql`length(${table.contactEmail}) <= ${sql.raw(String(MAX_CONTACT_EMAIL_LENGTH))} AND ${table.contactEmail} = lower(${table.contactEmail})`,
    ),
    check('customers_plan_ck', isOneOf(table.plan, PLANS)),
    check('customers_created_at_ck', sql`${isInteger(table.createdAt)} AND ${table.createdAt} > 0`),
    uniqueIndex('customers_country_tax_id_uq').on(table.country, table.taxId),
    index('customers_name_search_idx').on(table.companyNameSearch, table.id),
  ],
);
