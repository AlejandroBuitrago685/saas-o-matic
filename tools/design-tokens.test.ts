import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { REPO_ROOT } from './lint-fixture.js';

const TOKENS_FILE = 'apps/web/src/styles/tokens.css';
/** WCAG 2.1 AA: 1.4.3 for normal text, 1.4.11 for borders, focus rings, icons and slider parts. */
const TEXT = 4.5;
const NON_TEXT = 3;

function readColorTokens(): ReadonlyMap<string, string> {
  const css = readFileSync(join(REPO_ROOT, TOKENS_FILE), 'utf8');
  const matches = css.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6});/g);
  return new Map([...matches].map(([, name = '', hex = '']) => [name, hex]));
}

function relativeLuminance(hex: string): number {
  const [red = 0, green = 0, blue = 0] = [1, 3, 5].map((start) => {
    const channel = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (a, b) => b - a,
  );
  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05);
}

/** Every foreground/background pair the interface uses, with the threshold that applies to it. */
const PAIRS: readonly (readonly [foreground: string, background: string, minimum: number])[] = [
  // Text on the three surfaces
  ...['ink', 'ink-soft', 'ink-muted'].flatMap((text) =>
    ['surface', 'canvas', 'surface-muted'].map((surface) => [text, surface, TEXT] as const),
  ),
  ['ink-muted', 'primary-tint', TEXT],
  // Primary button in its three states, links and the projection total
  ['on-primary', 'primary', TEXT],
  ['on-primary', 'primary-hover', TEXT],
  ['on-primary', 'primary-active', TEXT],
  ['primary', 'surface', TEXT],
  ['primary', 'canvas', TEXT],
  ['primary', 'primary-tint', TEXT],
  ['primary-hover', 'surface', TEXT],
  // Soft button and badges
  ['primary-ink', 'primary-soft', TEXT],
  ['primary-ink', 'primary-soft-hover', TEXT],
  // Status text on its own background and on white
  ...['success', 'warning', 'danger', 'info'].flatMap((status) => [
    [`${status}-fg`, `${status}-bg`, TEXT] as const,
    [`${status}-fg`, 'surface', TEXT] as const,
  ]),
  // Non-text: focus ring, field borders, invalid border, secondary button border, slider track and thumb
  ['primary', 'surface', NON_TEXT],
  ['primary', 'canvas', NON_TEXT],
  ['line-control', 'surface', NON_TEXT],
  ['danger-fg', 'surface', NON_TEXT],
  ['ink', 'surface', NON_TEXT],
  ['track', 'surface', NON_TEXT],
  ['track', 'primary-tint', NON_TEXT],
];

describe('D-124 design tokens meet WCAG 2.1 AA contrast (RNF-13)', () => {
  const tokens = readColorTokens();

  it('computes the reference ratios of the WCAG definition', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBe(1);
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });

  it.each(PAIRS)('%s on %s reaches %d:1', (foreground, background, minimum) => {
    const foregroundHex = tokens.get(foreground);
    const backgroundHex = tokens.get(background);

    expect(foregroundHex, `--color-${foreground} is not a token`).toBeDefined();
    expect(backgroundHex, `--color-${background} is not a token`).toBeDefined();
    expect(contrastRatio(foregroundHex ?? '', backgroundHex ?? '')).toBeGreaterThanOrEqual(minimum);
  });

  it('rejects the reference colours that fail as indicators (adjusted in D-124)', () => {
    // Base green and orange of the status palette, and the light lavender of the reference's slider track.
    for (const failing of ['#0cb001', '#ff9f00', '#b9b9f8']) {
      expect(contrastRatio(failing, '#ffffff')).toBeLessThan(NON_TEXT);
    }
  });
});
