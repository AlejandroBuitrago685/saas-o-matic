import { sql } from 'drizzle-orm';
import { check, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { isInteger } from './checks.js';
import { simulations } from './simulations.js';

/**
 * Pricing lines of a simulation (04-base-de-datos §2.3): only tiers with users. «base_cents = sum of the subtotals»
 * spans several rows, so the use case guarantees it (one domain function, one transaction). Append-only (§2.4).
 */
export const simulationTiers = sqliteTable(
  'simulation_tiers',
  {
    simulationId: text('simulation_id')
      .notNull()
      .references(() => simulations.id, { onDelete: 'restrict', onUpdate: 'restrict' }),
    tier: integer('tier').notNull(),
    fromUser: integer('from_user').notNull(),
    /** NULL = the open last tier. */
    toUser: integer('to_user'),
    units: integer('units').notNull(),
    unitPriceCents: integer('unit_price_cents').notNull(),
    subtotalCents: integer('subtotal_cents').notNull(),
  },
  (table) => [
    primaryKey({ name: 'simulation_tiers_pk', columns: [table.simulationId, table.tier] }),
    check('simulation_tiers_tier_ck', sql`${isInteger(table.tier)} AND ${table.tier} >= 1`),
    check('simulation_tiers_from_user_ck', sql`${isInteger(table.fromUser)} AND ${table.fromUser} >= 1`),
    check(
      'simulation_tiers_to_user_ck',
      sql`${table.toUser} IS NULL OR (${isInteger(table.toUser)} AND ${table.toUser} >= ${table.fromUser})`,
    ),
    check('simulation_tiers_units_ck', sql`${isInteger(table.units)} AND ${table.units} > 0`),
    // D-98: prices are > 0 in this delivery.
    check(
      'simulation_tiers_unit_price_cents_ck',
      sql`${isInteger(table.unitPriceCents)} AND ${table.unitPriceCents} > 0`,
    ),
    check(
      'simulation_tiers_subtotal_cents_ck',
      sql`${table.subtotalCents} = ${table.units} * ${table.unitPriceCents}`,
    ),
  ],
);
