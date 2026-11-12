import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ESLint } from 'eslint';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const eslint = new ESLint({ cwd: REPO_ROOT });

export interface LintFinding {
  readonly ruleId: string | null;
  readonly message: string;
}

/**
 * Writes a temporary file at a real location of the repository, runs `use` and then removes **only what it
 * created**: the file and, if they did not exist before, its directories. Existing folders and their
 * contents are never touched (regression found by the reviewer in P0: a test used to delete `features/`).
 * Temporary files are named `__lint_fixture__*` / `__cycle_fixture__*` and ignored by git.
 */
export async function withTemporaryFile<T>(
  relativePath: string,
  content: string,
  use: () => Promise<T>,
): Promise<T> {
  const absolutePath = join(REPO_ROOT, relativePath);
  const createdDirectory = mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content, 'utf8');
  try {
    return await use();
  } finally {
    rmSync(absolutePath, { force: true });
    if (createdDirectory !== undefined) {
      rmSync(createdDirectory, { recursive: true, force: true });
    }
  }
}

/**
 * Lints a temporary file placed at a real location, so path-based rules and the TypeScript project service
 * apply exactly as in production code.
 */
export async function lintFixture(relativePath: string, code: string): Promise<LintFinding[]> {
  return withTemporaryFile(relativePath, code, async () => {
    const [result] = await eslint.lintFiles([join(REPO_ROOT, relativePath)]);
    return (result?.messages ?? []).map(({ ruleId, message }) => ({ ruleId, message }));
  });
}

export function ruleIds(findings: readonly LintFinding[]): (string | null)[] {
  return findings.map((finding) => finding.ruleId);
}
