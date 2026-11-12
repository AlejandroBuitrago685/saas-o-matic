// @ts-check
/**
 * Local development: builds the shared packages once, then runs in parallel the package watcher,
 * the API (tsx watch, :3000) and the web app (ng serve, :4200, proxying /api → :3000; ADR-012).
 * No extra dependency: plain child processes. Ctrl+C stops everything.
 * Usage: npm run dev
 */
import { spawn } from 'node:child_process';

import { REPO_ROOT, run } from './lib/repo.mjs';

const PROCESSES = [
  {
    name: 'packages',
    cmd: 'npx',
    args: [
      'tsc',
      '-b',
      '-w',
      '--preserveWatchOutput',
      'packages/domain/tsconfig.build.json',
      'packages/contract/tsconfig.build.json',
    ],
  },
  { name: 'api', cmd: 'npm', args: ['run', 'dev', '-w', '@saas-o-matic/api'] },
  { name: 'web', cmd: 'npm', args: ['run', 'dev', '-w', '@saas-o-matic/web'] },
];

function main() {
  const initialBuild = run('npm', ['run', 'build:packages']);
  if (initialBuild.code !== 0) {
    process.stderr.write(initialBuild.output);
    process.exit(1);
  }
  const children = PROCESSES.map(({ name, cmd, args }) => {
    const child = spawn(cmd, args, {
      cwd: REPO_ROOT,
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    /** @param {Buffer | string} chunk */
    const prefix = (chunk) => String(chunk).replace(/^(?=.)/gm, `[${name}] `);
    child.stdout.on('data', (chunk) => process.stdout.write(prefix(chunk)));
    child.stderr.on('data', (chunk) => process.stderr.write(prefix(chunk)));
    return child;
  });
  const stopAll = () => {
    children.forEach((child) => child.kill());
    process.exit(0);
  };
  process.once('SIGINT', stopAll);
  process.once('SIGTERM', stopAll);
}

main();
