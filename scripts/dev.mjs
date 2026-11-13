// @ts-check
/**
 * Local development: builds the shared packages once, then runs in parallel the package watcher,
 * the API (tsx watch, :3000) and the web app (ng serve, :4200, proxying /api → :3000; ADR-012).
 * No extra dependency: plain child processes. Ctrl+C stops everything.
 * The API always gets PORT=3000, the target of apps/web/proxy.conf.json: a PORT inherited from the shell (or set
 * by a preview tool for the web server) must not move the API, or the proxy would point at nothing (P5 regression).
 * Usage: npm run dev
 */
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import { REPO_ROOT, run } from './lib/repo.mjs';

/** Port the dev proxy forwards `/api` to (apps/web/proxy.conf.json). */
export const API_DEV_PORT = '3000';

/** @type {readonly { name: string, cmd: string, args: string[], env?: Record<string, string> }[]} */
export const PROCESSES = [
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
  { name: 'api', cmd: 'npm', args: ['run', 'dev', '-w', '@saas-o-matic/api'], env: { PORT: API_DEV_PORT } },
  { name: 'web', cmd: 'npm', args: ['run', 'dev', '-w', '@saas-o-matic/web'] },
];

function main() {
  const initialBuild = run('npm', ['run', 'build:packages']);
  if (initialBuild.code !== 0) {
    process.stderr.write(initialBuild.output);
    process.exit(1);
  }
  const children = PROCESSES.map(({ name, cmd, args, env }) => {
    const child = spawn(cmd, args, {
      cwd: REPO_ROOT,
      env: { ...process.env, ...env },
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

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
