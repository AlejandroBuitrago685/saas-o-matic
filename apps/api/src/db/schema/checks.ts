import { sql, type SQL } from 'drizzle-orm';
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core';

// Helpers for the CHECK constraints of 04-base-de-datos §2. The values come from domain constants (trusted code,
// never user input), so they are written as SQL literals: a CHECK cannot have bound parameters.

const literal = (value: string): string => `'${value.replaceAll("'", "''")}'`;

/** `column IN ('A', 'B', …)` from a closed list of the domain (§6). */
export function isOneOf(column: AnySQLiteColumn, values: readonly string[]): SQL {
  return sql`${column} IN (${sql.raw(values.map(literal).join(', '))})`;
}

/** `typeof(column) = 'integer'`: replaces STRICT tables, which Drizzle cannot declare (ADR-007). */
export function isInteger(column: AnySQLiteColumn): SQL {
  return sql`typeof(${column}) = 'integer'`;
}

/** An integer column between two bounds of the domain. */
export function isIntegerBetween(column: AnySQLiteColumn, min: number, max: number): SQL {
  return sql`${isInteger(column)} AND ${column} BETWEEN ${sql.raw(String(min))} AND ${sql.raw(String(max))}`;
}

/** UUID in canonical lower case (ADR-007). */
export function isCanonicalUuid(column: AnySQLiteColumn): SQL {
  return sql`length(${column}) = 36 AND ${column} = lower(${column})`;
}
