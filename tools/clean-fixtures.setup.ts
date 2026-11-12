import { rmSync } from 'node:fs';
import { basename, join } from 'node:path';

import { gitLines, REPO_ROOT } from '../scripts/lib/repo.mjs';

const FIXTURE = /^__(lint|cycle)_fixture__/;

/**
 * Vitest global setup (D-86): removes the temporary files an interrupted run left behind. They are ignored
 * by git, so nothing else would notice them, but they break `tsc` and the lint of their workspace.
 */
export default function removeStaleFixtures(): void {
  const ignored = gitLines(['ls-files', '--others', '--ignored', '--exclude-standard', '--directory']);
  for (const path of ignored.filter((candidate) => FIXTURE.test(basename(candidate)))) {
    rmSync(join(REPO_ROOT, path), { recursive: true, force: true });
  }
}
