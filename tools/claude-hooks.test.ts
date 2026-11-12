import { spawnSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { decidePreTool } from '../scripts/claude-hooks/pre-tool.mjs';
import { shouldLint } from '../scripts/claude-hooks/post-edit.mjs';
import { shouldVerify } from '../scripts/claude-hooks/stop.mjs';
import { REPO_ROOT } from './lint-fixture.js';

const existing = (): boolean => true;
const missing = (): boolean => false;

function runHook(script: string, event: object): { status: number | null; stderr: string } {
  const result = spawnSync('node', [`scripts/claude-hooks/${script}`], {
    cwd: REPO_ROOT,
    input: JSON.stringify(event),
    encoding: 'utf8',
  });
  return { status: result.status, stderr: result.stderr };
}

describe('D-80 / D-85 PreToolUse hook: files', () => {
  it('blocks editing an applied migration but allows creating a new one', () => {
    const event = { tool_name: 'Write', tool_input: { file_path: 'apps/api/drizzle/0000_init.sql' } };

    expect(decidePreTool(event, existing).block).toBe(true);
    expect(decidePreTool(event, missing).block).toBe(false);
  });

  it.each([
    ['Read', '.env'],
    ['Read', 'apps/api/.env'],
    ['Edit', 'apps/api/.env.local'],
    ['Write', '.env.production'],
  ])('blocks %s of %s (RNF-SEC-12)', (tool, path) => {
    expect(decidePreTool({ tool_name: tool, tool_input: { file_path: path } }, missing).block).toBe(true);
  });

  it('allows the committed example environment file', () => {
    expect(
      decidePreTool({ tool_name: 'Read', tool_input: { file_path: '.env.example' } }, existing).block,
    ).toBe(false);
  });

  it.each([
    ['Grep', { path: 'apps/api/.env' }],
    ['Grep', { path: '.', glob: '.env*' }],
    ['Grep', { glob: '*.env' }],
    ['Read', { file_path: '.ENV' }],
    ['Read', { file_path: 'apps\\api\\.Env.local' }],
    ['NotebookEdit', { notebook_path: '.env' }],
  ])('blocks %s with %o: paths, globs and any case (RNF-SEC-12)', (tool, input) => {
    expect(decidePreTool({ tool_name: tool, tool_input: input }, missing).block).toBe(true);
  });

  it.each([
    ['Grep', { path: 'apps/api/src', glob: '*.ts' }],
    ['Read', { file_path: '.ENV.EXAMPLE' }],
    ['Read', { file_path: 'apps/api/.envrc-notes.md' }],
  ])('allows %s with %o', (tool, input) => {
    expect(decidePreTool({ tool_name: tool, tool_input: input }, existing).block).toBe(false);
  });

  it('blocks editing committed migration metadata too', () => {
    const event = { tool_name: 'Edit', tool_input: { file_path: 'apps/api/drizzle/meta/_journal.json' } };

    expect(decidePreTool(event, existing).block).toBe(true);
  });

  it('exits with code 2 and explains why when it blocks (real process, JSON on stdin)', () => {
    const result = runHook('pre-tool.mjs', {
      tool_name: 'Bash',
      tool_input: { command: 'npx drizzle-kit push' },
    });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('drizzle-kit push');
  });

  it('exits with code 0 when the action is allowed', () => {
    expect(runHook('pre-tool.mjs', { tool_name: 'Bash', tool_input: { command: 'git status' } }).status).toBe(
      0,
    );
  });
});

describe('D-80 PostToolUse hook lints only the edited file', () => {
  it('only lints source files outside generated folders', () => {
    expect(shouldLint('apps/api/src/app.ts')).toBe(true);
    expect(shouldLint('apps/web/src/app/app.html')).toBe(true);
    expect(shouldLint('README.md')).toBe(false);
    expect(shouldLint('apps/web/dist/web/browser/main.js')).toBe(false);
  });

  it('reports lint errors of the edited file with exit code 2', () => {
    const relativePath = 'packages/domain/src/__lint_fixture__hook.ts';
    writeFileSync(join(REPO_ROOT, relativePath), 'export const value: any = 1;\n', 'utf8');
    try {
      const result = runHook('post-edit.mjs', {
        tool_name: 'Write',
        tool_input: { file_path: relativePath },
      });

      expect(result.status).toBe(2);
      expect(result.stderr).toContain('no-explicit-any');
    } finally {
      rmSync(join(REPO_ROOT, relativePath), { force: true });
    }
  });

  it('lets a non-source file through without linting', () => {
    expect(
      runHook('post-edit.mjs', { tool_name: 'Write', tool_input: { file_path: 'README.md' } }).status,
    ).toBe(0);
  });
});

describe('D-80 Stop hook', () => {
  it('does not verify again when Claude is already continuing because of this hook', () => {
    expect(shouldVerify({ stop_hook_active: true })).toBe(false);
    expect(shouldVerify({})).toBe(true);
  });

  it('exits immediately with code 0 when stop_hook_active is set', () => {
    expect(runHook('stop.mjs', { stop_hook_active: true }).status).toBe(0);
  });
});
