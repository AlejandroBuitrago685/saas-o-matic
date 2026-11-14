import { spawnSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

import {
  anchorsOf,
  findBrokenLinks,
  linkTargets,
  slugOf,
  withFolders,
} from '../scripts/check-markdown-links.mjs';
import { REPO_ROOT } from './lint-fixture.js';

describe('D-181 anchors of the headings, as GitHub writes them', () => {
  it('lowers the case, drops the punctuation and keeps the accents, hyphens and underscores', () => {
    expect(slugOf('Hello, World!')).toBe('hello-world');
    expect(slugOf('P11 · Demo pública — 2026-11-14')).toBe('p11--demo-pública--2026-11-14');
    expect(slugOf('§2.1 snake_case y `feat/x`')).toBe('21-snake_case-y-featx');
    expect(slugOf('Un [enlace](otro.md) en el título')).toBe('un-enlace-en-el-título');
  });

  it('numbers a repeated heading and ignores the ones inside code fences', () => {
    const markdown = '# Uno\n\n## Datos\n\n## Datos\n\n```md\n# Falso\n```\n';

    expect([...anchorsOf(markdown)]).toEqual(['uno', 'datos', 'datos-1']);
  });
});

describe('D-181 links of a Markdown file', () => {
  it('finds inline links, images and reference definitions, and skips code', () => {
    const markdown = [
      'Ver [a](uno.md), ![b](img/dos.png "título") y [c](<con espacios.md#x>).',
      '[ref]: tres.md',
      'En código `[x](cuatro.md)` no cuenta.',
      '```',
      '[y](cinco.md)',
      '```',
    ].join('\n');

    expect(linkTargets(markdown)).toEqual(['uno.md', 'img/dos.png', 'con espacios.md#x', 'tres.md']);
  });

  it('finds the link of a nested badge and the src and href attributes of HTML', () => {
    const markdown = [
      '[![estado](img/badge.svg)](https://example.com/ci)',
      '<img src="docs/capturas/uno.webp" alt="x" width="49%">',
      '<a href="otro.md">otro</a>',
    ].join('\n');

    expect(linkTargets(markdown)).toEqual([
      'img/badge.svg',
      'https://example.com/ci',
      'docs/capturas/uno.webp',
      'otro.md',
    ]);
  });
});

describe('D-181 broken links', () => {
  const files = [
    'README.md',
    'docs/guia.md',
    'docs/dup.md',
    'docs/con espacio.md',
    'docs/img/uno.png',
    'src/app.ts',
  ];
  const existing = withFolders(files);
  const contents: Record<string, string> = {
    'README.md': '# Top\n',
    'docs/guia.md': '# Guía\n\n## Paso 1\n',
    'docs/dup.md': '## Paso 1\n\n## Paso 1\n',
  };
  const read = (path: string): string | undefined => contents[path];

  it('accepts files, folders, headings, root-relative paths and links to itself', () => {
    const markdown =
      '[a](docs/guia.md#paso-1) [b](docs/) [c](/src/app.ts) [d](docs/img/uno.png) [e](#top) [f](https://example.com/x)';

    expect(findBrokenLinks([{ path: 'README.md', content: markdown }], existing, read)).toEqual([]);
  });

  it('reports a missing file and a missing heading', () => {
    const markdown = '[a](docs/nada.md) [b](docs/guia.md#paso-9)';

    expect(findBrokenLinks([{ path: 'README.md', content: markdown }], existing, read)).toEqual([
      'README.md: docs/nada.md (no such file or folder)',
      'README.md: docs/guia.md#paso-9 (no such heading)',
    ]);
  });

  it('decodes %20, numbers a repeated heading and reports a malformed percent-encoding without aborting', () => {
    const markdown =
      '[a](docs/con%20espacio.md) [b](docs/dup.md#paso-1-1) [c](docs/dup.md#paso-1-2) [d](docs/100%.md) [e](nada.md)';

    expect(findBrokenLinks([{ path: 'README.md', content: markdown }], existing, read)).toEqual([
      'README.md: docs/dup.md#paso-1-2 (no such heading)',
      'README.md: docs/100%.md (invalid percent-encoding)',
      'README.md: nada.md (no such file or folder)',
    ]);
  });

  it('resolves the links of a file against its own folder', () => {
    const markdown = '[a](img/uno.png) [b](../README.md) [c](../src/falta.ts)';

    expect(findBrokenLinks([{ path: 'docs/guia.md', content: markdown }], existing, read)).toEqual([
      'docs/guia.md: ../src/falta.ts (no such file or folder)',
    ]);
  });
});

describe('D-181 the Markdown of the repository', () => {
  it('has no broken relative link, so the evaluator never meets one', () => {
    const result = spawnSync(process.execPath, ['scripts/check-markdown-links.mjs'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });

    expect(`${result.stdout}${result.stderr}`).toMatch(/check-markdown-links: \d+ files OK/);
    expect(result.status).toBe(0);
  });
});
