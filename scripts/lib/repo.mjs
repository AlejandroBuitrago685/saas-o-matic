// @ts-check
import { spawn, spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Absolute path of the repository root (scripts/lib/ → ../..). */
export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Runs git in the repository and returns stdout lines (empty lines removed).
 * @param {string[]} args
 * @returns {string[]}
 */
export function gitLines(args) {
  const result = spawnSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  }
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

/** Tracked files plus untracked files that are not ignored (so new files are checked before commit). */
export function listRepoFiles() {
  return gitLines(['ls-files', '--cached', '--others', '--exclude-standard']);
}

/** Files committed to git (used for checks about what would be published). */
export function listTrackedFiles() {
  return gitLines(['ls-files', '--cached']);
}

/**
 * Runs a command asynchronously (so several can run in parallel) and resolves with its result.
 * @param {string} command
 * @param {string[]} args
 * @returns {Promise<{ code: number, output: string, ms: number }>}
 */
export function runAsync(command, args) {
  const started = Date.now();
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, { cwd: REPO_ROOT, shell: process.platform === 'win32' });
    let output = '';
    child.stdout.on('data', (chunk) => (output += String(chunk)));
    child.stderr.on('data', (chunk) => (output += String(chunk)));
    child.on('close', (code) => {
      resolvePromise({ code: code ?? 1, output, ms: Date.now() - started });
    });
  });
}

/**
 * Runs a command synchronously and returns its exit code, combined output and duration.
 * @param {string} command
 * @param {string[]} args
 * @returns {{ code: number, output: string, ms: number }}
 */
export function run(command, args) {
  const started = Date.now();
  const result = spawnSync(command, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  return { code: result.status ?? 1, output: `${result.stdout}${result.stderr}`, ms: Date.now() - started };
}
