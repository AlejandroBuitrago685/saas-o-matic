import {
  COUNTRIES,
  MAX_ACTIVE_USERS,
  MAX_API_CALLS_PER_MONTH,
  MAX_STORAGE_GB,
  MAX_TAX_RATE_BPS,
  MIN_ACTIVE_USERS,
  MIN_API_CALLS_PER_MONTH,
  MIN_STORAGE_GB,
  MIN_TAX_RATE_BPS,
} from '@saas-o-matic/domain';
import { desc, sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { isCanonicalUuid, isInteger, isIntegerBetween, isOneOf } from './checks.js';
import { customers } from './customers.js';

/** Simulations with their pricing snapshot (04-base-de-datos §2.2, D-18). Append-only (§2.4). */
export const simulations = sqliteTable(
  'simulations',
  {
    id: text('id').primaryKey(),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict', onUpdate: 'restrict' }),
    activeUsers: integer('active_users').notNull(),
    storageGb: integer('storage_gb').notNull(),
    apiCallsPerMonth: integer('api_calls_per_month').notNull(),
    currency: text('currency').notNull(),
    tariffCode: text('tariff_code').notNull(),
    baseCents: integer('base_cents').notNull(),
    taxCountry: text('tax_country', { enum: COUNTRIES }).notNull(),
    taxRateBps: integer('tax_rate_bps').notNull(),
    taxCents: integer('tax_cents').notNull(),
    totalCents: integer('total_cents').notNull(),
    /** Unix milliseconds, UTC. */
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    check('simulations_id_ck', isCanonicalUuid(table.id)),
    check(
      'simulations_active_users_ck',
      isIntegerBetween(table.activeUsers, MIN_ACTIVE_USERS, MAX_ACTIVE_USERS),
    ),
    check('simulations_storage_gb_ck', isIntegerBetween(table.storageGb, MIN_STORAGE_GB, MAX_STORAGE_GB)),
    check(
      'simulations_api_calls_per_month_ck',
      isIntegerBetween(table.apiCallsPerMonth, MIN_API_CALLS_PER_MONTH, MAX_API_CALLS_PER_MONTH),
    ),
    check('simulations_currency_ck', sql`${table.currency} = 'EUR'`),
    check('simulations_tariff_code_ck', sql`length(${table.tariffCode}) BETWEEN 1 AND 50`),
    check('simulations_base_cents_ck', sql`${isInteger(table.baseCents)} AND ${table.baseCents} >= 0`),
    check('simulations_tax_country_ck', isOneOf(table.taxCountry, COUNTRIES)),
    check(
      'simulations_tax_rate_bps_ck',
      isIntegerBetween(table.taxRateBps, MIN_TAX_RATE_BPS, MAX_TAX_RATE_BPS),
    ),
    check('simulations_tax_cents_ck', sql`${isInteger(table.taxCents)} AND ${table.taxCents} >= 0`),
    check('simulations_total_cents_ck', sql`${table.totalCents} = ${table.baseCents} + ${table.taxCents}`),
    check('simulations_created_at_ck', sql`${isInteger(table.createdAt)} AND ${table.createdAt} > 0`),
    index('simulations_customer_created_idx').on(table.customerId, desc(table.createdAt), desc(table.id)),
  ],
);
