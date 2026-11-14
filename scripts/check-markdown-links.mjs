// @ts-check
/**
 * Checks that every relative link of the Markdown files of the repository points to something that exists: the file
 * or folder, and, when the link has a `#fragment` and the target is Markdown, a heading of that file (D-181). The
 * evaluator follows these links (README, GUIA-EVALUADOR.md, ai-workspace), so a broken one is a defect of the delivery.
 * External links are not followed: the checks never use the network. The literal prompts (`ai-workspace/prompts/`)
 * are records of what was written and are never edited, so they are not checked.
 * It reads inline links and images (also nested, as in a badge), reference definitions and the `src` and `href`
 * attributes of HTML. Not covered: `?query` strings and setext headings (underlined with `===`).
 * D-183: it also checks the HTML pages of `docs/` (the evaluator walkthrough): their `src` and `href` attributes and
 * their `#id` anchors. And a link to this repository on GitHub (`…/blob/main/<path>` or `…/tree/main/<path>`), in
 * Markdown or HTML, must name a path that exists and, for Markdown with a `#fragment`, a heading of it.
 * Usage: node scripts/check-markdown-links.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, posix } from 'node:path';
import { pathToFileURL } from 'node:url';

import { listRepoFiles, REPO_ROOT } from './lib/repo.mjs';

const SKIPPED_PREFIXES = ['ai-workspace/prompts/'];
/** The HTML pages that are checked: the published site of the evaluator walkthrough (D-183). */
const HTML_PAGES = /^docs\/.+\.html$/;
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
const OWN_REPOSITORY =
  /^https:\/\/github\.com\/AlejandroBuitrago685\/saas-o-matic\/(?:blob|tree)\/main\/([^#?]*)(?:#(.*))?$/;
const INLINE_LINK = /\]\(\s*(<[^>]*>|[^)\s]*)(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g;
const HTML_ATTRIBUTE = /\b(?:src|href)\s*=\s*"([^"]*)"/g;
const REFERENCE_DEFINITION = /^ {0,3}\[[^\]]+\]:\s*(<[^>]*>|\S+)/gm;

/**
 * The text without fenced code blocks, which can show headings and links that are not part of the page.
 * @param {string} markdown
 * @returns {string}
 */
function stripFences(markdown) {
  return markdown.replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?^ {0,3}\1[`~]*[ \t]*$/gm, '');
}

/**
 * The text without fenced code blocks and inline code, which can mention links that are not links.
 * @param {string} markdown
 * @returns {string}
 */
export function stripCode(markdown) {
  return stripFences(markdown).replace(/(`+)[^`\n]+?\1/g, '');
}

/**
 * The anchor GitHub gives a heading: lower case, punctuation removed (hyphens and underscores stay) and spaces
 * turned into hyphens.
 * @param {string} heading the heading text as written after the `#` signs
 * @returns {string}
 */
export function slugOf(heading) {
  return heading
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*~]+/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}_ -]/gu, '')
    .replace(/ /g, '-');
}

/**
 * The anchors a Markdown file offers: its headings, with the `-1`, `-2` suffixes of repeated ones.
 * @param {string} markdown
 * @returns {Set<string>}
 */
