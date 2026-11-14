// @ts-check
/**
 * Inline Markdown of the repository's documents (bold, italics, code, links and autolinks) as escaped HTML, for the
 * texts the walkthrough shows verbatim: the requirements table, the ten moments and the reading routes (D-183).
 * Everything that is not one of those forms is text and is escaped.
 */
import { markup, SafeHtml } from './html.mjs';
import { resolveMarkdownLink } from './repo-links.mjs';

const TOKEN =
  /(?<code>`+)(?<codeText>[^`]+?)\k<code>|\[(?<linkText>(?:`[^`]*`|[^\]])+)\]\((?<href>[^)\s]+)\)|<(?<auto>https?:\/\/[^>\s]+)>|\*\*(?<bold>.+?)\*\*|(?<![\p{L}\p{N}])[_*](?<em>[^_*\s](?:[^_*]*[^_*\s])?)[_*](?![\p{L}\p{N}])/gu;

/**
 * @param {string} href
 * @param {SafeHtml} content
 * @returns {SafeHtml}
 */
const link = (href, content) => markup`<a href="${href}">${content}</a>`;

/**
 * @param {Record<string, string | undefined>} groups
 * @param {string} from
 * @returns {SafeHtml}
 */
function tokenHtml(groups, from) {
  if (groups['codeText'] !== undefined) return markup`<code>${groups['codeText'].trim()}</code>`;
  if (groups['linkText'] !== undefined) {
    return link(resolveMarkdownLink(from, groups['href'] ?? ''), inlineMarkdown(groups['linkText'], from));
  }
  if (groups['auto'] !== undefined)
    return link(groups['auto'], markup`${groups['auto'].replace(/^https?:\/\//, '')}`);
  if (groups['bold'] !== undefined) return markup`<strong>${inlineMarkdown(groups['bold'], from)}</strong>`;
  return markup`<em>${inlineMarkdown(groups['em'] ?? '', from)}</em>`;
}

/**
 * @param {string} text one line or paragraph of Markdown
 * @param {string} from repository-relative path of its file (relative links are resolved from it)
 * @returns {SafeHtml}
 */
export function inlineMarkdown(text, from) {
  let out = '';
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    out += markup`${text.slice(last, match.index)}`.value + tokenHtml(match.groups ?? {}, from).value;
    last = match.index + match[0].length;
  }
  return new SafeHtml(out + markup`${text.slice(last)}`.value);
}

/**
 * @param {string} text inline Markdown
 * @returns {string} the plain text a reader sees (for search and labels)
 */
export function plainText(text) {
  return text
    .replace(/\[((?:`[^`]*`|[^\]])+)\]\([^)]*\)/g, '$1')
    .replace(/<(https?:\/\/[^>\s]+)>/g, '$1')
    .replace(/`+([^`]+?)`+|\*\*(.+?)\*\*/g, (_, code, bold) => code ?? bold ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}
