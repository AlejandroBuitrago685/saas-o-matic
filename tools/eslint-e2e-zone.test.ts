import { describe, expect, it } from 'vitest';

import { lintFixture, ruleIds } from './lint-fixture.js';

const F = '__lint_fixture__';
const RESTRICTED = '@typescript-eslint/no-restricted-imports';

describe('D-68 the e2e tests are black-box: Playwright and the types of the contract only (02-monorepo §2)', () => {
  it('accepts type-only imports from @saas-o-matic/contract', async () => {
    const code =
      "import type { HealthResponse } from '@saas-o-matic/contract';\nexport type Health = HealthResponse;\n";

    expect(await lintFixture(`e2e/fixtures/${F}contract-type.ts`, code)).toEqual([]);
  });

  it.each([
    [
      'a value of the contract',
      "import { healthResponseSchema } from '@saas-o-matic/contract';\nexport const s = healthResponseSchema;\n",
    ],
    ['the domain', "import { PLANS } from '@saas-o-matic/domain';\nexport const plans = PLANS;\n"],
    ['zod', "import { z } from 'zod';\nexport const schema = z.string();\n"],
    [
      'code of an app by path',
      "import { buildApp } from '../../apps/api/src/app.js';\nexport const build = buildApp;\n",
    ],
  ])('rejects importing %s', async (_case, code) => {
    const findings = await lintFixture(`e2e/fixtures/${F}import.ts`, code);

    expect(ruleIds(findings)).toContain(RESTRICTED);
  });
});
