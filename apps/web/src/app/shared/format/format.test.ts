import { describe, expect, it } from 'vitest';

import { formatDateTime } from './date-time.pipe';
import { formatMoney, formatRatesDate, formatTaxRate } from './money.pipe';

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
    { id: 'TV-FX-01', minor: 18_825, currency: 'USD', text: '≈ 188,25 US$' },
    { id: 'TV-FX-02', minor: 14_161, currency: 'GBP', text: '≈ 141,61 GBP' },
    { id: 'TV-FX-03', minor: 15_641, currency: 'CHF', text: '≈ 156,41 CHF' },
    { id: 'TV-FX-04', minor: 24_812, currency: 'JPY', text: '≈ 24.812 JPY' },
    { id: 'TV-FX-04', minor: 7089, currency: 'JPY', text: '≈ 7089 JPY' },
    { id: 'TV-FX-05', minor: 350_451, currency: 'MXN', text: '≈ 3504,51 MXN' },
    { id: 'TV-FX-06', minor: 16_940, currency: 'EUR', text: '169,40 €' },
  ] as const)(
    'AC-79 $id: $minor minor units of $currency → $text, with ≈ outside EUR (D-19)',
    ({ minor, currency, text }) => {
      expect(plain(formatMoney(minor, currency))).toBe(text);
    },
  );

  it.each([
    ['the reference rates (00:02 UTC)', Date.UTC(2026, 10, 12, 0, 2, 31)],
    ['the last second of the day', Date.UTC(2026, 10, 12, 23, 59, 59)],
  ])('D-145 the date of the rates is the UTC day, whatever the time zone: %s', (_case, updatedAt) => {
    expect(formatRatesDate(updatedAt)).toBe('12/11/2026');
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
