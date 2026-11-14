import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  automatedCriteria,
  blockingProblems,
  definedVectors,
  missingIds,
  PENDING_CRITERIA,
} from '../scripts/trace-tests.mjs';
import { REPO_ROOT } from './lint-fixture.js';

describe('D-86 / D-161 traceability script (blocking from P10)', () => {
  // Ids that do not exist in the specification, so this sample never counts as real coverage.
  const sample = [
    '**AC-901 · Base** · Refs: RF-08 · Nivel: U · Vectores: TV-ZZ-01…09',
    '**AC-902 · Repo** · Refs: RNF-19 · Nivel: R',
    '**AC-903 · Clone** · Refs: RNF-18 · Nivel: CI',
    '| TV-ZZ-01 | 1 | … |',
  ].join('\n');

  it('keeps only automatable criteria (U, I, E, CI) and reads vector ids', () => {
    expect(automatedCriteria(sample)).toEqual(['AC-901', 'AC-903']);
    expect(definedVectors(sample)).toEqual(['TV-ZZ-01']);
  });

  it('reports ids not cited by any test, without partial matches', () => {
    expect(missingIds(['AC-901', 'AC-9', 'TV-ZZ-01'], "it('AC-901 TV-ZZ-01: …')")).toEqual(['AC-9']);
  });

  it('finds the 81 automatable criteria of the real specification (83 minus the review-only AC-94 and AC-99)', () => {
    const markdown = readFileSync(
      join(REPO_ROOT, 'ai-workspace/02-especificacion/07-criterios-aceptacion.md'),
      'utf8',
    );

    expect(automatedCriteria(markdown)).toHaveLength(81);
    expect(automatedCriteria(markdown)).not.toContain('AC-94');
  });

  it('D-161: a gap blocks unless the plan declares it pending, and a pending id that is already tested blocks too', () => {
    const pending = { 'AC-901': 'P11', 'AC-902': 'P11' };

    expect(blockingProblems(['AC-901', 'AC-903', 'TV-ZZ-01'], pending)).toEqual({
      gaps: ['AC-903', 'TV-ZZ-01'],
      stale: ['AC-902'],
    });
    expect(blockingProblems([], {})).toEqual({ gaps: [], stale: [] });
  });

  it('D-161: no criterion is pending since P11, which tested the last one (the public demo)', () => {
    expect(PENDING_CRITERIA).toEqual({});
  });
});
