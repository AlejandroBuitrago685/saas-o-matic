// @ts-check
/**
 * Fails if the repository contains patterns forbidden by the security rules:
 * - innerHTML / outerHTML / bypassSecurityTrust* in the web app, including templates (RNF-SEC-14, AC-56);
 * - committed .env files other than .env.example (RNF-SEC-12, AC-55).
 * Usage: node scripts/check-forbidden-patterns.mjs
 */
import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { listRepoFiles, listTrackedFiles, REPO_ROOT } from './lib/repo.mjs';

const WEB_SOURCE = /^apps\/web\/src\/.+\.(ts|html)$/;
const FORBIDDEN_IN_WEB = [
  { pattern: /\b(innerHTML|outerHTML)\b/, rule: 'innerHTML/outerHTML (RNF-SEC-14)' },
  { pattern: /bypassSecurityTrust/, rule: 'bypassSecurityTrust* (RNF-SEC-14)' },
];
const ENV_FILE = /^\.env(\..+)?$/;

/**
 * @param {readonly { path: string, content: string }[]} webFiles
 * @returns {string[]} one line per violation
 */
export function findForbiddenWebPatterns(webFiles) {
  return webFiles.flatMap(({ path, content }) =>
    FORBIDDEN_IN_WEB.filter(({ pattern }) => pattern.test(content)).map(({ rule }) => `${path}: ${rule}`),
  );
}

/**
 * @param {readonly string[]} trackedPaths
 * @returns {string[]} committed environment files that are not the example
 */
export function findCommittedEnvFiles(trackedPaths) {
  return trackedPaths.filter((path) => {
    const name = basename(path);
    return ENV_FILE.test(name) && name !== '.env.example';
  });
}

function main() {
  const webFiles = listRepoFiles()
    .filter((path) => WEB_SOURCE.test(path))
    .map((path) => ({ path, content: readFileSync(join(REPO_ROOT, path), 'utf8') }));
  const envFiles = findCommittedEnvFiles(listTrackedFiles()).map(
    (path) => `${path}: committed .env file (RNF-SEC-12)`,
  );
  const violations = [...findForbiddenWebPatterns(webFiles), ...envFiles];
  if (violations.length > 0) {
    process.stderr.write(`Forbidden patterns found:\n${violations.map((v) => `  - ${v}`).join('\n')}\n`);
    process.exit(1);
  }
  process.stdout.write('check-forbidden-patterns: OK\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
