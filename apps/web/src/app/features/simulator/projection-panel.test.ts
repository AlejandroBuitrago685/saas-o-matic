import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { type Currency, type Pricing } from '@saas-o-matic/domain';
import { beforeEach, describe, expect, it } from 'vitest';

import { CurrencyStore } from '../../core/currency/currency.store';
import { ExchangeRatesStore } from '../../core/currency/exchange-rates.store';
import { ratesEnvironment } from '../../core/testing/rates-environment.fixture';
import { ProjectionPanel } from './projection-panel';

const plain = (text: string | null | undefined): string => (text ?? '').replace(/\s+/g, ' ').trim();

/** 15 users of a Spanish customer (TV-PR-04): 100,00 € + 40,00 €, 21 % → 29,40 €. */
const FIFTEEN_USERS_ES: Pricing = {
  tariffCode: 'STANDARD',
  tiers: [
    { tier: 1, fromUser: 1, toUser: 10, units: 10, unitPriceCents: 1000, subtotalCents: 10_000 },
    { tier: 2, fromUser: 11, toUser: 50, units: 5, unitPriceCents: 800, subtotalCents: 4000 },
  ],
  baseCents: 14_000,
  taxRateBps: 2100,
  taxCents: 2940,
  totalCents: 16_940,
};

async function withRates(currency: Currency): Promise<void> {
  await TestBed.inject(ExchangeRatesStore).start();
  TestBed.inject(CurrencyStore).select(currency);
}

describe('AC-79 / D-20 projection in the selected currency (spec 05 §3.4 and §4.5)', () => {
  let fixture: ComponentFixture<ProjectionPanel>;
  let host: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: ratesEnvironment().providers });
    fixture = TestBed.createComponent(ProjectionPanel);
    fixture.componentRef.setInput('pricing', FIFTEEN_USERS_ES);
    fixture.componentRef.setInput('country', 'ES');
    host = fixture.nativeElement as HTMLElement;
  });

  const rows = (): string[] =>
    [...host.querySelectorAll('dl > div')].map(
      (row) =>
        `${plain(row.querySelector('dt')?.textContent)} | ${plain(row.querySelector('dd')?.textContent)}`,
    );
  const total = (): string => plain(host.querySelector('[data-testid="projection-total"]')?.textContent);
  const note = (): string | undefined =>
    host.querySelector('[data-testid="projection-note"]')?.textContent.trim();

  it('TV-FX-02: GBP adds up from the converted leaf items (141,61, not 141,60), the unit price stays in EUR', async () => {
    await withRates('GBP');
    await fixture.whenStable();

    expect(rows()).toEqual(
      [
        'Tramo 1 · usuarios 1–10 · 10 × 10,00 € | ≈ 83,59 GBP',
        'Tramo 2 · usuarios 11–50 · 5 × 8,00 € | ≈ 33,44 GBP',
        'Base mensual | ≈ 117,03 GBP',
        'Impuesto (ES, 21 %) | ≈ 24,58 GBP',
      ].map(plain),
    );
    expect(total()).toBe(plain('≈ 141,61 GBP'));
    expect(note()).toBe('Importes orientativos en GBP con tipos del 12/11/2026');
  });

  it('TV-FX-04: JPY without decimals, base 24.812 (not 24.813)', async () => {
    await withRates('JPY');
    await fixture.whenStable();

    expect(rows()[2]).toBe(plain('Base mensual | ≈ 24.812 JPY'));
    expect(total()).toBe(plain('≈ 30.023 JPY'));
  });

  it('TV-FX-06: in EUR there is no note and no ≈', async () => {
    await withRates('EUR');
    await fixture.whenStable();

    expect(total()).toBe(plain('169,40 €'));
    expect(note()).toBeUndefined();
  });
});
