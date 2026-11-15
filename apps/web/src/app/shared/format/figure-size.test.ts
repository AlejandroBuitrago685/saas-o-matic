import { describe, expect, it } from 'vitest';

import { figureSizeClass, METRIC_FIGURE_SIZES, PROJECTION_FIGURE_SIZES } from './figure-size';
import { formatMoney } from './money.pipe';

describe('D-191 the size of a figure follows its length, so it never wraps nor overflows', () => {
  it.each([
    ['TV-PR-04 the total of 15 users', formatMoney(16_940), 'short'],
    ['ten characters', '≈ 1234 JPY', 'short'],
    ['TV-FX-05 a total in pesos', formatMoney(350_451, 'MXN'), 'medium'],
    ['fourteen characters', '≈ 12.345,6 USD', 'medium'],
    ['the longest total: 10 000 users in pesos', formatMoney(124_312_708, 'MXN'), 'long'],
  ] as const)('%s («%s») takes the %s sizes', (_case, text, size) => {
    expect(figureSizeClass(text, PROJECTION_FIGURE_SIZES)).toBe(PROJECTION_FIGURE_SIZES[size]);
    expect(figureSizeClass(text, METRIC_FIGURE_SIZES)).toBe(METRIC_FIGURE_SIZES[size]);
  });

  it('starts a long figure at 18 px, the smallest size, in the narrowest card', () => {
    for (const sizes of [PROJECTION_FIGURE_SIZES, METRIC_FIGURE_SIZES]) {
      expect(sizes.long.split(' ')[0]).toBe('text-title-sm');
    }
  });
});
