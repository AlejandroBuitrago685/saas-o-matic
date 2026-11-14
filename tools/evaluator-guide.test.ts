import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { REPO_ROOT } from './lint-fixture.js';

const GUIDE = 'GUIA-EVALUADOR.md';
const MATRIX = 'ai-workspace/02-especificacion/08-trazabilidad.md';
const CRITERIA = 'ai-workspace/02-especificacion/07-criterios-aceptacion.md';
const TEST_LINK = /\]\(((?:apps|packages|e2e|tools|\.github)\/[^)#\s]+)\)/g;

const read = (path: string): string => readFileSync(join(REPO_ROOT, path), 'utf8');
const idsOf = (text: string, prefix: string): string[] =>
  [...text.matchAll(new RegExp(`\\b${prefix}-\\d+\\b`, 'g'))].map(([id]) => id);

interface Row {
  readonly requirements: string[];
  readonly criteria: string[];
  readonly testFiles: string[];
  readonly text: string;
}

/** The rows of the requirements table: requirement of the statement | where it is seen | criteria | tests. */
function tableRows(): Row[] {
  return read(GUIDE)
    .split('\n')
    .filter((line) => /^\| .*\b(?:RF|RNF)-\d+/.test(line))
    .map((line) => {
      const [, , , criteriaCell = '', testsCell = ''] = line.split('|');
      return {
        requirements: [...idsOf(line.split('|')[1] ?? '', 'RF'), ...idsOf(line.split('|')[1] ?? '', 'RNF')],
        criteria: idsOf(criteriaCell, 'AC'),
        testFiles: [...testsCell.matchAll(TEST_LINK)].map((match) => match[1] ?? ''),
        text: line,
      };
    });
}

/** Requirement → criteria, straight from the traceability matrix (sections 1 and 2). */
function matrixCriteria(): Map<string, string[]> {
  const rows = read(MATRIX)
    .split('\n')
    .filter((line) => /^\| (?:RF|RNF)-\d+ \|/.test(line));
  return new Map(rows.map((line) => [/^\| ((?:RF|RNF)-\d+)/.exec(line)?.[1] ?? '', idsOf(line, 'AC')]));
}

describe('D-181 the requirements table of the evaluator guide comes from the traceability matrix', () => {
  const rows = tableRows();

  it('has a row for every requirement group of the statement', () => {
    expect(rows.length).toBeGreaterThanOrEqual(15);
  });

  it('lists only criteria that exist, and that the matrix assigns to the requirements of its row', () => {
    const defined = new Set(idsOf(read(CRITERIA), 'AC'));
    const matrix = matrixCriteria();

    for (const row of rows) {
      const allowed = new Set(row.requirements.flatMap((id) => matrix.get(id) ?? []));
      expect(row.requirements.length, row.text).toBeGreaterThan(0);
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

  it('gives a test to every row whose criteria are not review-only, and says so otherwise', () => {
    for (const row of rows) {
      expect(row.testFiles.length > 0 || /revisión/i.test(row.text), row.text).toBe(true);
    }
  });
});
