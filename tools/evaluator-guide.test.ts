import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { requirementRows } from '../scripts/recorrido/sources/guide.mjs';
import { REPO_ROOT } from './lint-fixture.js';

const GUIDE = 'GUIA-EVALUADOR.md';
const MATRIX = 'ai-workspace/02-especificacion/08-trazabilidad.md';
const CRITERIA = 'ai-workspace/02-especificacion/07-criterios-aceptacion.md';
const TEST_LINK = /\]\(((?:apps|packages|e2e|tools|\.github)\/[^)#\s]+)\)/g;
const CRITERION_HEADER = /^\*\*(AC-\d+) · [^*]+\*\* · Refs: [^\n]*?· Nivel: ([^·\n]+)/gm;

/**
 * What the statement asks for (00-enunciado §2 and §3, in the requirements of 01-alcance): the functional requirements
 * of the Must scope, the stack, the responsive interface, the README and the repository, and the `ai-workspace`.
 * Each one must appear in some row of the table.
 */
const REQUIREMENTS_OF_THE_STATEMENT = [
  ...Array.from({ length: 17 }, (_, index) => `RF-${String(index + 1).padStart(2, '0')}`),
  ...['RNF-01', 'RNF-02', 'RNF-03', 'RNF-07', 'RNF-08', 'RNF-15', 'RNF-16', 'RNF-17', 'RNF-18', 'RNF-19'],
];

const read = (path: string): string => readFileSync(join(REPO_ROOT, path), 'utf8');
const idsOf = (text: string, prefix: string): string[] =>
  [...text.matchAll(new RegExp(`\\b${prefix}-\\d+\\b`, 'g'))].map(([id]) => id);

interface Row {
  readonly requirements: string[];
  readonly criteria: string[];
  readonly testFiles: string[];
  readonly text: string;
}

/**
 * The rows of the requirements table: requirement of the statement | where it is seen | criteria | tests. Read with
 * the same reader as the evaluator walkthrough (D-183), so the page and this test see the same rows.
 */
function tableRows(): Row[] {
  return requirementRows(read(GUIDE)).map((row) => ({
    requirements: [...idsOf(row.requirement, 'RF'), ...idsOf(row.requirement, 'RNF')],
    criteria: idsOf(row.criteria, 'AC'),
    testFiles: [...row.tests.matchAll(TEST_LINK)].map((match) => match[1] ?? ''),
    text: Object.values(row).join(' | '),
  }));
}

/** Requirement → criteria, straight from the traceability matrix (sections 1 and 2). */
function matrixCriteria(): Map<string, string[]> {
  const rows = read(MATRIX)
    .split('\n')
    .filter((line) => /^\| (?:RF|RNF)-\d+ \|/.test(line));
  return new Map(rows.map((line) => [/^\| ((?:RF|RNF)-\d+)/.exec(line)?.[1] ?? '', idsOf(line, 'AC')]));
}

/** Criterion → its levels (`U`, `I`, `E`, `CI`, `R`), from the headers of the criteria document. */
function criterionLevels(): Map<string, string[]> {
  return new Map(
    [...read(CRITERIA).matchAll(CRITERION_HEADER)].map(([, id = '', level = '']) => [
      id,
      level.split('/').map((part) => part.trim()),
    ]),
  );
}

describe('D-181 the requirements table of the evaluator guide comes from the traceability matrix', () => {
  const rows = tableRows();

  it('has a row for every requirement of the statement', () => {
    const covered = new Set(rows.flatMap((row) => row.requirements));

    expect(REQUIREMENTS_OF_THE_STATEMENT.filter((id) => !covered.has(id))).toEqual([]);
  });

  it('lists only criteria that exist, and that the matrix assigns to the requirements of its row', () => {
    const defined = criterionLevels();
    const matrix = matrixCriteria();

    for (const row of rows) {
      const allowed = new Set(row.requirements.flatMap((id) => matrix.get(id) ?? []));
      expect(row.criteria.length, row.text).toBeGreaterThan(0);
      for (const criterion of row.criteria) {
        expect(defined.has(criterion), `${criterion} is not in ${CRITERIA}`).toBe(true);
        expect(
          allowed.has(criterion),
          `${criterion} is not assigned by the matrix to ${row.requirements.join(', ')}`,
        ).toBe(true);
      }
    }
  });

  it('links tests that exist and that cite one of the criteria of their row', () => {
    for (const row of rows) {
      for (const file of row.testFiles) {
        const cited = new Set(idsOf(read(file), 'AC'));
        expect(
          row.criteria.some((id) => cited.has(id)),
          `${file} cites none of ${row.criteria.join(', ')}`,
        ).toBe(true);
      }
    }
  });

  it('says «AC-xx: revisión» for every criterion with a review level, in every row where it appears', () => {
    const levels = criterionLevels();

    for (const row of rows) {
      for (const criterion of row.criteria.filter((id) => levels.get(id)?.includes('R'))) {
        expect(row.text, `${criterion} needs «${criterion}: revisión»`).toContain(`${criterion}: revisión`);
      }
    }
  });

  it('gives a test to every row, except those whose criteria are review-only, and shows every review-only one', () => {
    const levels = criterionLevels();
    const reviewOnly = [...levels]
      .filter(([, parts]) => parts.every((part) => part === 'R'))
      .map(([id]) => id);
    const shown = new Set(rows.flatMap((row) => row.criteria));

    for (const row of rows.filter((candidate) => candidate.testFiles.length === 0)) {
      expect(
        row.criteria.every((id) => reviewOnly.includes(id)),
        `${row.text} has no test and criteria that can be tested`,
      ).toBe(true);
    }
    expect(reviewOnly.filter((id) => !shown.has(id))).toEqual([]);
  });
});
