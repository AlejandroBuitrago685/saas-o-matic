// @ts-check
/**
 * Starts or stops the Docker Compose stack of the e2e tests (D-133): docker-compose.yml plus docker-compose.e2e.yml, as
 * its own project with its own data volume. `up` always starts from an empty database, so the synthetic customers of a
 * previous run never collide with the new ones, and waits until both services are healthy.
 * It cannot run at the same time as the normal stack: both use the fixed subnet of D-130 and port 8080.
 * Usage: node scripts/e2e-stack.mjs up | down
 */
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import { REPO_ROOT } from './lib/repo.mjs';

export const E2E_PROJECT = 'saas-o-matic-e2e';

/** Arguments of `docker compose` shared by every command on the e2e stack. */
export const COMPOSE_ARGS = [
  'compose',
  '-p',
  E2E_PROJECT,
  '-f',
  'docker-compose.yml',
  '-f',
  'docker-compose.e2e.yml',
];

/** @type {Readonly<Record<string, readonly (readonly string[])[]>>} */
export const COMMANDS = {
  up: [
    ['down', '--volumes', '--remove-orphans'],
    ['up', '--build', '--wait'],
  ],
  down: [['down', '--volumes', '--remove-orphans']],
};

/** @param {readonly string[]} args */
function compose(args) {
  const result = spawnSync('docker', [...COMPOSE_ARGS, ...args], { cwd: REPO_ROOT, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function main() {
  const steps = COMMANDS[process.argv[2] ?? ''];
  if (steps === undefined) {
    process.stderr.write('Usage: node scripts/e2e-stack.mjs up | down\n');
    process.exit(2);
  }
  steps.forEach(compose);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
