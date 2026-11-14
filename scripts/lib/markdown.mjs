// @ts-check
/**
 * Small readers of the repository's Markdown: sections, pipe tables and numbered or bulleted lists. They back the
 * test of the evaluator guide (D-181) and the generator of the walkthrough (D-183), so both read the same rows.
 */

/**
 * @param {string} markdown
 * @param {RegExp} heading matches the heading line (without the `#` signs)
 * @returns {string} the body under that heading, up to the next heading of the same or a higher level; throws when
 * the heading is missing, so a renamed section breaks the generation instead of emptying a part of the page
 */
export function sectionOf(markdown, heading) {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => {
    const match = /^(#{1,6})[ \t]+(.+?)[ \t#]*$/.exec(line);
    return match !== null && heading.test(match[2] ?? '');
  });
  if (start === -1) throw new Error(`sectionOf: no heading matches ${String(heading)}`);
  const level = /^#+/.exec(lines[start] ?? '')?.[0].length ?? 1;
  const end = lines.findIndex(
    (line, index) => index > start && new RegExp(`^#{1,${String(level)}}[ \\t]`).test(line),
  );
  return lines.slice(start + 1, end === -1 ? undefined : end).join('\n');
}

/**
 * @param {string} line a row of a pipe table
 * @returns {string[]} its cells, trimmed (the outer pipes do not make cells)
 */
export function cellsOf(line) {
  return line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => cell.trim());
}

/**
 * @param {string} markdown
 * @returns {string[][]} the body rows of every pipe table in the text (header and separator rows left out)
 */
export function tableRows(markdown) {
  const lines = markdown.split('\n');
  return lines.flatMap((line, index) => {
    const isRow = line.trim().startsWith('|');
    const isSeparator = /^\|?\s*:?-{3,}/.test(line.trim());
    const isHeader = /^\|?\s*:?-{3,}/.test((lines[index + 1] ?? '').trim());
    return isRow && !isSeparator && !isHeader ? [cellsOf(line)] : [];
  });
}

/** @typedef {{ text: string, children: string[] }} ListItem */

const ITEM = /^([ \t]*)(?:\d+\.|[-*])[ \t]+(.*)$/;

/**
 * @param {ListItem[]} items
 * @param {string} line
 */
function addLine(items, line) {
  const last = items.at(-1);
  const [, indent = '', text = ''] = ITEM.exec(line) ?? [];
  if (text === '') {
    if (last !== undefined) continueItem(last, line.trim());
  } else if (indent === '' || last === undefined) items.push({ text, children: [] });
  else last.children.push(text);
}

/**
 * @param {ListItem} item
 * @param {string} text a wrapped line: it continues the last nested item, or the item itself
 */
function continueItem(item, text) {
  const child = item.children.pop();
  if (child === undefined) item.text = `${item.text} ${text}`;
  else item.children.push(`${child} ${text}`);
}

/**
 * @param {string} markdown a section that holds one numbered or bulleted list
 * @returns {ListItem[]} its items, each joined into one line (wrapped lines included), with their nested items; the
 * list ends at the first paragraph that is not indented
 */
export function listItems(markdown) {
  /** @type {ListItem[]} */
  const items = [];
  const lines = markdown.split('\n').filter((line) => line.trim() !== '');
  const first = lines.findIndex((line) => ITEM.test(line));
  for (const line of first === -1 ? [] : lines.slice(first)) {
    if (!ITEM.test(line) && !/^[ \t]/.test(line)) break;
    addLine(items, line);
  }
  return items;
}
