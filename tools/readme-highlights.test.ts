import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  CI_FILE,
  CRITERIA_FILE,
  criteriaCount,
  VECTOR_FILES,
  vectorCount,
  workflowJobs,
} from '../scripts/recorrido/sources/quality.mjs';
import { cleanCloneTimes, DIARY_FILE, measuredTestCounts } from '../scripts/recorrido/sources/workflow.mjs';
import { REPO_ROOT } from './lint-fixture.js';

/**
 * D-190: «Lo más destacable» of the README gives figures that nobody types by hand: each one is read here from its
 * source, as the walkthrough does (D-183), and the block must say exactly that.
 */
const read = (path: string): string => readFileSync(join(REPO_ROOT, path), 'utf8');

/** A number as the documents write it: groups of three digits separated by a space (1 553). */
const spaced = (value: number): string => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

function highlights(): string {
  const readme = read('README.md');
  const start = readme.indexOf('## Lo más destacable');
  const end = readme.indexOf('\n## ', start + 1);
  return start < 0 ? '' : readme.slice(start, end < 0 ? undefined : end);
}

/**
 * The jobs of `ci.yml` with the checks each one adds, read as `workflowJobs` of the walkthrough reads them: the file
 * keeps two spaces per level, a matrix as `node: [..]` or as an `include:` list of `- { … }` entries, and a job that
 * only runs on a push to `main` says so in its `if:`. The branch protection of `main` is a setting of GitHub, not a
 * file: what this reads is the jobs of a pull request, which 09-calidad §1 makes all required.
 */
function jobChecks(
  workflow: string,
): { id: string; checks: number; onPullRequest: boolean; nodes: string[] }[] {
  const body = workflow.slice(workflow.search(/^jobs:\s*$/m));
  return body
    .split(/^(?= {2}[a-z][\w-]*:\s*$)/m)
    .slice(1)
    .map((chunk) => ({
      id: /^ {2}([\w-]+):/.exec(chunk)?.[1] ?? '',
      onPullRequest: !/^ {4}if: .*github\.event_name == 'push'/m.test(chunk),
      ...matrixOf(chunk),
    }));
}

/** How many checks a job adds (one per matrix entry, or one) and the Node versions its matrix names. */
function matrixOf(chunk: string): { checks: number; nodes: string[] } {
  const list = /^ {8}node: \[([^\]]*)\]/m.exec(chunk)?.[1];
  if (list !== undefined) {
    const nodes = list.split(',').map((node) => node.trim());
    return { checks: nodes.length, nodes };
  }
  const included = [...chunk.matchAll(/^ {10}- \{ os: [\w-]+, node: '(\d*)' \}/gm)];
  const nodes = included.map(([, node = '']) => node).filter((node) => node !== '');
  return { checks: Math.max(1, included.length), nodes };
}

describe('D-190 «Lo más destacable» says what its sources say', () => {
  const block = highlights();

  it('is a block of 6 or 7 lines of one sentence, each with a link to what proves it', () => {
    const lines = block.split('\n').filter((line) => line.startsWith('- '));

    expect(lines.length).toBeGreaterThanOrEqual(6);
    expect(lines.length).toBeLessThanOrEqual(7);
    expect(lines.every((line) => /\]\([^)]+\)\)?\.$/.test(line))).toBe(true);
  });

  it('gives the tests of the latest clean clone of the diary', () => {
    const { node, web } = measuredTestCounts(cleanCloneTimes(read(DIARY_FILE)).steps);

    expect(block).toContain(
      `${spaced(node + web)} en el último clon limpio (${spaced(node)} de Node y ${spaced(web)} de la web)`,
    );
  });

  it('gives the criteria and the vectors that `npm run trace` counts', () => {
    const criteria = criteriaCount(read(CRITERIA_FILE));
    const vectors = vectorCount(VECTOR_FILES.map(read));

    expect(block).toContain(
      `${String(criteria.automated)} de los ${String(criteria.total)} criterios de aceptación con test (los otros ${String(criteria.reviewOnly.length)} son de revisión)`,
    );
    expect(block).toContain(`${String(vectors)} vectores de prueba`);
  });

  it('claims the full coverage only for the domain, as the configuration enforces it', () => {
    const config = read('vitest.config.ts');

    expect(config).toMatch(/include: \['packages\/domain\/src\/\*\*\/\*\.ts'\]/);
    expect(config).toMatch(/thresholds: \{ lines: 100, branches: 100, functions: 100, statements: 100 \}/);
    expect(block).toContain('cobertura del 100 % obligatoria en el dominio');
  });

  it('gives the checks, the Node versions and the systems of the CI', () => {
    const workflow = read(CI_FILE);
    const jobs = jobChecks(workflow);
    const onPullRequest = jobs.filter((job) => job.onPullRequest);
    const nodes = jobs.find((job) => job.id === 'quality')?.nodes ?? [];
    const systems = [
      ...new Set([...workflow.matchAll(/os: (ubuntu|windows|macos)-latest/g)].map(([, os]) => os)),
    ];

    // The same jobs the walkthrough reads; `publish` only runs on a push to `main`, so it is not a check of a PR.
    expect(jobs.map(({ id }) => id)).toEqual(workflowJobs(workflow).map(({ id }) => id));
    expect(jobs.find((job) => job.id === 'publish')?.onPullRequest).toBe(false);
    expect(onPullRequest.map(({ id }) => id)).toContain('audit');
    expect(block).toContain(
      `${String(onPullRequest.reduce((sum, job) => sum + job.checks, 0))} checks obligatorios`,
    );
    expect(block).toContain(`Node ${nodes.slice(0, -1).join(', ')} y ${nodes.at(-1) ?? ''}`);
    // The smoke of the README runs on Linux with every one of those versions too.
    expect(jobs.find((job) => job.id === 'smoke')?.nodes).toEqual(nodes);
    expect(systems.sort()).toEqual(['macos', 'ubuntu', 'windows']);
    expect(block).toContain('en Linux, Windows y macOS, y una auditoría de dependencias');
  });

  it('claims a CSP without unsafe-inline only because the nginx of the web sends one', () => {
    const csp =
      /Content-Security-Policy "([^"]*)"/.exec(read('apps/web/nginx/security-headers.conf'))?.[1] ?? '';

    expect(csp).toContain("style-src 'self'");
    expect(csp).not.toMatch(/unsafe-/);
    expect(block).toContain('una CSP estricta sin `unsafe-inline`');
  });
});
