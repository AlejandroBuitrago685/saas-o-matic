import { defineConfig } from 'drizzle-kit';

// Migrations are generated with `drizzle-kit generate`, reviewed and committed; `drizzle-kit push` is forbidden
// (03-arquitectura/04-base-de-datos.md §7). The schema itself is written in P3.
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema/index.ts',
  out: './drizzle',
});
