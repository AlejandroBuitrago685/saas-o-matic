// @ts-check
/**
 * The private file of the converter (D-189). It lives outside the repository, so that no real value is published, and
 * has two sections:
 *
 *     [tapar]
 *     <term>                     a name that is always covered, with the only mark of redact.mjs
 *     [alerta]
 *     <word>                     a word that makes its paragraph need a decision in omissions.json
 *
 * Empty lines and lines that start with `#` are ignored.
 */
import { readFileSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

/**
 * @typedef {{ terms: string[], alerts: string[] }} PrivateConfig
 */

/** Short words would match inside others, so up to this length an alert is a whole word; longer ones, a prefix. */
const WHOLE_WORD_UP_TO = 4;

/**
 * @param {string} text the content of the private file
 * @returns {PrivateConfig}
 */
export function parsePrivateFile(text) {
  /** @type {PrivateConfig} */
  const config = { terms: [], alerts: [] };
  let section = '';
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    if (/^\[[a-z]+\]$/.test(line)) section = line;
    else if (section === '[tapar]') config.terms.push(termOf(line));
    else if (section === '[alerta]') config.alerts.push(line);
    else throw new Error(`private file: line outside [tapar] or [alerta]: ${line.length} characters`);
  }
  return config;
}

/**
 * @param {string} line a term, maybe followed by a tab and a note for the author, which is ignored
 * @returns {string}
 */
function termOf(line) {
  return (line.split('\t')[0] ?? '').trim();
}

/**
 * @param {string} path the private file
 * @param {string} repoRoot
 * @returns {boolean} whether the file is inside the repository, where it could be committed
 */
export function isInside(path, repoRoot) {
  const fromRoot = relative(realpathSync(repoRoot), existingRealPath(resolve(path)));
  const isAbove = fromRoot === '..' || fromRoot.startsWith(`..${sep}`);
  return !isAbove && !isAbsolute(fromRoot);
}

/**
 * @param {string} path an absolute path that may not exist yet (a new output folder)
 * @returns {string} its real path, resolved from the nearest folder that exists
 */
function existingRealPath(path) {
  try {
    return realpathSync(path);
  } catch {
    const parent = dirname(path);
    return parent === path ? path : join(existingRealPath(parent), basename(path));
  }
}

/**
 * @param {string} path
 * @param {string} repoRoot
 * @returns {PrivateConfig}
 */
export function readPrivateFile(path, repoRoot) {
  if (isInside(path, repoRoot)) throw new Error('The private file must live outside the repository (D-189).');
  return parsePrivateFile(readFileSync(path, 'utf8'));
}

/**
 * @param {string} word an alert word or phrase
 * @returns {RegExp} it at the start of a word, ignoring case; a short one, as a whole word
 */
export function alertPattern(word) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const end = word.length <= WHOLE_WORD_UP_TO ? '(?![\\p{L}\\p{N}_])' : '';
  return new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}${end}`, 'iu');
}

/**
 * @param {string} text
 * @param {readonly string[]} alerts
 * @returns {string[]} the alert words the text contains
 */
export function alertsIn(text, alerts) {
  return alerts.filter((word) => alertPattern(word).test(text));
}
