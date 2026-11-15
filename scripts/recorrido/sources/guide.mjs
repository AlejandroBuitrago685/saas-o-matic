// @ts-check
/**
 * What the walkthrough takes from GUIA-EVALUADOR.md (D-183): the requirements table, read from the file and never
 * copied by hand (D-181). The reading routes stay in the guide (D-192).
 */
import { sectionOf, tableRows } from '../../lib/markdown.mjs';

export const GUIDE_FILE = 'GUIA-EVALUADOR.md';

/** @typedef {{ requirement: string, whereSeen: string, criteria: string, tests: string }} RequirementRow */

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
