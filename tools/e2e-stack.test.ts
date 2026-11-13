import { describe, expect, it } from 'vitest';

import { COMMANDS, COMPOSE_ARGS, E2E_PROJECT } from '../scripts/e2e-stack.mjs';

describe('D-133 the e2e stack is the Compose stack with the e2e override, in a project of its own', () => {
  it('uses docker-compose.yml plus docker-compose.e2e.yml under its own project name', () => {
    expect(COMPOSE_ARGS).toEqual([
      'compose',
      '-p',
      E2E_PROJECT,
      '-f',
      'docker-compose.yml',
      '-f',
      'docker-compose.e2e.yml',
    ]);
    expect(E2E_PROJECT).not.toBe('saas-o-matic');
  });

  it('starts from an empty database every time and waits until both services are healthy', () => {
    expect(COMMANDS['up']).toEqual([
      ['down', '--volumes', '--remove-orphans'],
      ['up', '--build', '--wait'],
    ]);
    expect(COMMANDS['down']).toEqual([['down', '--volumes', '--remove-orphans']]);
  });
});
