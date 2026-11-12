import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { lintFixture, REPO_ROOT, ruleIds, withTemporaryFile, type LintFinding } from './lint-fixture.js';

const F = '__lint_fixture__';

describe('ADR-002 the web app only takes types from the contract and never bundles Zod', () => {
  it('rejects importing zod', async () => {
    const code = "import { z } from 'zod';\nexport const schema = z.string();\n";
    const findings = await lintFixture(`apps/web/src/app/${F}zod.ts`, code);

    expect(ruleIds(findings)).toContain('@typescript-eslint/no-restricted-imports');
  });

  it('rejects zod subpaths such as zod/mini', async () => {
    const code = "import { z } from 'zod/mini';\nexport const schema = z.string();\n";
    const findings = await lintFixture(`apps/web/src/app/${F}zod-mini.ts`, code);

    expect(ruleIds(findings)).toContain('@typescript-eslint/no-restricted-imports');
  });

  it('rejects value imports from @saas-o-matic/contract', async () => {
    const code =
      "import { healthResponseSchema } from '@saas-o-matic/contract';\nexport const s = healthResponseSchema;\n";
    const findings = await lintFixture(`apps/web/src/app/${F}contract-value.ts`, code);

    expect(ruleIds(findings)).toContain('@typescript-eslint/no-restricted-imports');
  });

  it('accepts type-only imports from @saas-o-matic/contract', async () => {
    const code =
      "import type { HealthResponse } from '@saas-o-matic/contract';\nexport type Health = HealthResponse;\n";
    const findings = await lintFixture(`apps/web/src/app/${F}contract-type.ts`, code);

    expect(findings).toEqual([]);
  });
});

describe('RNF-SEC-14 / ADR-011 forbidden patterns in the web app', () => {
  it('rejects bypassSecurityTrust*', async () => {
    const code = [
      "import type { DomSanitizer, SafeHtml } from '@angular/platform-browser';",
      'export function trust(sanitizer: DomSanitizer, html: string): SafeHtml {',
      '  return sanitizer.bypassSecurityTrustHtml(html);',
      '}',
      '',
    ].join('\n');
    const findings = await lintFixture(`apps/web/src/app/${F}bypass.ts`, code);

    expect(ruleIds(findings)).toContain('no-restricted-syntax');
  });

  it('rejects component styles (they would need unsafe-inline in the CSP)', async () => {
    const code = [
      "import { ChangeDetectionStrategy, Component } from '@angular/core';",
      '@Component({',
      "  selector: 'app-styled',",
      "  template: '<p>x</p>',",
      "  styles: ['p { color: red; }'],",
      '  changeDetection: ChangeDetectionStrategy.OnPush,',
      '})',
      'export class Styled {}',
      '',
    ].join('\n');
    const findings = await lintFixture(`apps/web/src/app/${F}styled.ts`, code);

    expect(ruleIds(findings)).toContain('no-restricted-syntax');
  });

  it('rejects static inline styles in templates but allows [style.x] bindings (CSSOM)', async () => {
    const inline = await lintFixture(`apps/web/src/app/${F}inline.html`, '<p style="color: red">x</p>\n');
    const bound = await lintFixture(`apps/web/src/app/${F}bound.html`, '<p [style.width.%]="50">x</p>\n');

    expect(ruleIds(inline)).toContain('@angular-eslint/template/no-inline-styles');
    expect(ruleIds(bound)).not.toContain(null); // null = fatal parse error: the file was not linted
    expect(ruleIds(bound)).not.toContain('@angular-eslint/template/no-inline-styles');
  });

  it('rejects one feature importing another (boundaries)', async () => {
    const findings = await lintFeatureImport('dashboard', 'customer-create');

    expect(ruleIds(findings)).toContain('boundaries/dependencies');
  });

  it('allows the one declared cross-feature dependency: customer-detail → simulator', async () => {
    const findings = await lintFeatureImport('customer-detail', 'simulator');

    expect(ruleIds(findings)).not.toContain(null); // null = fatal parse error: the file was not linted
    expect(ruleIds(findings)).not.toContain('boundaries/dependencies');
  });

  it('never deletes existing feature folders (regression of the P0 review)', async () => {
    const sentinel = `apps/web/src/app/features/dashboard/${F}sentinel.ts`;
    await withTemporaryFile(sentinel, 'export const kept = true;\n', async () => {
      await lintFeatureImport('dashboard', 'customer-create');

      expect(existsSync(join(REPO_ROOT, sentinel))).toBe(true);
    });
  });
});

