// @ts-check
/**
 * What the walkthrough takes from GUIA-EVALUADOR.md (D-183): the requirements table, read from the file and never
 * copied by hand (D-181), and the reading routes of 5, 15 and 60 minutes.
 */
import { listItems, sectionOf, tableRows } from '../../lib/markdown.mjs';

export const GUIDE_FILE = 'GUIA-EVALUADOR.md';

/** @typedef {{ requirement: string, whereSeen: string, criteria: string, tests: string }} RequirementRow */
/** @typedef {import('../../lib/markdown.mjs').ListItem} ListItem */
/** @typedef {{ minutes: number, title: string, intro: string, commands: string[], items: ListItem[] }} Route */

/**
 * @param {string} guide the text of GUIA-EVALUADOR.md
 * @returns {RequirementRow[]} the rows of «Requisitos del enunciado, dónde se ven y qué test los cubre», as Markdown
 */
export function requirementRows(guide) {
  const rows = tableRows(sectionOf(guide, /^Requisitos del enunciado/));
  return rows.map((cells) => {
    if (cells.length !== 4)
      throw new Error(`requirementRows: a row has ${String(cells.length)} cells, not 4`);
    const [requirement = '', whereSeen = '', criteria = '', tests = ''] = cells;
    return { requirement, whereSeen, criteria, tests };
  });
}

/**
 * @param {string} section
 * @returns {string} the first paragraph of the section, joined into one line
 */
function firstParagraph(section) {
  const paragraph = section.trim().split(/\n\s*\n/)[0] ?? '';
  return /^(?:\d+\.|[-*`])/.test(paragraph) ? '' : paragraph.replace(/\s*\n\s*/g, ' ');
}

/**
 * @param {string} section
 * @returns {string[]} the lines of its fenced code block, if it has one
 */
function commandsOf(section) {
  const fence = /```[a-z]*\n([\s\S]*?)```/.exec(section);
  return (fence?.[1] ?? '').split('\n').filter((line) => line.trim() !== '');
}

/**
 * @param {string} guide
 * @returns {Route[]} the three reading routes, in the order of the guide
 */
export function readingRoutes(guide) {
  return [5, 15, 60].map((minutes) => {
    const section = sectionOf(guide, new RegExp(`^Recorrido de ${String(minutes)} minutos: `));
    return {
      minutes,
      title: routeTitle(guide, minutes),
      intro: firstParagraph(section),
      commands: commandsOf(section),
      items: listItems(section.replace(/```[\s\S]*?```/g, '')),
    };
  });
}

/**
 * @param {string} guide
 * @param {number} minutes
 * @returns {string} what the route of those minutes is about («la demo», «el código y el proceso»…)
 */
function routeTitle(guide, minutes) {
  const match = new RegExp(`^## Recorrido de ${String(minutes)} minutos: (.+)$`, 'm').exec(guide);
  if (match === null) throw new Error(`routeTitle: no route of ${String(minutes)} minutes`);
  return match[1] ?? '';
}
