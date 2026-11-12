// @ts-check
/**
 * PostToolUse hook (Edit/Write): lints **only the edited file** so Claude sees problems right away (D-80).
 * No typecheck and no tests here, to keep every edit fast; those run in the Stop hook (verify:changed).
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { REPO_ROOT, run } from '../lib/repo.mjs';
import { finish, readEvent, toRepoPath } from './lib/event.mjs';

const LINTABLE = /\.(ts|js|mjs|cjs|html)$/;
const SKIPPED = /(^|\/)(node_modules|dist|coverage|\.angular)\//;
const ESLINT_BIN = 'node_modules/eslint/bin/eslint.js';

/**
 * @param {string | undefined} repoPath
 * @returns {boolean}
 */
export function shouldLint(repoPath) {
  return repoPath !== undefined && LINTABLE.test(repoPath) && !SKIPPED.test(repoPath);
}

async function main() {
  const event = await readEvent();
  const repoPath = toRepoPath(event.tool_input?.file_path, REPO_ROOT);
  if (repoPath === undefined || !shouldLint(repoPath) || !existsSync(join(REPO_ROOT, repoPath))) {
    finish({ block: false });
  }
  const result = run('node', [
    ESLINT_BIN,
    '--max-warnings=0',
    '--no-warn-ignored',
    '--format',
    'stylish',
    repoPath,
  ]);
  finish({
    block: result.code !== 0,
    message: `ESLint found problems in ${repoPath} (${String(result.ms)} ms):\n${result.output.trim().split('\n').slice(0, 30).join('\n')}`,
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
