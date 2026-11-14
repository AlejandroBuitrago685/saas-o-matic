// @ts-check
/**
 * The addresses the walkthrough links to (D-183). Links into the repository are absolute GitHub URLs, so the page
 * works the same opened from disk and published; `check-markdown-links` checks that each one names a real path.
 */
import { existsSync, statSync } from 'node:fs';
import { join, posix } from 'node:path';

import { REPO_ROOT } from '../lib/repo.mjs';

export const REPO_URL = 'https://github.com/AlejandroBuitrago685/saas-o-matic';
export const DEMO_URL = 'https://saas-o-matic.codeserviceapi.es';
export const PAGES_URL = 'https://alejandrobuitrago685.github.io/saas-o-matic/recorrido/';

/**
 * @param {string} path repository-relative path, optionally with `#fragment`
 * @returns {string} its GitHub URL (`tree` for a folder, `blob` for a file); throws when the path does not exist,
 * so a renamed file breaks the generation instead of shipping a dead link
 */
export function githubUrl(path) {
  const [file = '', fragment] = path.split('#', 2);
  const clean = posix.normalize(file).replace(/\/$/, '');
  const absolute = join(REPO_ROOT, clean);
  if (clean.startsWith('..') || !existsSync(absolute)) throw new Error(`githubUrl: no such path ${path}`);
  const kind = statSync(absolute).isDirectory() ? 'tree' : 'blob';
  return `${REPO_URL}/${kind}/main/${encodeURI(clean)}${fragment === undefined ? '' : `#${fragment}`}`;
}

/**
 * @param {string} from repository-relative path of the Markdown file that holds the link
 * @param {string} target the link as written there
 * @returns {string} an absolute URL: external links stay, relative ones become GitHub URLs
 */
export function resolveMarkdownLink(from, target) {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(target)) return target;
  const [path = '', fragment] = target.split('#', 2);
  const resolved = path === '' ? from : posix.join(posix.dirname(from), decodeURIComponent(path));
  return githubUrl(fragment === undefined ? resolved : `${resolved}#${fragment}`);
}
