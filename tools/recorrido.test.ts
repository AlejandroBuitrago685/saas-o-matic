import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { REQUEST_PATH, RATES_CALL } from '../scripts/recorrido/content/architecture.mjs';
import { FLOW_STEPS } from '../scripts/recorrido/content/flow.mjs';
import { REPO_MAP } from '../scripts/recorrido/content/repo-map.mjs';
import { HIGHLIGHTED_DECISIONS, PART_CYCLE } from '../scripts/recorrido/content/timeline.mjs';
import { reachableModules } from '../scripts/recorrido/generate-recorrido.mjs';
import { escapeHtml } from '../scripts/recorrido/html.mjs';
import { CONTENT_SECURITY_POLICY } from '../scripts/recorrido/render/page.mjs';
import { DEMO_URL, PAGES_URL, REPO_URL } from '../scripts/recorrido/repo-links.mjs';
import { buildSite, SITE_DIR } from '../scripts/recorrido/site.mjs';
import { REPO_ROOT } from './lint-fixture.js';

const read = (path: string): string => readFileSync(join(REPO_ROOT, path), 'utf8');
const site = await buildSite();
const PAGES = [`${SITE_DIR}/index.html`, 'docs/index.html'];
const page = (path: string): string => {
  const content = site.get(path);
  if (typeof content !== 'string') throw new Error(`no page ${path}`);
  return content;
};
const allIds = (text: string, prefix: string): string[] =>
  [...text.matchAll(new RegExp(`\\b${prefix}-[A-Z]*-?\\d+\\b`, 'g'))].map(([id]) => id);

describe('D-183 the committed walkthrough is the one the repository generates today', () => {
  it.each([...site.keys()])('%s is up to date (run `npm run recorrido` after changing a source)', (path) => {
    const committed = readFileSync(join(REPO_ROOT, path));
    const generated = site.get(path) ?? '';

    expect(committed.equals(Buffer.from(generated))).toBe(true);
  });
});

describe('D-183 everything the walkthrough curates points to something real', () => {
  const contentPaths = [
    ...FLOW_STEPS.flatMap((step) => [...step.files, ...step.tests]),
    ...[...REQUEST_PATH, RATES_CALL].flatMap((piece) => piece.files),
    ...REPO_MAP.flatMap((group) => group.entries.map((entry) => entry.path)),
    ...PART_CYCLE.map((step) => step.source.split('#')[0] ?? ''),
  ];

  it.each(contentPaths)('%s exists', (path) => {
    expect(existsSync(join(REPO_ROOT, path))).toBe(true);
  });

  it('cites only criteria, test vectors, security requirements and decisions that are defined', () => {
    const criteria = read('ai-workspace/02-especificacion/07-criterios-aceptacion.md');
    const vectors = ['02-reglas-negocio', '03-validacion-fiscal', '05-frontend']
      .map((name) => read(`ai-workspace/02-especificacion/${name}.md`))
      .join('\n');
    const security = read('ai-workspace/02-especificacion/06-seguridad.md');
    const decisions = read('ai-workspace/decisiones.md');
    const cited = FLOW_STEPS.flatMap((step) => step.criteria);

    for (const id of cited.filter((ref) => ref.startsWith('AC-'))) expect(criteria).toContain(`**${id} · `);
    for (const id of cited.filter((ref) => ref.startsWith('TV-'))) expect(vectors).toContain(`| ${id} |`);
    for (const id of [...REQUEST_PATH, RATES_CALL].flatMap((piece) => piece.controlIds)) {
      expect(security).toContain(`| ${id} |`);
    }
    for (const id of Object.values(HIGHLIGHTED_DECISIONS)) expect(decisions).toContain(`| ${id} | **`);
  });

  it('shows 25 to 35 entries in the repository map, each with at least one interest', () => {
    const entries = REPO_MAP.flatMap((group) => group.entries);

    expect(entries.length).toBeGreaterThanOrEqual(25);
    expect(entries.length).toBeLessThanOrEqual(35);
    expect(entries.every((entry) => entry.interests.length > 0)).toBe(true);
  });

  it('links pictures of docs/capturas that exist and stay small', () => {
    const pictures = [...page(`${SITE_DIR}/index.html`).matchAll(/"\.\.\/capturas\/([^"]+)"/g)].map(
      ([, name]) => name,
    );

    expect(pictures.length).toBeGreaterThanOrEqual(FLOW_STEPS.length);
    for (const name of new Set(pictures)) {
      expect(statSync(join(REPO_ROOT, 'docs/capturas', name ?? '')).size).toBeLessThanOrEqual(150 * 1024);
    }
  });
});

