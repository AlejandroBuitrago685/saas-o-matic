import { describe, expect, it } from 'vitest';

import { formatDateTime } from './date-time.pipe';
import { formatMoney, formatTaxRate } from './money.pipe';

/** The tests compare without telling apart the kind of space (spec 05 §4.5). */
const plain = (text: string): string => text.replace(/\s/g, ' ');

describe('D-35 es-ES formats (spec 05 §4.5)', () => {
  it.each([
    [16940, '169,40 €'],
    [2940, '29,40 €'],
    [100000, '1000,00 €'],
    [1000000, '10.000,00 €'],
    [0, '0,00 €'],
  ])('TV-PR-04 / TV-FX-06 %d cents → %s', (cents, text) => {
    expect(plain(formatMoney(cents))).toBe(text);
  });

  it('keeps the amount and the € sign together (non-breaking space)', () => {
    expect(formatMoney(16940)).not.toContain(' ');
  });

  it.each([
    [2100, '21 %'],
    [2300, '23 %'],
    [0, '0 %'],
    [2250, '22,5 %'],
  ])('tax rate %d bps → %s', (bps, text) => {
    expect(plain(formatTaxRate(bps))).toBe(text);
  });

  it('formats dates and times in the given time zone', () => {
    expect(formatDateTime('2026-11-13T10:20:00.000Z', 'date', 'Atlantic/Canary')).toBe('13/11/2026');
    expect(formatDateTime('2026-11-13T10:20:00.000Z', 'dateTime', 'Europe/Madrid')).toBe('13/11/2026, 11:20');
  });
});
