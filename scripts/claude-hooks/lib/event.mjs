// @ts-check
/**
 * Helpers shared by the Claude Code hooks (03-arquitectura/09-calidad-y-automatizacion.md §5).
 * Contract: the hook receives the event as JSON on stdin; exit code 2 + stderr blocks the action
 * (PreToolUse), shows the problem to Claude right after an edit (PostToolUse) or keeps Claude working (Stop).
 */
import { isAbsolute, relative, resolve } from 'node:path';

/**
 * @typedef {{
 *   tool_name?: string,
 *   tool_input?: { file_path?: string, path?: string, notebook_path?: string, glob?: string, command?: string },
 *   stop_hook_active?: boolean,
 *   cwd?: string
 * }} HookEvent
 */

/** @returns {Promise<HookEvent>} */
export async function readEvent() {
  let raw = '';
  for await (const chunk of process.stdin) raw += String(chunk);
  return raw.trim() === '' ? {} : /** @type {HookEvent} */ (JSON.parse(raw));
}

/**
 * Repository-relative path with forward slashes, or undefined when the file is outside the repository.
 * @param {string | undefined} filePath
 * @param {string} repoRoot
 * @returns {string | undefined}
 */
export function toRepoPath(filePath, repoRoot) {
  if (filePath === undefined || filePath === '') return undefined;
  const absolute = isAbsolute(filePath) ? filePath : resolve(repoRoot, filePath);
  const fromRoot = relative(repoRoot, absolute).replaceAll('\\', '/');
  return fromRoot.startsWith('..') || isAbsolute(fromRoot) ? undefined : fromRoot;
}

/**
 * Ends the hook: 0 lets things through, 2 blocks or reports with the message on stderr.
 * @param {{ block: boolean, message?: string }} decision
 * @returns {never}
 */
export function finish(decision) {
  if (decision.block) {
    process.stderr.write(`${decision.message ?? 'Blocked by a project hook.'}\n`);
    process.exit(2);
  }
  process.exit(0);
}
