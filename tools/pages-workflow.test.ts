import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { workflowJobs } from '../scripts/recorrido/sources/quality.mjs';
import { REPO_ROOT } from './lint-fixture.js';

const PAGES = readFileSync(join(REPO_ROOT, '.github/workflows/pages.yml'), 'utf8');
const CI = readFileSync(join(REPO_ROOT, '.github/workflows/ci.yml'), 'utf8');
const triggers = PAGES.slice(PAGES.indexOf('\non:'), PAGES.indexOf('\npermissions:'));
const jobChunk = (id: string): string =>
  PAGES.slice(PAGES.indexOf(`\n  ${id}:`) + 1).split(/\n(?= {2}[a-z])/)[0] ?? '';

describe('D-185 the walkthrough is published from main only, after a green CI', () => {
  it('runs when the CI of main completes, or by hand, and never on a pull request or a push', () => {
    expect(triggers).toContain(
      'workflow_run:\n    workflows: [CI]\n    types: [completed]\n    branches: [main]',
    );
    expect(triggers).toContain('workflow_dispatch:');
    expect(triggers).not.toMatch(/pull_request|push:/);
    expect(jobChunk('build')).toContain("github.event.workflow_run.conclusion == 'success'");
    expect(jobChunk('build')).toContain("github.event.workflow_run.event == 'push'");
    expect(jobChunk('build')).toContain("github.ref == 'refs/heads/main'");
    expect(CI).toMatch(/^name: CI$/m);
  });

  it('publishes the commit the CI tested, after checking the page against the repository', () => {
    const build = jobChunk('build');

    expect(build).toContain('ref: ${{ github.event.workflow_run.head_sha || github.sha }}');
    expect(build).toContain('run: npm run recorrido');
    expect(build).toContain('git status --porcelain -- docs');
    expect(build).toMatch(/upload-pages-artifact@[0-9a-f]{40} # v[\d.]+\n {8}with:\n {10}path: docs/);
  });

  it('gives write permissions only to the deploy job, and reads the repository with read-only credentials', () => {
    expect(PAGES).toMatch(/^permissions:\n {2}contents: read$/m);
    expect(jobChunk('build')).not.toContain('pages: write');
    expect(jobChunk('deploy')).toContain('permissions:\n      pages: write\n      id-token: write');
    expect(jobChunk('build')).toContain('persist-credentials: false');
  });

  it('pins every action to a commit, with its version in a comment (D-79)', () => {
    const uses = [...PAGES.matchAll(/uses: (\S+)(.*)$/gm)].map(
      ([, action = '', comment = '']) => `${action}${comment}`,
    );

    expect(uses.length).toBe(5);
    for (const use of uses) expect(use).toMatch(/^[\w-]+\/[\w-]+@[0-9a-f]{40} # v\d+\.\d+\.\d+$/);
    expect(workflowJobs(PAGES).map(({ id }) => id)).toEqual(['build', 'deploy']);
  });
});