describe('ADR-010 / D-83 API layers and configuration access', () => {
  it('rejects Drizzle inside a use case', async () => {
    const code = "import { sql } from 'drizzle-orm';\nexport const query = sql;\n";
    const findings = await lintFixture(`apps/api/src/modules/health/${F}x.use-case.ts`, code);

    expect(ruleIds(findings)).toContain('@typescript-eslint/no-restricted-imports');
  });

  it('rejects Fastify inside a repository', async () => {
    const code = "import Fastify from 'fastify';\nexport const server = Fastify;\n";
    const findings = await lintFixture(`apps/api/src/modules/health/${F}x.repository.ts`, code);

    expect(ruleIds(findings)).toContain('@typescript-eslint/no-restricted-imports');
  });

  it.each([
    [`apps/api/src/modules/health/${F}x.routes.ts`, '../../db/schema/index.js'],
    [`apps/api/src/modules/health/${F}x.use-case.ts`, '../../db/schema/index.js'],
    [`apps/api/src/http/${F}x.ts`, '../db/schema/index.js'],
    [`apps/api/src/shared/${F}x.ts`, '../db/schema/index.js'],
  ])(
    'rejects %s importing the database (%s): only repositories and the composition root',
    async (path, from) => {
      const findings = await lintFixture(path, `export * from '${from}';\n`);

      expect(ruleIds(findings)).toContain('@typescript-eslint/no-restricted-imports');
    },
  );

  it.each([
    [`apps/api/src/modules/health/${F}x.repository.ts`, '../../db/schema/index.js'],
    [`apps/api/src/db/${F}x.ts`, './schema/index.js'],
  ])('allows %s to import the database', async (path, from) => {
    const findings = await lintFixture(path, `export * from '${from}';\n`);

    expect(ruleIds(findings)).not.toContain(null); // null = fatal parse error: the file was not linted
    expect(ruleIds(findings)).not.toContain('@typescript-eslint/no-restricted-imports');
  });

  it.each([
    [`apps/api/src/shared/${F}x.ts`, '../../../../packages/domain/src/index.js'],
    [`apps/web/src/app/${F}x.ts`, '../../../../packages/domain/src/index.js'],
  ])(
    'rejects %s reaching into a package by relative path (packages only via index.ts)',
    async (path, from) => {
      const findings = await lintFixture(path, `export type * from '${from}';\n`);

      expect(ruleIds(findings)).toContain('@typescript-eslint/no-restricted-imports');
    },
  );

  it('rejects process.env outside apps/api/src/config/', async () => {
    const code = "export const port = process.env['PORT'];\n";
    const findings = await lintFixture(`apps/api/src/shared/${F}env.ts`, code);

    expect(ruleIds(findings)).toContain('no-restricted-properties');
  });
});

/** Lints a file in feature `from` that imports a sibling file in feature `to` (both temporary). */
function lintFeatureImport(from: string, to: string): Promise<LintFinding[]> {
  const target = `apps/web/src/app/features/${to}/${F}target.ts`;
  return withTemporaryFile(target, 'export const value = 1;\n', () => {
    const code = `import { value } from '../${to}/${F}target';\nexport const copy = value;\n`;
    return lintFixture(`apps/web/src/app/features/${from}/${F}source.ts`, code);
  });
}