describe('D-183 the pages are static, strict and carry no server data (D-99, D-175)', () => {
  it.each(PAGES)('%s declares the strict Content Security Policy', (path) => {
    const html = page(path);

    expect(html).toContain(
      `<meta http-equiv="Content-Security-Policy" content="${escapeHtml(CONTENT_SECURITY_POLICY)}" />`,
    );
    expect(CONTENT_SECURITY_POLICY).toMatch(/^default-src 'none'; script-src 'self'; style-src 'self';/);
    expect(CONTENT_SECURITY_POLICY).not.toMatch(/unsafe|https?:|\*/);
  });

  it.each(PAGES)('%s runs no inline script or style and loads nothing from another origin', (path) => {
    const html = page(path);
    const scripts = [...html.matchAll(/<script\b([^>]*)>/g)].map(([, attributes]) => attributes ?? '');

    expect(
      scripts.every(
        (attributes) => /\bsrc="[^":]+"/.test(attributes) || attributes.includes('type="application/json"'),
      ),
    ).toBe(true);
    expect(html).not.toMatch(/\sstyle=|<style\b|\son[a-z]+=/i);
    expect(html).not.toMatch(/\bsrc="(?:https?:)?\/\//);
    expect(html).not.toMatch(/<link\b[^>]*href="(?:https?:)?\/\//);
  });

  it('links outside only to the repository, the demo, the published walkthrough, roams.es and localhost', () => {
    const allowed = [REPO_URL, DEMO_URL, PAGES_URL, 'https://roams.es/', 'http://localhost:'];
    const external = PAGES.flatMap((path) =>
      [...page(path).matchAll(/\bhref="(https?:[^"]+)"/g)].map(([, url]) => url ?? ''),
    );

    expect(external.filter((url) => !allowed.some((prefix) => url.startsWith(prefix)))).toEqual([]);
  });

  it('holds no IP address of a server', () => {
    // The path data of the SVG icons («…41-.34.75.75…») looks like an address and is not one.
    const text = PAGES.map((path) => page(path).replace(/\sd="[^"]*"/g, '')).join(' ');
    const addresses = text.match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g) ?? [];

    expect(addresses.filter((address) => address !== '127.0.0.1')).toEqual([]);
  });

  it('counts every acceptance criterion and test vector it shows from the specification', () => {
    const cover = page(`${SITE_DIR}/index.html`).replace(/\s+/g, ' ');

    expect(cover).toContain('81 con test y 2 de revisión (AC-94 y AC-99)');
    expect(allIds(cover, 'TV').length).toBeGreaterThan(0);
  });
});

describe('D-184 the simulator imports the compiled domain package, and only its modules', () => {
  it('copies the modules reachable from index.js, without fixtures, declarations or source maps', () => {
    const dist: Record<string, string> = {
      'index.js': "export { a } from './pricing/a.js';\n//# sourceMappingURL=index.js.map",
      'pricing/a.js': "import { b } from '../shared/b.js';\nexport const a = b;",
      'shared/b.js': 'export const b = 1;',
      '__lint_fixture__clean.js': 'export {};',
    };
    const modules = reachableModules((path) => dist[path] ?? '');

    expect([...modules.keys()].sort()).toEqual(['index.js', 'pricing/a.js', 'shared/b.js']);
    expect(modules.get('index.js')).not.toContain('sourceMappingURL');
  });

  it('follows every form of a relative import, and refuses one that leaves the package', () => {
    const dist: Record<string, string> = {
      'index.js': "export * from \"./a.js\";\nimport './b.js';\nconst c = import('./c.js');",
      'a.js': 'export const a = 1;',
      'b.js': 'export {};',
      'c.js': 'export {};',
    };

    expect([...reachableModules((path) => dist[path] ?? '').keys()].sort()).toEqual([
      'a.js',
      'b.js',
      'c.js',
      'index.js',
    ]);
    expect(() => reachableModules(() => "import { x } from '../fuera.js';")).toThrow(/outside the package/);
  });
});
