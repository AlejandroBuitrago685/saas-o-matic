import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * `npm run db:check` (CI): the committed migrations must match the Drizzle schema. It runs `drizzle-kit generate`
 * and fails if any file of `drizzle/` appears or changes; those files are left for review (04-base-de-datos §7).
 * It fails closed: drizzle-kit exits with 0 even when it cannot finish (an ambiguous rename needs an interactive
 * answer), so the check only passes when no file changed and drizzle-kit said there was nothing to migrate.
 */
const API_ROOT = fileURLToPath(new URL('..', import.meta.url));
const MIGRATIONS = join(API_ROOT, 'drizzle');
const NO_CHANGES = 'No schema changes';

function snapshot(): Map<string, string> {
  const files = readdirSync(MIGRATIONS, { recursive: true, withFileTypes: true }).filter((entry) =>
    entry.isFile(),
  );
  return new Map(
    files.map((entry) => {
      const path = join(entry.parentPath, entry.name);
      const hash = createHash('sha256').update(readFileSync(path)).digest('hex');
      return [relative(API_ROOT, path), hash];
    }),
  );
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const before = snapshot();
const generate = spawnSync('npx', ['drizzle-kit', 'generate'], {
  cwd: API_ROOT,
  encoding: 'utf8',
  shell: process.platform === 'win32',
});
const output = `${generate.stdout}${generate.stderr}`;
const after = snapshot();
const changed = [...after].filter(([path, hash]) => before.get(path) !== hash).map(([path]) => path);

if (changed.length > 0) {
  fail(
    `The schema and the committed migrations differ. Review and commit these files:\n${changed.join('\n')}`,
  );
}
if (generate.status !== 0 || !output.includes(NO_CHANGES)) {
  fail(`drizzle-kit did not confirm that the schema is unchanged:\n${output}`);
}
process.stdout.write('Migrations match the schema.\n');
