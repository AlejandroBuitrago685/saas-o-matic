import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { EDGES, PIECES, ZONES } from '../scripts/recorrido/content/architecture.mjs';
import { REQUEST_FLOWS } from '../scripts/recorrido/content/request-flows.mjs';
import { referencePath } from '../scripts/recorrido/render/references.mjs';
import { buildSite, SITE_DIR } from '../scripts/recorrido/site.mjs';
import { REPO_ROOT } from './lint-fixture.js';

const read = (path: string): string => readFileSync(join(REPO_ROOT, path), 'utf8');
const pieceIds = PIECES.map((piece) => piece.id);
const edgeIds = EDGES.map((edge) => edge.id);
const steps = REQUEST_FLOWS.flatMap((flow) => flow.steps);
const html = await buildSite().then((site) => String(site.get(`${SITE_DIR}/index.html`)));

/** How each kind of reference is written where it is defined. */
const DEFINITION: readonly [RegExp, (id: string) => string][] = [
  [/^AC-/, (id) => `**${id} · `],
  [/^ADR-/, (id) => `# ${id}`],
  [/^D-/, (id) => `| ${id} | `],
  [/^(?:TV|RF|RNF-SEC)-/, (id) => `| ${id} |`],
];

describe('D-192 the system map draws only what exists', () => {
  it('has unique pieces, each in one zone, and lines that join two of them', () => {
    expect(new Set(pieceIds).size).toBe(pieceIds.length);
    expect(new Set(edgeIds).size).toBe(edgeIds.length);
    for (const edge of EDGES) {
      expect(pieceIds).toContain(edge.from);
      expect(pieceIds).toContain(edge.to);
    }
  });

  it.each([...new Set(PIECES.flatMap((piece) => [...piece.files, ...piece.tests]))])('%s exists', (path) => {
    expect(existsSync(join(REPO_ROOT, path))).toBe(true);
  });

  it('places every zone in the wide grid of esquema.css', () => {
    const css = read('docs/recorrido/esquema.css');

    for (const zone of ZONES)
      expect(css).toContain(`.sys-zone[data-zone='${zone.id}'] {\n    grid-area: ${zone.id};`);
  });

  it('links every piece to its card and renders every flow with all its steps', () => {
    for (const id of pieceIds) {
      expect(html).toContain(`href="#pieza-${id}"`);
      expect(html).toContain(`id="pieza-${id}"`);
    }
    for (const flow of REQUEST_FLOWS) {
      expect(html).toContain(`data-flow="${flow.id}"`);
      expect(html).toContain(`id="flujo-${flow.id}-${String(flow.steps.length)}"`);
    }
  });
});

describe('D-192 the three flows follow the map and cite what defines them', () => {
  it('lights only pieces of the map and travels only its lines, a labelled request always on a line', () => {
    for (const step of steps) {
      expect(step.lit.length).toBeGreaterThan(0);
      for (const id of step.lit) expect(pieceIds).toContain(id);
      for (const ref of step.edges) expect(edgeIds).toContain(ref.replace(/^</, ''));
      if (step.label !== undefined) expect(step.edges.length).toBeGreaterThan(0);
    }
  });

  it.each([...new Set(steps.flatMap((step) => step.tests))])('%s exists', (path) => {
    expect(existsSync(join(REPO_ROOT, path))).toBe(true);
  });

  it.each([...new Set([...PIECES.flatMap((piece) => piece.refs), ...steps.flatMap((step) => step.refs)])])(
    '%s is defined in its document',
    (id) => {
      const definition = DEFINITION.find(([pattern]) => pattern.test(id));

      expect(definition).toBeDefined();
      expect(read(referencePath(id))).toContain(definition?.[1](id));
    },
  );
});
