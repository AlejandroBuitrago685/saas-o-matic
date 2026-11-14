// @ts-check
/**
 * Fails if the repository contains patterns forbidden by the security rules:
 * - innerHTML / outerHTML / bypassSecurityTrust* in the web app, including templates, and in the scripts of the
 *   evaluator walkthrough (RNF-SEC-14, AC-56, D-183);
 * - arbitrary colour values in Tailwind classes (`bg-[#fff]`, `text-[rgb(0,0,0)]`): colours only come from the
 *   design tokens, whose contrast is tested (D-125, D-124);
 * - committed .env files other than .env.example (RNF-SEC-12, AC-55);
 * - invisible characters written literally in code or configuration (D-96): format characters such as zero-width
 *   spaces or bidirectional overrides ("Trojan Source"), line or paragraph separators and non-ASCII spaces. They
 *   cannot be seen in a review; tests build them with String.fromCodePoint instead.
 * Usage: node scripts/check-forbidden-patterns.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { listRepoFiles, listTrackedFiles, REPO_ROOT } from './lib/repo.mjs';

const WEB_SOURCE = /^apps\/web\/src\/.+\.(ts|html)$/;
/**
 * The walkthrough's own scripts. Not `domain/`, the compiled package copied there (D-184), nor the generated HTML,
 * which names these APIs in its text and is built by an escaping builder with its own tests (D-183).
 */
const WALKTHROUGH_SOURCE = /^docs\/recorrido\/(?!domain\/).+\.js$/;
const FORBIDDEN_IN_WEB = [
  { pattern: /\b(innerHTML|outerHTML)\b/, rule: 'innerHTML/outerHTML (RNF-SEC-14)' },
  { pattern: /bypassSecurityTrust/, rule: 'bypassSecurityTrust* (RNF-SEC-14)' },
  {
    pattern: /-\[(?:color:)?(?:#|rgba?\(|hsla?\(|oklch\(|oklab\(|lab\(|lch\(|color\()/i,
    rule: 'arbitrary colour value: use a design token (D-125)',
  },
];
const ENV_FILE = /^\.env(\..+)?$/;
const CODE_OR_CONFIG = /\.(ts|js|mjs|cjs|html|css|json|ya?ml)$/;
/**
 * Format (Cf), line and paragraph separators (Zl, Zp), default-ignorable code points (variation selectors, Hangul
 * fillers, U+034F…), every space separator (Zs) except U+0020 and every control (Cc) except tab and CR.
 */
const INVISIBLE = /[\p{Cf}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}]|[^\P{Zs}\x20]|[^\P{Cc}\t\r]/u;

/**
 * @param {readonly { path: string, content: string }[]} files
 * @returns {string[]} one line per line of code that contains an invisible character
 */
export function findInvisibleCharacters(files) {
  return files.flatMap(({ path, content }) =>
    content.split('\n').flatMap((line, index) => {
      const codePoint = INVISIBLE.exec(line)?.[0].codePointAt(0);
      if (codePoint === undefined) return [];
      const code = codePoint.toString(16).toUpperCase().padStart(4, '0');
      return [
        `${path}:${String(index + 1)}: invisible U+${code} (build it with String.fromCodePoint) (D-96)`,
      ];
    }),
  );
}

/**
 * @param {string} path repository-relative path
 * @returns {boolean} whether the browser-side rules (no HTML injection, no arbitrary colours) apply to the file
 */
export function isWebSource(path) {
  return WEB_SOURCE.test(path) || WALKTHROUGH_SOURCE.test(path);
}

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

/** @param {readonly string[]} paths */
const readAll = (paths) =>
  paths.map((path) => ({ path, content: readFileSync(join(REPO_ROOT, path), 'utf8') }));

function main() {
  const repoFiles = listRepoFiles().filter((path) => existsSync(join(REPO_ROOT, path)));
  const webFiles = readAll(repoFiles.filter(isWebSource));
  const envFiles = findCommittedEnvFiles(listTrackedFiles()).map(
    (path) => `${path}: committed .env file (RNF-SEC-12)`,
  );
  const invisible = findInvisibleCharacters(readAll(repoFiles.filter((path) => CODE_OR_CONFIG.test(path))));
  const violations = [...findForbiddenWebPatterns(webFiles), ...envFiles, ...invisible];
  if (violations.length > 0) {
    process.stderr.write(`Forbidden patterns found:\n${violations.map((v) => `  - ${v}`).join('\n')}\n`);
    process.exit(1);
  }
  process.stdout.write('check-forbidden-patterns: OK\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
