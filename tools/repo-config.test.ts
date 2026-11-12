import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

import { REPO_ROOT } from './lint-fixture.js';

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(REPO_ROOT, path), 'utf8')) as Record<string, unknown>;
}

function npx(args: readonly string[]): { status: number | null; output: string } {
  const result = spawnSync('npx', args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

describe('AC-98 Node versions for the evaluator machine (D-37, D-38)', () => {
  it('declares the Node range Angular supports and pins TypeScript 6.0.3 (D-67)', () => {
    const rootPackage = readJson('package.json');

    expect(rootPackage['engines']).toEqual({ node: '^22.22.3 || ^24.15.0 || >=26.0.0' });
    expect((rootPackage['devDependencies'] as Record<string, string>)['typescript']).toBe('6.0.3');
  });

  it('recommends the active LTS in .nvmrc', () => {
    expect(readFileSync(join(REPO_ROOT, '.nvmrc'), 'utf8').trim()).toBe('26');
  });
});

describe('D-81 / D-85 Claude Code permissions', () => {
  const permissions = readJson('.claude/settings.json')['permissions'] as Record<string, string[]>;

  it('always asks before pushing, installing a package or merging a PR', () => {
    expect(permissions['ask']).toEqual(
      expect.arrayContaining([
        'Bash(git push)',
        'Bash(git push *)',
        'Bash(npm install *)',
        'Bash(npm i *)',
        'Bash(npm add *)',
        'Bash(gh pr merge)',
        'Bash(gh pr merge *)',
      ]),
    );
    expect(permissions['allow']).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/^Bash\((git push|npm (install|i|add) |gh pr merge)/)]),
    );
  });

  it('only allows reinstalling the locked dependencies without asking', () => {
    const npmInstalls = (permissions['allow'] ?? []).filter((rule) =>
      /^Bash\(npm (ci|install|i)\b/.test(rule),
    );

    expect(npmInstalls.sort()).toEqual(['Bash(npm ci *)', 'Bash(npm ci)', 'Bash(npm install)']);
  });

  it('denies reading and editing .env files (RNF-SEC-12)', () => {
    expect(permissions['deny']).toEqual(expect.arrayContaining(['Read(**/.env)', 'Edit(**/.env)']));
  });
});

describe('D-101 slow sweeps run in CI and verify, never in npm test (pre-push) nor in the Stop hook', () => {
  interface VitestConfig {
    readonly default: { readonly test?: { readonly projects?: unknown[]; readonly name?: unknown } };
  }
  const loadConfig = (file: string): Promise<VitestConfig> =>
    import(pathToFileURL(join(REPO_ROOT, file)).href) as Promise<VitestConfig>;

  /** Names of the projects of the root Vitest config, read from each project's own config file. */
  async function rootProjectNames(): Promise<string[]> {
    const root = await loadConfig('vitest.config.ts');
    const paths = (root.default.test?.projects ?? []).filter(
      (path): path is string => typeof path === 'string',
    );
    const configs = await Promise.all(
      paths.map((path) => loadConfig(path.endsWith('.ts') ? path : `${path}/vitest.config.ts`)),
    );
    return configs.map((config) => String(config.default.test?.name));
  }

  /** Every `vitest run` command of a workflow or script, with its options. */
  const vitestRuns = (text: string): string[] =>
    [...text.matchAll(/vitest run[^\n&]*/g)].map((match) => match[0]);

  it('the root config has the domain-slow project, and CI and verify run every project (no --project)', async () => {
    const scripts = readJson('package.json')['scripts'] as Record<string, string>;
    const ciRuns = vitestRuns(readFileSync(join(REPO_ROOT, '.github/workflows/ci.yml'), 'utf8'));
    const verifyRuns = vitestRuns(scripts['verify'] ?? '');

    expect(await rootProjectNames()).toContain('domain-slow');
    expect(ciRuns.length).toBeGreaterThan(0);
    expect(verifyRuns.length).toBeGreaterThan(0);
    expect([...ciRuns, ...verifyRuns].filter((run) => run.includes('--project'))).toEqual([]);
  });

  it('npm test runs exactly the root projects except domain-slow, so a new project is never left out', async () => {
    const testScript = (readJson('package.json')['scripts'] as Record<string, string>)['test'] ?? '';
    const selected = [...testScript.matchAll(/--project (\S+)/g)].map((match) => match[1]);

    expect(selected.sort()).toEqual(
      (await rootProjectNames()).filter((name) => name !== 'domain-slow').sort(),
    );
  });

  it('npm test and verify:changed select their projects and leave domain-slow out', async () => {
    const { verificationSteps } = await import('../scripts/verify-changed.mjs');
    const { parallel, afterwards } = verificationSteps(
      ['domain', 'tools'],
      ['packages/domain/src/x.ts'],
      true,
    );
    const commands = [...parallel, ...afterwards].map((step) => step.cmd.join(' '));
    const testScript = (readJson('package.json')['scripts'] as Record<string, string>)['test'] ?? '';

    expect(testScript).toContain('--project domain ');
    expect(testScript).not.toContain('domain-slow');
    expect(commands.filter((command) => command.includes('vitest'))).not.toEqual([]);
    expect(commands.every((command) => !command.includes('vitest') || command.includes('--project'))).toBe(
      true,
    );
    expect(commands.join(' ')).not.toContain('domain-slow');
  });
});

describe('D-77 packages are only imported through their index (package.json `exports`)', () => {
  it('fails to compile a deep import into a workspace package', () => {
    // The target exists, so TS2307 comes from `exports` and not from a missing build.
    expect(existsSync(join(REPO_ROOT, 'packages/domain/dist/shared/result.js'))).toBe(true);
    // Own folder and tsconfig: a parallel `tsc -p apps/api` (Stop hook) never sees this broken file.
    const directory = join(REPO_ROOT, '__lint_fixture__deep-import');
    mkdirSync(directory, { recursive: true });
    writeFileSync(
      join(directory, 'tsconfig.json'),
      JSON.stringify({
        extends: '../tsconfig.base.json',
        compilerOptions: { noEmit: true },
        files: ['x.ts'],
      }),
    );
    writeFileSync(
      join(directory, 'x.ts'),
      "import { ok } from '@saas-o-matic/domain/dist/shared/result.js';\nexport const v = ok(1);\n",
    );
    try {
      expect(npx(['tsc', '-p', directory]).output).toMatch(/x\.ts\(1,\d+\): error TS2307/);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

describe('D-66 dependency-cruiser forbids cycles', () => {
  it('fails on a circular import', () => {
    const directory = join(REPO_ROOT, 'packages/domain/src/__cycle_fixture__');
    mkdirSync(directory, { recursive: true });
    writeFileSync(
      join(directory, 'a.ts'),
      "import { b } from './b.js';\nexport const a = (): number => b() + 1;\n",
    );
    writeFileSync(
      join(directory, 'b.ts'),
      "import { a } from './a.js';\nexport const b = (): number => a() - 1;\n",
    );
    try {
      const result = npx(['depcruise', 'packages/domain/src', '--config', '.dependency-cruiser.cjs']);

      expect(result.status).not.toBe(0);
      expect(result.output).toContain('no-circular');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
