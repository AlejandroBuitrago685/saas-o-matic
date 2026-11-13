import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { findBadFileNames } from '../scripts/check-filenames.mjs';
import {
  findCommittedEnvFiles,
  findForbiddenWebPatterns,
  findInvisibleCharacters,
} from '../scripts/check-forbidden-patterns.mjs';
import { API_DEV_PORT, PROCESSES } from '../scripts/dev.mjs';
import { listTrackedFiles } from '../scripts/lib/repo.mjs';
import { automatedCriteria, definedVectors, missingIds } from '../scripts/trace-tests.mjs';
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

describe('D-86 traceability script (informative until P10)', () => {
  // Ids that do not exist in the specification, so this sample never counts as real coverage.
  const sample = [
    '**AC-901 · Base** · Refs: RF-08 · Nivel: U · Vectores: TV-ZZ-01…09',
    '**AC-902 · Repo** · Refs: RNF-19 · Nivel: R',
    '**AC-903 · Clone** · Refs: RNF-18 · Nivel: CI',
    '| TV-ZZ-01 | 1 | … |',
  ].join('\n');

  it('keeps only automatable criteria (U, I, E, CI) and reads vector ids', () => {
    expect(automatedCriteria(sample)).toEqual(['AC-901', 'AC-903']);
    expect(definedVectors(sample)).toEqual(['TV-ZZ-01']);
  });

  it('reports ids not cited by any test, without partial matches', () => {
    expect(missingIds(['AC-901', 'AC-9', 'TV-ZZ-01'], "it('AC-901 TV-ZZ-01: …')")).toEqual(['AC-9']);
  });

  it('finds the 81 automatable criteria of the real specification (83 minus the review-only AC-94 and AC-99)', () => {
    const markdown = readFileSync(
      join(REPO_ROOT, 'ai-workspace/02-especificacion/07-criterios-aceptacion.md'),
      'utf8',
    );

    expect(automatedCriteria(markdown)).toHaveLength(81);
    expect(automatedCriteria(markdown)).not.toContain('AC-94');
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
