// @ts-check
/**
 * Stop hook: Claude cannot finish a task with red checks (CLAUDE.md "Definición de hecho", D-80).
 * Runs `verify:changed` (lint of changed files + typecheck and tests of affected workspaces; never a build).
 * If Claude is already continuing because of this hook (`stop_hook_active`), it does not block again.
 */
import { pathToFileURL } from 'node:url';

import { run } from '../lib/repo.mjs';
import { finish, readEvent } from './lib/event.mjs';

/**
 * @param {import('./lib/event.mjs').HookEvent} event
 * @returns {boolean} whether verification must run
 */
export function shouldVerify(event) {
  return event.stop_hook_active !== true;
}

async function main() {
  const event = await readEvent();
  if (!shouldVerify(event)) finish({ block: false });
  const result = run('node', ['scripts/verify-changed.mjs']);
  finish({
    block: result.code !== 0,
    message: `verify:changed failed (${String(result.ms)} ms). Fix it before finishing:\n${result.output.trim().split('\n').slice(-40).join('\n')}`,
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
