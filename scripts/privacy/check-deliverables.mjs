// @ts-check
/**
 * D-189: nothing that is delivered describes the private server of the demo. Every paragraph of the deliverables
 * (README, the evaluator guide, ai-workspace, the pages of docs/ and the files of deploy/) is checked against the
 * private file, which lives outside the repository:
 * - a term to cover (an alias, a provider, the name of another site) must not appear at all;
 * - a paragraph with an alert word must be in `reviewed.json`, by the hash of its text: read and found safe.
 * The mark of an omission says nothing, so it is ignored.
 *
 *     node scripts/privacy/check-deliverables.mjs --privado <file outside the repo> [--listar <file outside the repo>]
 *     node scripts/privacy/check-deliverables.mjs --privado <file> --aprobar-todo   # after reading the listing
 *
 * `--listar` writes every paragraph with an alert and no review, with its text, for reading it. `--aprobar-todo`
 * records as reviewed the paragraphs that are listed today; it is meant to follow that reading, never to replace it.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import { hashOf, paragraphsOf } from '../conversaciones/omissions.mjs';
import { alertsIn, isInside, readPrivateFile } from '../conversaciones/private-terms.mjs';
import { MARK, wholeWord } from '../conversaciones/redact.mjs';
import { listRepoFiles, REPO_ROOT } from '../lib/repo.mjs';

/**
 * @typedef {Record<string, string[]>} Reviewed
 * @typedef {{ file: string, hash: string, words: string[], text: string }} Finding
 */

export const REVIEWED_PATH = join(REPO_ROOT, 'scripts', 'privacy', 'reviewed.json');
const DELIVERABLE = /^(?:README\.md|GUIA-EVALUADOR\.md|ai-workspace\/.+\.md|docs\/.+\.html|deploy\/.+)$/;
/** The prose and the templates of the walkthrough that do not come from another deliverable: reviewed here. */
const WALKTHROUGH_CONTENT = /^scripts\/recorrido\/(?:content|render)\/.+\.mjs$/;
/**
 * The walkthrough is generated from the deliverables and from its own content, and changes with every figure it
 * reads: its paragraphs are checked for private terms, and their alerts are reviewed in those sources.
 */
const GENERATED = /^docs\/.+\.html$/;

/**
 * @param {string} path repository-relative path
 * @returns {boolean} whether the file is delivered, or ends up in a page that is, and must say nothing of the server
 */
export function isDeliverable(path) {
  return DELIVERABLE.test(path) || WALKTHROUGH_CONTENT.test(path);
}

/**
 * @param {{ file: string, text: string, terms: readonly string[], alerts: readonly string[] }} input
 * @returns {{ terms: Finding[], alerts: Finding[] }} the paragraphs with a private term, and those with an alert word
 */
export function scanText({ file, text, terms, alerts }) {
  /** @type {{ terms: Finding[], alerts: Finding[] }} */
  const found = { terms: [], alerts: [] };
  for (const paragraph of paragraphsOf(text.replace(/\r\n/g, '\n'))) {
    const visible = paragraph.split(MARK).join(' ');
    const hash = hashOf(paragraph);
    const termWords = terms.filter((term) => wholeWord(term).test(visible));
    if (termWords.length > 0) found.terms.push({ file, hash, words: termWords, text: paragraph });
    const alertWords = alertsIn(visible, alerts);
    if (alertWords.length > 0) found.alerts.push({ file, hash, words: alertWords, text: paragraph });
  }
  return found;
}

/**
 * Phrases that never belong in a deliverable, whatever the paragraph around them: they say that the server has
 * weaknesses or that it hosts other sites. They reveal nothing by themselves, so they live here and the CI checks
 * them too; a paragraph with one of them fails even if it was recorded as safe.
 */
export const FORBIDDEN_PHRASES = [
  'debilidades del servidor',
  'otros sitios',
  'otro sitio',
  'demás sitios',
  'resto de sitios',
  'otra de tus',
  'otras de tus',
  'tu snippet',
];

/**
 * @param {string} text
 * @returns {string[]} the forbidden phrases it contains, ignoring case and the mark
 */
