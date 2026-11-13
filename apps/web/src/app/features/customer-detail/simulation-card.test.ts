import { type ComponentFixture, TestBed } from '@angular/core/testing';
import type { SimulationResponse } from '@saas-o-matic/contract';
import { beforeEach, describe, expect, it } from 'vitest';

import { CurrencyStore } from '../../core/currency/currency.store';
import { ExchangeRatesStore } from '../../core/currency/exchange-rates.store';
import { ratesEnvironment } from '../../core/testing/rates-environment.fixture';
import { SimulationCard } from './simulation-card';

const plain = (text: string | null | undefined): string => (text ?? '').replace(/\s+/g, ' ').trim();

/** 15 users of a Spanish customer as the server stores them (TV-PR-04). */
const SAVED: SimulationResponse = {
  id: '019a7b2c-0000-7000-8000-000000000001',
  customerId: '019a7b2c-4d5e-7f00-8a1b-2c3d4e5f6a7b',
  activeUsers: 15,
  storageGb: 0,
  apiCallsPerMonth: 0,
  pricing: {
    currency: 'EUR',
    tariffCode: 'STANDARD',
    tiers: [
      { tier: 1, fromUser: 1, toUser: 10, units: 10, unitPriceCents: 1000, subtotalCents: 10_000 },
      { tier: 2, fromUser: 11, toUser: 50, units: 5, unitPriceCents: 800, subtotalCents: 4000 },
    ],
    baseCents: 14_000,
    taxCountry: 'ES',
    taxRateBps: 2100,
    taxCents: 2940,
    totalCents: 16_940,
  },
  createdAt: '2026-11-13T10:20:00.000Z',
};

describe('AC-87 history card in the selected currency (spec 05 §3.5)', () => {
  let fixture: ComponentFixture<SimulationCard>;
  let host: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: ratesEnvironment().providers });
    fixture = TestBed.createComponent(SimulationCard);
    fixture.componentRef.setInput('simulation', SAVED);
    host = fixture.nativeElement as HTMLElement;
  });

  const values = (): string[] =>
    [...host.querySelectorAll('.data-list > div')].map(
      (row) =>
        `${plain(row.querySelector('dt')?.textContent)}: ${plain(row.querySelector('dd')?.textContent)}`,
    );

  it('TV-FX-01: USD with the D-20 rule and the tax rate stored with the simulation', async () => {
    await TestBed.inject(ExchangeRatesStore).start();
    TestBed.inject(CurrencyStore).select('USD');
    await fixture.whenStable();

    expect(plain(host.querySelector('p')?.textContent)).toBe(plain('Total mensual: ≈ 188,25 US$'));
    expect(values()).toContain(plain('Base mensual: ≈ 155,58 US$'));
    expect(values()).toContain(plain('Impuesto (21 %): ≈ 32,67 US$'));
  });

  it('in EUR, the stored amounts as they are (D-19)', async () => {
    await fixture.whenStable();

    expect(plain(host.querySelector('p')?.textContent)).toBe(plain('Total mensual: 169,40 €'));
  });
});
