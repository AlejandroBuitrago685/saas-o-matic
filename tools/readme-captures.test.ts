import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { REPO_ROOT } from './lint-fixture.js';

const CAPTURES = ['dashboard', 'simulador', 'movil-360'] as const;
/** The README is the first thing an evaluator opens: three pictures of this weight load at once. */
const MAX_BYTES = 150 * 1024;

describe('D-180 the screenshots of the README', () => {
  it.each(CAPTURES)('%s is a small WebP picture in docs/capturas', (name) => {
    const path = join(REPO_ROOT, 'docs', 'capturas', `${name}.webp`);

    expect(existsSync(path)).toBe(true);
    const bytes = readFileSync(path);
    expect(bytes.subarray(0, 4).toString('latin1')).toBe('RIFF');
    expect(bytes.subarray(8, 12).toString('latin1')).toBe('WEBP');
    expect(statSync(path).size).toBeLessThanOrEqual(MAX_BYTES);
  });

  it('are shown by the README, and `npm run capturas` regenerates them', () => {
    const readme = readFileSync(join(REPO_ROOT, 'README.md'), 'utf8');
    const rootPackage = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    for (const name of CAPTURES) expect(readme).toContain(`docs/capturas/${name}.webp`);
    expect(rootPackage.scripts['capturas']).toContain('test:capturas');
  });
});
