// @ts-check
/**
 * PreToolUse hook: blocks actions the project forbids before they happen (09-calidad §5, D-80).
 * - Read/Grep/Edit/Write of .env files other than .env.example, in any case (second barrier after `deny`).
 * - Edit/Write of a **committed** migration or migration metadata in apps/api/drizzle/ (new ones are allowed).
 * - Shell commands: see lib/command-rules.mjs.
 * It protects against mistakes, not against an agent determined to bypass it.
 */
import { spawnSync } from 'node:child_process';
import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';

import { REPO_ROOT } from '../lib/repo.mjs';
import { forbiddenCommandReason, mentionsEnvFile } from './lib/command-rules.mjs';
import { finish, readEvent, toRepoPath } from './lib/event.mjs';

const FILE_TOOLS = new Set(['Read', 'Grep', 'Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const WRITE_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);
const MIGRATION = /^apps\/api\/drizzle\/(meta\/)?[^/]+\.(sql|json)$/;
const ENV_NAME = /^\.env(\..+)?$/i;

/** @param {string} value a path or glob from the tool input */
function isEnvTarget(value) {
  const name = basename(value.replaceAll('\\', '/'));
  const isEnvName = ENV_NAME.test(name) && name.toLowerCase() !== '.env.example';
  return isEnvName || mentionsEnvFile(value);
}

/**
 * @param {import('./lib/event.mjs').HookEvent} event
 * @param {(repoPath: string) => boolean} isCommitted
 * @returns {{ block: boolean, message?: string }}
 */
export function decidePreTool(event, isCommitted) {
  const tool = event.tool_name ?? '';
  if (FILE_TOOLS.has(tool)) return decideFileTool(tool, event.tool_input ?? {}, isCommitted);
  if (SHELL_TOOLS.has(tool)) {
    const reason = forbiddenCommandReason(event.tool_input?.command ?? '');
    return reason === undefined ? { block: false } : { block: true, message: `Blocked: ${reason}` };
  }
  return { block: false };
}

/**
 * @param {string} tool
 * @param {NonNullable<import('./lib/event.mjs').HookEvent['tool_input']>} input
 * @param {(repoPath: string) => boolean} isCommitted
 */
function decideFileTool(tool, input, isCommitted) {
  const targets = [input.file_path, input.path, input.notebook_path, input.glob].filter(
    /** @returns {value is string} */ (value) => typeof value === 'string' && value !== '',
  );
  if (targets.some(isEnvTarget)) {
    return { block: true, message: `${tool}: .env files must not be read or edited (RNF-SEC-12).` };
  }
  const repoPath = toRepoPath(input.file_path ?? input.notebook_path, REPO_ROOT);
  if (WRITE_TOOLS.has(tool) && repoPath !== undefined && MIGRATION.test(repoPath) && isCommitted(repoPath)) {
    return {
      block: true,
      message: `${repoPath}: committed migrations are immutable; create a new one instead.`,
    };
  }
  return { block: false };
}

/** @param {string} repoPath */
function isCommittedInGit(repoPath) {
  return spawnSync('git', ['ls-files', '--error-unmatch', repoPath], { cwd: REPO_ROOT }).status === 0;
}

async function main() {
  finish(decidePreTool(await readEvent(), isCommittedInGit));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
