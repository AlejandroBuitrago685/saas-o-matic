// @ts-check
/**
 * Fast verification of what changed since HEAD: format and lint of the changed files, the repository checks,
 * and typecheck and tests of the affected workspaces only. Never builds the apps. Used by the Claude Code
 * Stop hook (D-80). Usage: node scripts/verify-changed.mjs
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { gitLines, REPO_ROOT, run, runAsync } from './lib/repo.mjs';

const LINTABLE = /\.(ts|js|mjs|cjs|html)$/;
/** Root configuration (package.json, lockfile, tsconfig.base.json, eslint.config.js…) affects every workspace. */
const ROOT_CONFIG = /^[^/]+\.(json|js|cjs|mjs|ts)$/;
/** Changes after which any file can turn red: format and lint the whole repository again. */
const STYLE_CONFIG = /^([^/]+\.(json|js|cjs|mjs|ts)|\.prettierignore|tools\/eslint\/.+)$/;
/** Configuration without a workspace of its own; the tools tests check it (D-81, D-85, AC-98). */
const TOOLS_CONFIG = ['scripts/', '.claude/', '.github/', '.nvmrc', '.npmrc', '.gitignore', 'lefthook.yml'];

/** Workspaces, what they depend on (dependents must be re-checked), and how to typecheck and test them. */
const AREAS = [
  { name: 'domain', prefix: 'packages/domain/', typecheck: [['npx', 'tsc', '-p', 'packages/domain']] },
  { name: 'contract', prefix: 'packages/contract/', typecheck: [['npx', 'tsc', '-p', 'packages/contract']] },
  { name: 'api', prefix: 'apps/api/', typecheck: [['npx', 'tsc', '-p', 'apps/api']] },
  { name: 'tools', prefix: 'tools/', alsoPrefixes: TOOLS_CONFIG, typecheck: [['npx', 'tsc', '-p', 'tools']] },
  {
    name: 'web',
    prefix: 'apps/web/',
    typecheck: [['npm', 'run', 'typecheck', '-w', '@saas-o-matic/web']],
    test: ['npm', 'run', 'test', '-w', '@saas-o-matic/web'],
  },
  // Types only: the e2e tests need the Docker Compose stack or the dev servers (D-68), so they never run here.
  { name: 'e2e', prefix: 'e2e/', typecheck: [['npx', 'tsc', '-p', 'e2e']] },
];
const ALL_AREAS = AREAS.map((area) => area.name);
/** Areas whose tests are not Vitest projects of the root configuration. */
const NOT_NODE_PROJECTS = ['web', 'tools', 'e2e'];
/** @type {Readonly<Record<string, readonly string[]>>} */
const DEPENDENTS = { domain: ['contract', 'api', 'web', 'e2e'], contract: ['api', 'web', 'e2e'] };

/**
 * @param {readonly string[]} changedPaths changed, added or deleted paths
 * @returns {string[]} names of the affected areas, dependents included
 */
export function affectedAreas(changedPaths) {
  if (changedPaths.some((path) => ROOT_CONFIG.test(path))) return ALL_AREAS;
  const direct = AREAS.filter((area) =>
    changedPaths.some((path) => [area.prefix, ...(area.alsoPrefixes ?? [])].some((p) => path.startsWith(p))),
  ).map((area) => area.name);
  const withDependents = direct.flatMap((name) => [name, ...(DEPENDENTS[name] ?? [])]);
  return ALL_AREAS.filter((name) => withDependents.includes(name));
}

/** Changed, added and deleted paths since HEAD (deleted files still decide which areas are affected). */
function changedPaths() {
  const modified = gitLines(['diff', '--name-only', '--no-renames', 'HEAD']);
  const untracked = gitLines(['ls-files', '--others', '--exclude-standard']);
  return [...new Set([...modified, ...untracked])];
}

/**
 * @param {readonly string[]} changedPaths
 * @returns {boolean} whether the lint or format configuration changed (D-86)
 */
export function needsWholeRepoChecks(changedPaths) {
  return changedPaths.some((path) => STYLE_CONFIG.test(path));
}

/**
 * Format, lint and repository checks: of the given files, or of everything after a configuration change.
 * @param {readonly string[]} existingFiles
 * @param {boolean} wholeRepo
 * @returns {{ label: string, cmd: string[] }[]}
 */
