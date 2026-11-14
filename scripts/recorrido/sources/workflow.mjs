// @ts-check
/**
 * What the walkthrough takes from the process documents (D-183): the ten moments of «Dónde intervine yo», the parts
 * of the plan with their PR, the decisions and the times measured in the clean clone of P12.
 */
import { listItems, sectionOf, tableRows } from '../../lib/markdown.mjs';

export const WORKSPACE_README = 'ai-workspace/README.md';
export const PLAN_FILE = 'ai-workspace/04-plan-implementacion.md';
export const DECISIONS_FILE = 'ai-workspace/decisiones.md';
export const DIARY_FILE = 'ai-workspace/diario.md';

/** @typedef {{ title: string, body: string }} Moment */
/** @typedef {{ id: string, title: string, objective: string }} Part */
/** @typedef {{ step: string, result: string, time: string }} MeasuredStep */

/**
 * @param {string} readme the text of ai-workspace/README.md
 * @returns {Moment[]} the moments of «Dónde intervine yo», with the same text: the bold lead is the title
 */
export function interventionMoments(readme) {
  return listItems(sectionOf(readme, /^Dónde intervine yo$/)).map(({ text }) => {
    const match = /^\*\*(.+?)\*\*\s*(.*)$/.exec(text);
    if (match === null)
      throw new Error(`interventionMoments: an item has no bold title: ${text.slice(0, 40)}`);
    return { title: (match[1] ?? '').replace(/\.$/, ''), body: match[2] ?? '' };
  });
}

/**
 * @param {string} plan the text of 04-plan-implementacion.md
 * @returns {Part[]} every part (`### Pn · title · effort`) with the first sentence of its objective
 */
export function planParts(plan) {
  return [...plan.matchAll(/^### (P\d+) · (.+?)(?: · [^·\n]*\d[^·\n]*)?$/gm)].map(
    ([, id = '', title = '']) => {
      const items = listItems(sectionOf(plan, new RegExp(`^${id} · `)));
      const objective = items.find(({ text }) => text.startsWith('**Objetivo:**'))?.text;
      if (objective === undefined) throw new Error(`planParts: ${id} has no objective`);
      return { id, title, objective: objective.replace('**Objetivo:**', '').trim() };
    },
  );
}

/**
 * @param {string} plan
 * @returns {Map<string, string[]>} part → the numbers of its pull requests, from the table «Partes y PR»
 */
export function partPullRequests(plan) {
  const rows = tableRows(sectionOf(plan, /^\d+\. Partes y PR$/));
  return new Map(
    rows.map(([part = '', prs = '']) => [part, [...prs.matchAll(/#(\d+)/g)].map(([, n = '']) => n)]),
  );
}

/**
 * @param {string} decisions the text of decisiones.md
 * @returns {Map<string, string>} decision id → its lead (the first bold phrase of its row)
 */
export function decisionLeads(decisions) {
  return new Map(
    [...decisions.matchAll(/^\| (D-\d+) \| \*\*(.+?)\*\*/gm)].map(([, id = '', lead = '']) => [
      id,
      lead.replace(/[:.]$/, ''),
    ]),
  );
}

/**
 * @param {string} diary the text of diario.md
 * @returns {MeasuredStep[]} the rows of the clean-clone check of P12 (step of the README, result, time)
 */
export function cleanCloneTimes(diary) {
  const p12 = sectionOf(diary, /^P12 · Cierre/);
  return tableRows(p12)
    .filter((cells) => cells.length === 3)
    .map(([step = '', result = '', time = '']) => ({ step, result, time }));
}

/**
 * @param {readonly MeasuredStep[]} steps
 * @returns {{ node: number, web: number }} the tests counted by `npm test` in the clean clone: Node projects and web
 */
export function measuredTestCounts(steps) {
  const row = steps.find(({ step }) => step.includes('`npm test`'));
  const match = /([\d ]+) \+ ([\d ]+) tests/.exec(row?.result ?? '');
  if (match === null) throw new Error('measuredTestCounts: the clean-clone table has no `npm test` row');
  const toNumber = (/** @type {string | undefined} */ text) => Number((text ?? '').replace(/\s/g, ''));
  return { node: toNumber(match[1]), web: toNumber(match[2]) };
}
