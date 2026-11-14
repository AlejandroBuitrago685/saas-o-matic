import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { listItems, sectionOf, tableRows } from '../scripts/lib/markdown.mjs';
import { escapeHtml, markup, raw } from '../scripts/recorrido/html.mjs';
import { inlineMarkdown, plainText } from '../scripts/recorrido/inline-markdown.mjs';
import { githubUrl, REPO_URL } from '../scripts/recorrido/repo-links.mjs';
import { tokenStylesheet, webpSize } from '../scripts/recorrido/sources/assets.mjs';
import { GUIDE_FILE, readingRoutes, requirementRows } from '../scripts/recorrido/sources/guide.mjs';
import {
  CRITERIA_FILE,
  criteriaCount,
  testFilesByLayer,
  workflowJobs,
} from '../scripts/recorrido/sources/quality.mjs';
import {
  cleanCloneTimes,
  DIARY_FILE,
  interventionMoments,
  measuredTestCounts,
  partPullRequests,
  PLAN_FILE,
  planParts,
  WORKSPACE_README,
} from '../scripts/recorrido/sources/workflow.mjs';
import { REPO_ROOT } from './lint-fixture.js';

const read = (path: string): string => readFileSync(join(REPO_ROOT, path), 'utf8');

describe('D-183 the Markdown readers of the walkthrough', () => {
  const doc = [
    '# T',
    '',
    '## Uno',
    'texto',
    '',
    '| a | b |',
    '|---|---|',
    '| 1 | 2 |',
    '',
    '## Dos',
    '- x',
  ].join('\n');

  it('read a section up to the next heading of its level, and the body rows of its tables', () => {
    expect(sectionOf(doc, /^Uno$/)).toContain('texto');
    expect(sectionOf(doc, /^Uno$/)).not.toContain('- x');
    expect(tableRows(sectionOf(doc, /^Uno$/))).toEqual([['1', '2']]);
    expect(() => sectionOf(doc, /^Tres$/)).toThrow(/no heading/);
  });

  it('read a list with wrapped lines and nested items, and stop at the next paragraph', () => {
    const list = ['1. **Uno**: a', '   b', '2. Dos', '   - hijo', '     sigue', 'Párrafo.', '3. Fuera'].join(
      '\n',
    );

    expect(listItems(list)).toEqual([
      { text: '**Uno**: a b', children: [] },
      { text: 'Dos', children: ['hijo sigue'] },
    ]);
  });
});

describe('D-183 D-181 the walkthrough reads the documents, never a copy of them', () => {
  it('takes the 20 rows of the requirements table of the guide, with their four cells', () => {
    const rows = requirementRows(read(GUIDE_FILE));

    expect(rows).toHaveLength(20);
    expect(rows[0]?.requirement).toContain('RF-01');
  });

  it('fails when a row of the guide loses a cell, instead of shifting the columns', () => {
    const guide = read(GUIDE_FILE).replace(/^(\| Alta de un cliente[^|]*)\|[^|]*\|/m, '$1|');

    expect(() => requirementRows(guide)).toThrow(/cells, not 4/);
  });

  it('takes the three reading routes, with the commands of the local one', () => {
    const routes = readingRoutes(read(GUIDE_FILE));

    expect(routes.map(({ minutes }) => minutes)).toEqual([5, 15, 60]);
    expect(routes[1]?.commands).toEqual(['npm ci', 'npm run setup', 'npm run dev']);
    expect(routes[0]?.items.length).toBeGreaterThan(3);
  });

  it('takes the ten moments of «Dónde intervine yo» with their own text', () => {
    const readme = read(WORKSPACE_README);
    const moments = interventionMoments(readme);
    // The items wrap over several lines in the file; the walkthrough joins them into one paragraph.
    const flowing = readme.replace(/\s+/g, ' ');

    expect(moments).toHaveLength(10);
    for (const moment of moments) expect(flowing).toContain(`**${moment.title}.** ${moment.body}`);
  });

  it('takes every part of the plan with its objective, and its pull requests from «Partes y PR»', () => {
    const plan = read(PLAN_FILE);
    const parts = planParts(plan);
    const pullRequests = partPullRequests(plan);

    expect(parts.map(({ id }) => id)).toEqual(Array.from({ length: 14 }, (_, index) => `P${String(index)}`));
    expect(parts.every(({ objective }) => objective.length > 10)).toBe(true);
    expect(pullRequests.get('P1')).toEqual(['2', '3']);
    expect(pullRequests.get('P0')).toEqual(['1']);
  });

  it('takes the times and the test counts of the most recent clean clone, not the first one', () => {
    const { heading, steps } = cleanCloneTimes(read(DIARY_FILE));

    expect(heading).toMatch(/^Prueba del clon limpio tras P13/);
    expect(steps.find(({ step }) => step === '`npm ci`')?.time).toBe('53 s');
    expect(measuredTestCounts(steps)).toEqual({ node: 1222, web: 293 });
    expect(() => measuredTestCounts([])).toThrow(/no `npm test` row/);
  });

  it('reads the last table of clean-clone steps of the diary, under its own heading', () => {
    const table = (time: string): string =>
      ['| Paso del README | Resultado | Tiempo |', '|---|---|---|', `| \`npm ci\` | bien | ${time} |`].join(
        '\n',
      );
    const diary = [
      '## P12 · Cierre',
      '',
      table('59 s'),
      '',
      '## Prueba nueva',
      '',
      table('53 s'),
      '',
      '## P14',
      'texto',
    ];

    expect(cleanCloneTimes(diary.join('\n'))).toEqual({
      heading: 'Prueba nueva',
      steps: [{ step: '`npm ci`', result: 'bien', time: '53 s' }],
    });
    expect(() => cleanCloneTimes('## Sin tablas')).toThrow(/no clean-clone table/);
  });

  it('counts 83 criteria: 81 with a test and AC-94 and AC-99 only reviewed, as the guide says', () => {
    expect(criteriaCount(read(CRITERIA_FILE))).toEqual({
      total: 83,
      automated: 81,
      reviewOnly: ['AC-94', 'AC-99'],
    });
  });

  it('reads the jobs and steps of a workflow, and the test files of each layer', () => {
    const workflow = [
      'on: push',
      'jobs:',
      '  a:',
      '    name: A',
      '    steps:',
      '      - name: uno',
      '      - run: x',
      '  b:',
      '    steps:',
      '      - name: dos',
    ].join('\n');

    expect(workflowJobs(workflow)).toEqual([
      { id: 'a', name: 'A', steps: ['uno'] },
      { id: 'b', name: '', steps: ['dos'] },
    ]);
    expect(
      testFilesByLayer(['packages/domain/a.test.ts', 'e2e/specs/b.spec.ts', 'tools/c.ts']),
    ).toContainEqual({
      layer: 'e2e',
      folder: 'e2e',
      files: 1,
    });
  });
});

