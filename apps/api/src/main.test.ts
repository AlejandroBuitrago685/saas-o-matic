import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const API_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('AC-55 the service refuses to start with an invalid configuration', () => {
  // A cold start of tsx can take seconds on Windows or CI: well above the 5 s default.
  it(
    'exits with a non-zero code and names the variable, before listening (real process)',
    { timeout: 30_000 },
    () => {
      const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/main.ts'], {
        cwd: API_ROOT,
        // eslint-disable-next-line no-restricted-properties -- AC-55: the child process needs this environment.
        env: { ...process.env, PORT: 'not-a-port', LOG_LEVEL: 'info' },
        encoding: 'utf8',
        timeout: 30_000,
      });
      const output = `${result.stdout}${result.stderr}`;

      expect(result.status).toBe(1);
      expect(output).toContain('Invalid environment configuration -> PORT');
      expect(output).not.toContain('Server listening');
    },
  );
});
