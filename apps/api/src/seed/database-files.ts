import { rmSync } from 'node:fs';

const IN_MEMORY = ':memory:';
/** SQLite's companion files. They go first: a stale WAL left next to a new database could be replayed onto it. */
const COMPANIONS = ['-wal', '-shm', '-journal'] as const;
/** What Windows answers when another process (the API of `npm run dev`) still has the file open. */
const IN_USE = new Set(['EBUSY', 'EPERM']);

function isInUse(error: unknown): boolean {
  return (
    error instanceof Error && 'code' in error && typeof error.code === 'string' && IN_USE.has(error.code)
  );
}

/**
 * Deletes a SQLite database and its companion files, for `npm run db:reset` (D-138). Rows cannot be deleted instead:
 * the append-only triggers forbid it, so the reset recreates the file, as the demo does on every start (08-despliegue
 * §4). A missing file is fine; a file in use stops the reset with a message that says what to do.
 */
export function removeDatabaseFiles(path: string): void {
  if (path === IN_MEMORY) throw new Error('An in-memory database has no file to remove');
  for (const file of [...COMPANIONS.map((suffix) => `${path}${suffix}`), path]) {
    try {
      rmSync(file, { force: true });
    } catch (error) {
      if (!isInUse(error)) throw error;
      throw new Error(`${file} is in use: stop the API (npm run dev) and run the reset again`, {
        cause: error,
      });
    }
  }
}
