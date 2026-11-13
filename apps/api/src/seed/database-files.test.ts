import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { openDatabase } from '../db/database.js';
import { removeDatabaseFiles } from './database-files.js';

let folder: string;
let path: string;

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), 'saas-o-matic-reset-'));
  path = join(folder, 'dev.db');
});

afterEach(() => {
  rmSync(folder, { recursive: true, force: true });
});

describe('D-138 db:reset removes the database file and its companions', () => {
  it('deletes the database, its WAL, its shared memory and its journal', () => {
    const files = [path, `${path}-wal`, `${path}-shm`, `${path}-journal`];
    for (const file of files) writeFileSync(file, 'x');

    removeDatabaseFiles(path);

    expect(files.filter((file) => existsSync(file))).toEqual([]);
  });

  it('a database that does not exist yet is not an error', () => {
    expect(() => {
      removeDatabaseFiles(path);
    }).not.toThrow();
  });

  it('refuses an in-memory database', () => {
    expect(() => {
      removeDatabaseFiles(':memory:');
    }).toThrow('in-memory');
  });

  // Only Windows refuses to delete a file another process has open; Linux and macOS unlink it (documented in D-138).
  it.runIf(process.platform === 'win32')(
    'a database still open (the API running) stops the reset with what to do, and keeps the file',
    () => {
      const database = openDatabase(path);
      try {
        expect(() => {
          removeDatabaseFiles(path);
        }).toThrow('stop the API');
        expect(existsSync(path)).toBe(true);
      } finally {
        database.close();
      }
    },
  );
});
