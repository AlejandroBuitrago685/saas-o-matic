import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { findBadFileNames } from '../scripts/check-filenames.mjs';
import {
  findCommittedEnvFiles,
  findForbiddenWebPatterns,
  findInvisibleCharacters,
  isWebSource,
} from '../scripts/check-forbidden-patterns.mjs';
import { API_DEV_PORT, PROCESSES } from '../scripts/dev.mjs';
import { listTrackedFiles } from '../scripts/lib/repo.mjs';
import { affectedAreas, needsWholeRepoChecks, verificationSteps } from '../scripts/verify-changed.mjs';
import { REPO_ROOT } from './lint-fixture.js';

describe('AC-56 forbidden patterns in the web app (RNF-SEC-14)', () => {
  it('detects innerHTML bindings in templates and bypassSecurityTrust in code', () => {
    const findings = findForbiddenWebPatterns([
      { path: 'apps/web/src/app/x.html', content: '<div [innerHTML]="html"></div>' },
      { path: 'apps/web/src/app/y.ts', content: 'sanitizer.bypassSecurityTrustUrl(url);' },
      { path: 'apps/web/src/app/ok.html', content: '<p>{{ text }}</p>' },
    ]);

    expect(findings).toHaveLength(2);
    expect(findings[0]).toContain('x.html');
    expect(findings[1]).toContain('y.ts');
  });
});

describe('D-183 the scripts of the evaluator walkthrough follow the same rule (RNF-SEC-14)', () => {
  it('checks the web app and the scripts of docs/recorrido, not the copied domain package nor the generated page', () => {
    expect(isWebSource('apps/web/src/app/x.ts')).toBe(true);
    expect(isWebSource('docs/recorrido/recorrido.js')).toBe(true);
    expect(isWebSource('docs/recorrido/simulador.js')).toBe(true);
    expect(isWebSource('docs/recorrido/index.html')).toBe(false);
    expect(isWebSource('docs/recorrido/domain/index.js')).toBe(false);
    expect(isWebSource('scripts/recorrido/html.mjs')).toBe(false);
  });

  it('rejects innerHTML in a script of the walkthrough', () => {
    const findings = findForbiddenWebPatterns([
      { path: 'docs/recorrido/recorrido.js', content: 'node.innerHTML = text;' },
    ]);

    expect(findings).toEqual(['docs/recorrido/recorrido.js: innerHTML/outerHTML (RNF-SEC-14)']);
  });
});

describe('ADR-012 npm run dev keeps the API on the port the web proxy targets', () => {
  it('forces PORT for the API child, whatever PORT the shell or a preview tool exports', () => {
    const proxy = JSON.parse(readFileSync(join(REPO_ROOT, 'apps/web/proxy.conf.json'), 'utf8')) as {
      '/api': { target: string };
    };

    expect(new URL(proxy['/api'].target).port).toBe(API_DEV_PORT);
    expect(PROCESSES.find(({ name }) => name === 'api')?.env).toEqual({ PORT: API_DEV_PORT });
  });
});

describe('D-125 colours only come from the design tokens', () => {
  it.each([
    ['a hex background', '<div class="bg-[#3838ec]"></div>'],
    ['an rgb text colour', '<p class="p-2 text-[rgb(0,0,0)]"></p>'],
    ['a typed arbitrary colour in a class binding', "[class.border-[color:#fff]]='isOn'"],
    ['an oklch ring', "host: { class: 'ring-[oklch(0.5_0.2_270)]' }"],
  ])('rejects %s', (_case, content) => {
    expect(findForbiddenWebPatterns([{ path: 'apps/web/src/app/x.html', content }])).toEqual([
      'apps/web/src/app/x.html: arbitrary colour value: use a design token (D-125)',
    ]);
  });

  it('accepts token utilities and non-colour arbitrary values', () => {
    const content = '<div class="bg-primary text-ink-muted w-[22rem] grid-cols-[1fr_auto]"></div>';

    expect(findForbiddenWebPatterns([{ path: 'apps/web/src/app/ok.html', content }])).toEqual([]);
  });
});

describe('D-96 no invisible characters written literally in code or configuration', () => {
  const char = (codePoint: number): string => String.fromCodePoint(codePoint);

  it.each([
    ['a zero-width space', 0x200b],
    ['a right-to-left override (Trojan Source)', 0x202e],
    ['a byte order mark inside a line', 0xfeff],
    ['a no-break space', 0x00a0],
    ['a line separator', 0x2028],
    ['an escape character, which hides text in a terminal diff', 0x001b],
    ['a NUL character', 0x0000],
    ['a C1 next-line control', 0x0085],
    ['a variation selector', 0xfe0f],
    ['a combining grapheme joiner', 0x034f],
    ['a Hangul filler', 0x3164],
  ])('flags %s with its file, line and code point', (_case, codePoint) => {
    const content = `const ok = 1;\nconst name = 'Ac${char(codePoint)}me';\n`;
    const hex = codePoint.toString(16).toUpperCase().padStart(4, '0');

    expect(findInvisibleCharacters([{ path: 'packages/domain/src/x.ts', content }])).toEqual([
      `packages/domain/src/x.ts:2: invisible U+${hex} (build it with String.fromCodePoint) (D-96)`,
    ]);
  });

  it('accepts ordinary spaces, tabs, CRLF line ends, accents and escapes written as code', () => {
    const content = "const a = 'Telefonía Ñandú';\r\n\tconst b = String.fromCodePoint(0x200b);\n";

    expect(findInvisibleCharacters([{ path: 'x.ts', content }])).toEqual([]);
  });
});

