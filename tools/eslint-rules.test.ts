import { describe, expect, it } from 'vitest';

import { lintFixture, ruleIds } from './lint-fixture.js';

const F = '__lint_fixture__';

describe('AC-93 / D-66 TypeScript rules are enforced by ESLint', () => {
  it('accepts a clean domain file (control case)', async () => {
    const findings = await lintFixture(
      `packages/domain/src/${F}clean.ts`,
      'export function double(value: number): number {\n  return value * 2;\n}\n',
    );

    expect(findings).toEqual([]);
  });

  it('rejects `any`', async () => {
    const findings = await lintFixture(`packages/domain/src/${F}any.ts`, 'export const value: any = 1;\n');

    expect(ruleIds(findings)).toContain('@typescript-eslint/no-explicit-any');
  });

  it('rejects non-null assertions `!`', async () => {
    const code = 'export function first(items: string[]): string {\n  return items[0]!;\n}\n';
    const findings = await lintFixture(`packages/domain/src/${F}bang.ts`, code);

    expect(ruleIds(findings)).toContain('@typescript-eslint/no-non-null-assertion');
  });

  it('rejects files over 250 lines', async () => {
    const code = Array.from(
      { length: 260 },
      (_, index) => `export const v${String(index)} = ${String(index)};`,
    );
    const findings = await lintFixture(`packages/domain/src/${F}long.ts`, `${code.join('\n')}\n`);

    expect(ruleIds(findings)).toContain('max-lines');
  });

  it('rejects functions with a cyclomatic complexity above 8', async () => {
    const branches = Array.from(
      { length: 9 },
      (_, index) => `  if (value === ${String(index)}) return ${String(index)};`,
    );
    const code = `export function pick(value: number): number {\n${branches.join('\n')}\n  return -1;\n}\n`;
    const findings = await lintFixture(`packages/domain/src/${F}complex.ts`, code);

    expect(ruleIds(findings)).toContain('complexity');
  });

  it('rejects functions longer than 40 lines', async () => {
    const statements = Array.from({ length: 41 }, (_, index) => `  total += ${String(index)};`);
    const code = `export function sum(): number {\n  let total = 0;\n${statements.join('\n')}\n  return total;\n}\n`;
    const findings = await lintFixture(`packages/domain/src/${F}long-function.ts`, code);

    expect(ruleIds(findings)).toContain('max-lines-per-function');
  });

  it('rejects nesting deeper than 3 blocks', async () => {
    const code = [
      'export function deep(a: boolean, b: boolean, c: boolean): number {',
      '  if (a) { if (b) { if (c) { for (const x of [1]) { return x; } } } }',
      '  return 0;',
      '}',
      '',
    ].join('\n');
    const findings = await lintFixture(`packages/domain/src/${F}deep.ts`, code);

    expect(ruleIds(findings)).toContain('max-depth');
  });

  it('rejects more than 3 parameters (use a named object instead)', async () => {
    const code =
      'export function add(a: number, b: number, c: number, d: number): number {\n  return a + b + c + d;\n}\n';
    const findings = await lintFixture(`packages/domain/src/${F}params.ts`, code);

    expect(ruleIds(findings)).toContain('@typescript-eslint/max-params');
  });

  it('rejects lint exceptions without a written reason', async () => {
    const code = "// eslint-disable-next-line no-console\nconsole.log('x');\nexport {};\n";
    const findings = await lintFixture(`apps/api/src/config/${F}disable.ts`, code);

    expect(ruleIds(findings)).toContain('@eslint-community/eslint-comments/require-description');
  });

  it('rejects console in application code', async () => {
    const findings = await lintFixture(
      `apps/api/src/config/${F}console.ts`,
      "console.info('x');\nexport {};\n",
    );

    expect(ruleIds(findings)).toContain('no-console');
  });
});

describe('ADR-001 the shared domain stays pure', () => {
  it('rejects any external import', async () => {
    const code = "import Fastify from 'fastify';\nexport const server = Fastify;\n";
    const findings = await lintFixture(`packages/domain/src/${F}external.ts`, code);

    expect(ruleIds(findings)).toContain('@typescript-eslint/no-restricted-imports');
  });

  it('rejects reading the clock with Date.now()', async () => {
    const code = 'export function now(): number {\n  return Date.now();\n}\n';
    const findings = await lintFixture(`packages/domain/src/${F}clock.ts`, code);

    expect(ruleIds(findings)).toContain('no-restricted-properties');
  });

  it('rejects environment globals such as fetch', async () => {
    const code = "export function load(): Promise<Response> {\n  return fetch('/x');\n}\n";
    const findings = await lintFixture(`packages/domain/src/${F}fetch.ts`, code);

    expect(ruleIds(findings)).toContain('no-restricted-globals');
  });

  it('rejects importing application code (package boundaries)', async () => {
    const code = "import { buildApp } from '../../../apps/api/src/app.js';\nexport const app = buildApp;\n";
    const findings = await lintFixture(`packages/domain/src/${F}boundary.ts`, code);

    expect(ruleIds(findings)).toContain('boundaries/dependencies');
  });
});
