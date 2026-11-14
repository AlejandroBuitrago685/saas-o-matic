// @ts-check
/**
 * Checks that every relative link of the Markdown files of the repository points to something that exists: the file
 * or folder, and, when the link has a `#fragment` and the target is Markdown, a heading of that file (D-181). The
 * evaluator follows these links (README, GUIA-EVALUADOR.md, ai-workspace), so a broken one is a defect of the delivery.
 * External links are not followed: the checks never use the network. The literal prompts (`ai-workspace/prompts/`)
 * are records of what was written and are never edited, so they are not checked.
 * Usage: node scripts/check-markdown-links.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, posix } from 'node:path';
import { pathToFileURL } from 'node:url';

import { listRepoFiles, REPO_ROOT } from './lib/repo.mjs';

const SKIPPED_PREFIXES = ['ai-workspace/prompts/'];
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
const INLINE_LINK = /!?\[(?:[^\]\\]|\\.)*\]\(\s*(<[^>]*>|[^)\s]*)(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g;
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
 * @returns {string[]} the targets of its inline links, images and reference definitions
 */
export function linkTargets(markdown) {
  const text = stripCode(markdown);
  const raw = [...text.matchAll(INLINE_LINK), ...text.matchAll(REFERENCE_DEFINITION)].map((m) => m[1] ?? '');
  return raw.map((target) => target.replace(/^<|>$/g, '')).filter((target) => target !== '');
}

/**
 * @param {string} from repository-relative path of the file with the link
 * @param {string} target
 * @returns {{ path: string, fragment: string } | undefined} undefined for an external link
 */
function resolveTarget(from, target) {
  if (EXTERNAL.test(target)) return undefined;
  const [rawPath = '', fragment = ''] = target.split('#', 2);
  const path = decodeURIComponent(rawPath);
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
    linkTargets(content).flatMap((target) => {
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
  if (resolved === undefined) return undefined;
  if (!repository.existing.has(resolved.path)) return 'no such file or folder';
  if (resolved.fragment === '' || !resolved.path.endsWith('.md')) return undefined;
  const anchors = anchorsOf(repository.readTarget(resolved.path) ?? '');
  return anchors.has(decodeURIComponent(resolved.fragment).toLowerCase()) ? undefined : 'no such heading';
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
  const markdown = files
    .filter((path) => path.endsWith('.md') && !SKIPPED_PREFIXES.some((prefix) => path.startsWith(prefix)))
    .map((path) => ({ path, content: read(path) }));
  const problems = findBrokenLinks(markdown, withFolders(files), read);
  if (problems.length > 0) {
    process.stderr.write(`Broken Markdown links:\n${problems.map((p) => `  - ${p}`).join('\n')}\n`);
    process.exit(1);
  }
  process.stdout.write(`check-markdown-links: ${String(markdown.length)} files OK\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