export function anchorsOf(markdown) {
  const seen = new Map();
  const anchors = new Set();
  for (const [, heading] of stripFences(markdown).matchAll(/^ {0,3}#{1,6}[ \t]+(.+?)[ \t#]*$/gm)) {
    const slug = slugOf(heading ?? '');
    const count = seen.get(slug) ?? 0;
    seen.set(slug, count + 1);
    anchors.add(count === 0 ? slug : `${slug}-${String(count)}`);
  }
  return anchors;
}

/**
 * @param {string} markdown
 * @returns {string[]} the targets of its inline links, images, reference definitions and HTML attributes
 */
export function linkTargets(markdown) {
  const text = stripCode(markdown);
  const matches = [INLINE_LINK, REFERENCE_DEFINITION, HTML_ATTRIBUTE].flatMap((pattern) => [
    ...text.matchAll(pattern),
  ]);
  const raw = matches.map((match) => match[1] ?? '');
  return raw.map((target) => target.replace(/^<|>$/g, '')).filter((target) => target !== '');
}

/**
 * @param {string} page an HTML page
 * @returns {string[]} the targets of its `src` and `href` attributes (the text of the page is not Markdown)
 */
export function htmlLinkTargets(page) {
  return [...page.matchAll(HTML_ATTRIBUTE)].map((match) => match[1] ?? '').filter((target) => target !== '');
}

/**
 * @param {string} page an HTML page
 * @returns {Set<string>} the anchors it offers: the `id` of its elements
 */
export function htmlIdsOf(page) {
  return new Set([...page.matchAll(/\sid\s*=\s*"([^"]+)"/g)].map((match) => match[1] ?? ''));
}

/**
 * @param {string} text
 * @returns {string | undefined} the text with its percent-encoding decoded, or undefined when it is malformed
 */
function decodePercent(text) {
  try {
    return decodeURIComponent(text);
  } catch {
    return undefined;
  }
}

/**
 * @param {string} from repository-relative path of the file with the link
 * @param {string} target
 * @returns {{ path: string, fragment: string } | 'external' | 'invalid'} where the link points; 'invalid' is a
 * malformed percent-encoding, which is reported as a broken link and never aborts the check
 */
function resolveTarget(from, target) {
  const own = OWN_REPOSITORY.exec(target);
  if (own !== null) return decodedTarget(`/${own[1] ?? ''}`, own[2] ?? '', from);
  if (EXTERNAL.test(target)) return 'external';
  const [rawPath = '', rawFragment = ''] = target.split('#', 2);
  return decodedTarget(rawPath, rawFragment, from);
}

/**
 * @param {string} rawPath the path as written, percent-encoded; a leading `/` is the repository root
 * @param {string} rawFragment
 * @param {string} from repository-relative path of the file with the link
 * @returns {{ path: string, fragment: string } | 'invalid'}
 */
function decodedTarget(rawPath, rawFragment, from) {
  const path = decodePercent(rawPath);
  const fragment = decodePercent(rawFragment);
  if (path === undefined || fragment === undefined) return 'invalid';
  if (path === '') return { path: from, fragment };
  const joined = path.startsWith('/') ? path.slice(1) : posix.join(dirname(from), path);
  return { path: posix.normalize(joined).replace(/\/$/, ''), fragment };
}

/**
 * @param {readonly { path: string, content: string }[]} markdownFiles the files to check
 * @param {ReadonlySet<string>} existing every file and folder of the repository
 * @param {(path: string) => string | undefined} readTarget the content of a Markdown file (to read its headings)
 * @returns {string[]} one line per broken link
 */
export function findBrokenLinks(markdownFiles, existing, readTarget) {
  return markdownFiles.flatMap(({ path, content }) =>
    (path.endsWith('.html') ? htmlLinkTargets(content) : linkTargets(content)).flatMap((target) => {
      const problem = problemOf(path, target, { existing, readTarget });
      return problem === undefined ? [] : [`${path}: ${target} (${problem})`];
    }),
  );
}

/**
 * @param {string} from repository-relative path of the file with the link
 * @param {string} target
 * @param {{ existing: ReadonlySet<string>, readTarget: (path: string) => string | undefined }} repository
 * @returns {string | undefined} what is wrong with the link, or undefined when it is fine
 */
function problemOf(from, target, repository) {
  const resolved = resolveTarget(from, target);
  if (resolved === 'external') return undefined;
  if (resolved === 'invalid') return 'invalid percent-encoding';
  if (!repository.existing.has(resolved.path)) return 'no such file or folder';
  return fragmentProblem(resolved, repository.readTarget);
}

/**
 * @param {{ path: string, fragment: string }} resolved the target of a link, which exists
 * @param {(path: string) => string | undefined} readTarget
 * @returns {string | undefined} what is wrong with its `#fragment`: an `id` of an HTML page or a heading of a
 * Markdown file that does not exist; other targets are not checked
 */
function fragmentProblem({ path, fragment }, readTarget) {
  if (fragment === '') return undefined;
  if (path.endsWith('.html'))
    return htmlIdsOf(readTarget(path) ?? '').has(fragment) ? undefined : 'no such anchor';
  if (!path.endsWith('.md')) return undefined;
  return anchorsOf(readTarget(path) ?? '').has(fragment.toLowerCase()) ? undefined : 'no such heading';
}

/**
 * @param {readonly string[]} files repository-relative paths of files
 * @returns {Set<string>} the files and every folder that contains them
 */
export function withFolders(files) {
  const all = new Set(files);
  for (const file of files) {
    for (let folder = dirname(file); folder !== '.' && !all.has(folder); folder = dirname(folder))
      all.add(folder);
  }
  return all;
}

function main() {
  const files = listRepoFiles();
  const read = (/** @type {string} */ path) => readFileSync(`${REPO_ROOT}/${path}`, 'utf8');
  const isChecked = (/** @type {string} */ path) =>
    (path.endsWith('.md') && !SKIPPED_PREFIXES.some((prefix) => path.startsWith(prefix))) ||
    HTML_PAGES.test(path);
  const markdown = files.filter(isChecked).map((path) => ({ path, content: read(path) }));
  const problems = findBrokenLinks(markdown, withFolders(files), read);
  if (problems.length > 0) {
    process.stderr.write(`Broken Markdown links:\n${problems.map((p) => `  - ${p}`).join('\n')}\n`);
    process.exit(1);
  }
  process.stdout.write(`check-markdown-links: ${String(markdown.length)} files OK\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