describe('D-183 the HTML of the walkthrough is escaped and its links are real', () => {
  it('escapes every interpolated value unless it is already markup', () => {
    const name = '<img src=x onerror=alert(1)>';

    expect(markup`<p title="${name}">${name}</p>`.value).toBe(
      '<p title="&lt;img src=x onerror=alert(1)&gt;">&lt;img src=x onerror=alert(1)&gt;</p>',
    );
    expect(markup`<p>${raw('<b>ok</b>')}${[1, null, false, 'a&b']}</p>`.value).toBe(
      '<p><b>ok</b>1a&amp;b</p>',
    );
    expect(escapeHtml(`"'`)).toBe('&quot;&#39;');
  });

  it('renders inline Markdown as escaped HTML, with relative links turned into GitHub URLs', () => {
    const html = inlineMarkdown(
      '**Uno** <b>x</b> `<i>` [guía](GUIA-EVALUADOR.md) y <https://example.com>',
      'README.md',
    );

    expect(html.value).toBe(
      `<strong>Uno</strong> &lt;b&gt;x&lt;/b&gt; <code>&lt;i&gt;</code> <a href="${REPO_URL}/blob/main/GUIA-EVALUADOR.md">guía</a> y <a href="https://example.com">example.com</a>`,
    );
    expect(plainText('**Uno** [`dos`](x.md)')).toBe('Uno dos');
  });

  it('refuses a link to a path that does not exist, so a renamed file breaks the generation', () => {
    expect(githubUrl('packages/domain')).toBe(`${REPO_URL}/tree/main/packages/domain`);
    expect(() => githubUrl('packages/nada.ts')).toThrow(/no such path/);
    expect(() => inlineMarkdown('[x](nada.md)', 'README.md')).toThrow(/no such path/);
  });
});

describe('D-183 the assets the walkthrough shares with the application', () => {
  it('copies the colour tokens of the application and nothing that is reset', () => {
    const css = tokenStylesheet(
      '@theme {\n  --color-*: initial;\n  --color-ink: #0d0d1a;\n  --radius-sm: 8px;\n  --font-sans: x;\n}',
    );

    expect(css).toContain('  --color-ink: #0d0d1a;\n  --radius-sm: 8px;\n}');
    expect(css).not.toContain('initial');
    expect(css).not.toContain('--font-sans');
    expect(() => tokenStylesheet('')).toThrow(/no colour tokens/);
  });

  it('reads the size of the screenshots from their WebP header', () => {
    const size = webpSize(readFileSync(join(REPO_ROOT, 'docs/capturas/dashboard.webp')));

    expect(size).toEqual({ width: 1280, height: 800 });
    expect(() => webpSize(new Uint8Array(16))).toThrow(/not a WebP/);
  });
});