describe('AC-55 no committed .env files (RNF-SEC-12)', () => {
  it('flags any .env file except .env.example', () => {
    expect(
      findCommittedEnvFiles(['.env', 'apps/api/.env.local', '.env.example', 'src/environment.ts']),
    ).toEqual(['.env', 'apps/api/.env.local']);
  });

  it('holds for the real repository', () => {
    expect(findCommittedEnvFiles(listTrackedFiles())).toEqual([]);
  });
});

describe('D-76 file naming (kebab-case with role suffixes)', () => {
  it('accepts the project conventions', () => {
    const good = [
      'apps/api/src/modules/customers/create-customer.use-case.ts',
      'apps/web/src/app/features/dashboard/dashboard.page.ts',
      'packages/domain/tsconfig.build.json',
      'apps/web/.postcssrc.json',
      'apps/api/Dockerfile',
    ];

    expect(findBadFileNames(good)).toEqual([]);
  });

  it('rejects camelCase, PascalCase and underscores in code folders, but ignores docs', () => {
    const paths = [
      'apps/api/src/createCustomer.ts',
      'packages/domain/src/Money.ts',
      'tools/my_test.ts',
      'ai-workspace/ADR-001.md',
    ];

    expect(findBadFileNames(paths)).toEqual(paths.slice(0, 3));
  });

  it('ignores the migrations drizzle-kit generates with its own names (D-86)', () => {
    expect(
      findBadFileNames(['apps/api/drizzle/0000_brave_name.sql', 'apps/api/drizzle/meta/_journal.json']),
    ).toEqual([]);
  });
});

describe('D-80 / D-86 verify:changed only checks what changed', () => {
  const everything = ['domain', 'contract', 'api', 'tools', 'web', 'e2e'];

  it.each([
    [['packages/domain/src/money.ts'], ['domain', 'contract', 'api', 'web', 'e2e']],
    [['packages/contract/src/x.ts'], ['contract', 'api', 'web', 'e2e']],
    [['apps/api/src/app.ts'], ['api']],
    [['e2e/specs/simulator.spec.ts'], ['e2e']],
    [['scripts/dev.mjs', 'tools/x.test.ts'], ['tools']],
    [['.claude/settings.json', '.github/workflows/ci.yml', '.nvmrc', 'lefthook.yml'], ['tools']],
    [['README.md', 'ai-workspace/diario.md'], []],
    [['package.json'], everything],
    [['tsconfig.base.json'], everything],
    [['eslint.config.js'], everything],
  ])('%j → %j', (changed, expected) => {
    expect(affectedAreas(changed)).toEqual(expected);
  });

  it('formats and lints only the files it is given, and runs the tools tests after the typechecks', () => {
    const { parallel, afterwards } = verificationSteps(
      ['api', 'tools'],
      ['apps/api/src/app.ts', 'README.md'],
    );
    const labels = parallel.map((step) => step.label);

    expect(labels).toEqual(
      expect.arrayContaining(['format', 'lint', 'typecheck api', 'typecheck tools', 'tests']),
    );
    expect(parallel.find((step) => step.label === 'lint')?.cmd).not.toContain('README.md');
    expect(parallel.find((step) => step.label === 'tests')?.cmd).not.toContain('tools');
    expect(afterwards.map((step) => step.label)).toEqual(['tests tools']);
  });

  it('D-68 typechecks the e2e workspace but never runs it: its tests need the Docker Compose stack', () => {
    const { parallel } = verificationSteps(['e2e'], ['e2e/specs/simulator.spec.ts']);

    expect(parallel.find((step) => step.label === 'typecheck e2e')?.cmd).toEqual(['npx', 'tsc', '-p', 'e2e']);
    expect(parallel.map((step) => step.label)).not.toContain('tests');
  });

  it('formats and lints the whole repository when the lint or format configuration changes', () => {
    expect(needsWholeRepoChecks(['tools/eslint/boundaries.js'])).toBe(true);
    expect(needsWholeRepoChecks(['eslint.config.js'])).toBe(true);
    expect(needsWholeRepoChecks(['apps/api/src/app.ts'])).toBe(false);

    const { parallel } = verificationSteps(['tools'], ['tools/eslint/boundaries.js'], true);

    expect(parallel.find((step) => step.label === 'lint (all)')?.cmd).toEqual([
      'npx',
      'eslint',
      '.',
      '--max-warnings=0',
    ]);
    expect(parallel.find((step) => step.label === 'format (all)')?.cmd).toEqual([
      'npx',
      'prettier',
      '--check',
      '.',
    ]);
  });
});