function fileSteps(existingFiles, wholeRepo) {
  const checks = [
    { label: 'check-filenames', cmd: ['node', 'scripts/check-filenames.mjs'] },
    { label: 'check-forbidden-patterns', cmd: ['node', 'scripts/check-forbidden-patterns.mjs'] },
  ];
  if (wholeRepo) {
    return [
      { label: 'format (all)', cmd: ['npx', 'prettier', '--check', '.'] },
      { label: 'lint (all)', cmd: ['npx', 'eslint', '.', '--max-warnings=0'] },
      ...checks,
    ];
  }
  if (existingFiles.length === 0) return [];
  const lintFiles = existingFiles.filter((path) => LINTABLE.test(path));
  return [
    { label: 'format', cmd: ['npx', 'prettier', '--check', '--ignore-unknown', ...existingFiles] },
    ...(lintFiles.length > 0
      ? [{ label: 'lint', cmd: ['npx', 'eslint', '--max-warnings=0', '--no-warn-ignored', ...lintFiles] }]
      : []),
    ...checks,
  ];
}

/**
 * The checks to run, in two stages. The tools tests write temporary fixtures inside the workspaces, so they
 * run after the typechecks, never at the same time.
 * @param {readonly string[]} areas
 * @param {readonly string[]} existingFiles changed files that still exist
 * @param {boolean} [wholeRepo] format and lint everything (see needsWholeRepoChecks)
 * @returns {{ parallel: { label: string, cmd: string[] }[], afterwards: { label: string, cmd: string[] }[] }}
 */
export function verificationSteps(areas, existingFiles, wholeRepo = false) {
  const selected = AREAS.filter((area) => areas.includes(area.name));
  const nodeProjects = selected.filter((area) => !NOT_NODE_PROJECTS.includes(area.name)).map((a) => a.name);
  return {
    parallel: [
      ...fileSteps(existingFiles, wholeRepo),
      ...selected.flatMap((area) => area.typecheck.map((cmd) => ({ label: `typecheck ${area.name}`, cmd }))),
      ...(nodeProjects.length > 0
        ? [
            {
              label: 'tests',
              cmd: ['npx', 'vitest', 'run', ...nodeProjects.flatMap((p) => ['--project', p])],
            },
          ]
        : []),
      ...selected.flatMap((area) => (area.test ? [{ label: `tests ${area.name}`, cmd: area.test }] : [])),
    ],
    afterwards: areas.includes('tools')
      ? [{ label: 'tests tools', cmd: ['npx', 'vitest', 'run', '--project', 'tools'] }]
      : [],
  };
}

/** @param {{ label: string, code: number, ms: number }} result */
function report({ label, code, ms }) {
  process.stdout.write(`verify:changed: ${label} ${code === 0 ? 'OK' : 'FAILED'} (${String(ms)} ms)\n`);
}

/**
 * Runs the steps at the same time and stops the script if any of them fails.
 * @param {{ label: string, cmd: string[] }[]} steps
 */
async function runStage(steps) {
  const results = await Promise.all(
    steps.map(async ({ label, cmd }) => ({ label, ...(await runAsync(cmd[0] ?? 'npx', cmd.slice(1))) })),
  );
  results.forEach(report);
  const failed = results.filter((result) => result.code !== 0);
  if (failed.length > 0) fail(failed.map((result) => `--- ${result.label}\n${result.output}`).join('\n'));
}

async function main() {
  const started = Date.now();
  const changed = changedPaths();
  const areas = affectedAreas(changed);
  const existing = changed.filter((path) => existsSync(join(REPO_ROOT, path)));
  const { parallel, afterwards } = verificationSteps(areas, existing, needsWholeRepoChecks(changed));
  if (parallel.length + afterwards.length === 0) {
    process.stdout.write('verify:changed: nothing to verify\n');
    return;
  }
  if (areas.some((area) => area !== 'tools')) {
    const build = run('npm', ['run', 'build:packages']);
    report({ label: 'build:packages', ...build });
    if (build.code !== 0) fail(build.output);
  }
  await runStage(parallel);
  await runStage(afterwards);
  process.stdout.write(`verify:changed: all green in ${String(Date.now() - started)} ms\n`);
}

/**
 * @param {string} output
 * @returns {never}
 */
function fail(output) {
  process.stderr.write(output.split('\n').slice(-40).join('\n'));
  process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