export function forbiddenPhrasesIn(text) {
  const visible = text.split(MARK).join(' ').replace(/\s+/g, ' ').toLowerCase();
  return FORBIDDEN_PHRASES.filter((phrase) => visible.includes(phrase));
}

/** @returns {string[]} each deliverable with a forbidden phrase, as `<file>: <phrase>` */
export function findForbiddenPhrases() {
  return listRepoFiles()
    .filter(isDeliverable)
    .flatMap((file) =>
      forbiddenPhrasesIn(readFileSync(join(REPO_ROOT, file), 'utf8')).map((phrase) => `${file}: ${phrase}`),
    );
}

/**
 * @param {{ terms: readonly string[], alerts: readonly string[], reviewed: Reviewed }} config
 * @returns {{ terms: Finding[], unreviewed: Finding[], alerts: Finding[] }} what is wrong in the deliverables today
 */
export function checkDeliverables({ terms, alerts, reviewed }) {
  const files = listRepoFiles().filter(isDeliverable);
  const all = files.map((file) =>
    scanText({ file, text: readFileSync(join(REPO_ROOT, file), 'utf8'), terms, alerts }),
  );
  const alertsToReview = all.flatMap((one) => one.alerts).filter((finding) => !GENERATED.test(finding.file));
  const found = { terms: all.flatMap((one) => one.terms), alerts: alertsToReview };
  const isReviewed = (/** @type {Finding} */ finding) =>
    (reviewed[finding.file] ?? []).includes(finding.hash);
  return { ...found, unreviewed: found.alerts.filter((finding) => !isReviewed(finding)) };
}

/**
 * @param {Finding[]} alerts every paragraph with an alert word in the deliverables
 * @returns {Reviewed} all of them as reviewed, file by file and sorted, so that the registry diffs well
 */
export function reviewedFrom(alerts) {
  /** @type {Reviewed} */
  const reviewed = {};
  for (const { file, hash } of alerts)
    reviewed[file] = [...new Set([...(reviewed[file] ?? []), hash])].sort();
  return Object.fromEntries(Object.entries(reviewed).sort(([a], [b]) => a.localeCompare(b)));
}

/** @returns {Reviewed} */
export function readReviewed() {
  return /** @type {Reviewed} */ (JSON.parse(readFileSync(REVIEWED_PATH, 'utf8')));
}

/**
 * @param {Finding[]} findings
 * @returns {string} each paragraph with its file, hash, words and text: raw data, for outside the repository
 */
function listing(findings) {
  return findings
    .map(({ file, hash, words, text }) => `## ${file} · ${hash} · ${words.join(', ')}\n\n${text}`)
    .join('\n\n---\n\n');
}

function main() {
  const { values } = parseArgs({
    options: { privado: { type: 'string' }, listar: { type: 'string' }, 'aprobar-todo': { type: 'boolean' } },
  });
  if (values.privado === undefined)
    throw new Error('Usage: --privado <file> [--listar <file>] [--aprobar-todo]');
  const { terms, alerts } = readPrivateFile(values.privado, REPO_ROOT);
  const result = checkDeliverables({ terms, alerts, reviewed: readReviewed() });
  if (values.listar !== undefined) {
    if (isInside(join(values.listar, '..'), REPO_ROOT))
      throw new Error('The listing holds raw text: outside the repo.');
    writeFileSync(values.listar, `${listing([...result.terms, ...result.unreviewed])}\n`);
  }
  if (values['aprobar-todo'] === true)
    writeFileSync(REVIEWED_PATH, `${JSON.stringify(reviewedFrom(result.alerts), null, 2)}\n`);
  const problems = [
    ...findForbiddenPhrases().map((line) => `${line} (forbidden phrase)`),
    ...result.terms.map((f) => `${f.file} ${f.hash}: private term`),
    ...result.unreviewed.map((f) => `${f.file} ${f.hash}: alert not reviewed`),
  ];
  process.stdout.write(
    `${String(result.alerts.length)} paragraphs with alerts, ${String(problems.length)} problems.\n`,
  );
  if (problems.length > 0 && values['aprobar-todo'] !== true) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
