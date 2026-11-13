// @ts-check
/**
 * Traceability check (03-arquitectura/07-tests.md §2): every acceptance criterion with an automatable level
 * (U, I, E, CI) and every test vector (TV-…) of the specification must be cited by at least one test.
 * Usage: node scripts/trace-tests.mjs [--strict]   (--strict exits 1 when something is missing; blocking from P10)
 * A criterion whose tests belong to a later part is declared in PENDING_CRITERIA with that part (D-161): it is
 * printed on every run, and it blocks again once it has a test, so the list is emptied when the part lands.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { listRepoFiles, REPO_ROOT } from './lib/repo.mjs';

const CRITERIA_FILE = 'ai-workspace/02-especificacion/07-criterios-aceptacion.md';
const VECTOR_FILES = [
  'ai-workspace/02-especificacion/02-reglas-negocio.md',
  'ai-workspace/02-especificacion/03-validacion-fiscal.md',
  'ai-workspace/02-especificacion/05-frontend.md',
];
const AC_HEADER = /^\*\*(AC-\d+) · [^*]+\*\* · Refs: [^\n]*?· Nivel: ([^·\n]+)/gm;
const TV_ROW = /^\| (TV-[A-Z]+-\d+) \|/gm;
const AUTOMATED_LEVELS = ['U', 'I', 'E', 'CI'];
/** @type {Readonly<Record<string, string>>} criterion → the part that brings its tests (D-161) */
export const PENDING_CRITERIA = { 'AC-61': 'P11' };
// Tests, test vectors and CI workflows (CI-level criteria are verified by named pipeline steps, e.g. AC-57).
const TEST_FILE = /(\.test\.ts$|\.spec\.ts$|(^|\/)test\/vectors\/.+\.ts$|^\.github\/workflows\/.+\.ya?ml$)/;

/**
 * @param {string} markdown content of 07-criterios-aceptacion.md
 * @returns {string[]} AC ids whose level includes an automated test level
 */
export function automatedCriteria(markdown) {
  return [...markdown.matchAll(AC_HEADER)]
    .filter(([, , level]) => (level ?? '').split('/').some((part) => AUTOMATED_LEVELS.includes(part.trim())))
    .map(([, id]) => id ?? '');
}

/**
 * @param {string} markdown
 * @returns {string[]} TV ids defined as table rows
 */
export function definedVectors(markdown) {
  return [...markdown.matchAll(TV_ROW)].map(([, id]) => id ?? '');
}

/**
 * @param {readonly string[]} required ids that must be cited
 * @param {string} testSources concatenated test sources
 * @returns {string[]} ids not cited anywhere
 */
export function missingIds(required, testSources) {
  return required.filter((id) => !new RegExp(`\\b${id}\\b`).test(testSources));
}

/**
 * What blocks the strict mode: the missing ids that are not declared pending, and the pending ids that are no longer
 * missing (their part landed, so the declaration must go).
 * @param {readonly string[]} missing ids not cited by any test
 * @param {Readonly<Record<string, string>>} pending criterion → part
 * @returns {{ gaps: string[], stale: string[] }}
 */
export function blockingProblems(missing, pending) {
  return {
    gaps: missing.filter((id) => !(id in pending)),
    stale: Object.keys(pending).filter((id) => !missing.includes(id)),
  };
}

/**
 * @param {string} path
 * @returns {string}
 */
function readRepoFile(path) {
  return readFileSync(join(REPO_ROOT, path), 'utf8');
}

/**
 * @param {number} total
 * @param {number} missing
 */
function coverage(total, missing) {
  return `${String(total - missing)}/${String(total)}`;
}

function main() {
  const strict = process.argv.includes('--strict');
  const criteria = automatedCriteria(readRepoFile(CRITERIA_FILE));
  const vectors = VECTOR_FILES.flatMap((file) => definedVectors(readRepoFile(file)));
  const tests = listRepoFiles()
    .filter((path) => TEST_FILE.test(path))
    .map(readRepoFile)
    .join('\n');
  const missingCriteria = missingIds(criteria, tests);
  const missingVectors = missingIds(vectors, tests);
  const pending = Object.entries(PENDING_CRITERIA).map(([id, part]) => `${id} (${part})`);
  process.stdout.write(
    `trace-tests: AC ${coverage(criteria.length, missingCriteria.length)} · TV ${coverage(vectors.length, missingVectors.length)}` +
      ` · pending by plan: ${pending.length === 0 ? 'none' : pending.join(', ')}\n`,
  );
  const { gaps, stale } = blockingProblems([...missingCriteria, ...missingVectors], PENDING_CRITERIA);
  if (gaps.length > 0) process.stderr.write(`Missing tests for: ${gaps.join(', ')}\n`);
  if (stale.length > 0) process.stderr.write(`Declared pending but already tested: ${stale.join(', ')}\n`);
  if (strict && gaps.length + stale.length > 0) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
