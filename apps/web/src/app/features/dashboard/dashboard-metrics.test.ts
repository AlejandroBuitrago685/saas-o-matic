import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import type { StatsResponse } from '@saas-o-matic/contract';
import { beforeEach, describe, expect, it } from 'vitest';

import { apiBaseInterceptor } from '../../core/api/api-base.interceptor';
import { apiErrorInterceptor } from '../../core/api/api-error.interceptor';
import { CurrencyStore } from '../../core/currency/currency.store';
import { ExchangeRatesStore } from '../../core/currency/exchange-rates.store';
import { INSTANCE_FIXTURE } from '../../core/testing/catalog.fixture';
import { ratesEnvironment } from '../../core/testing/rates-environment.fixture';
import { DashboardMetrics } from './dashboard-metrics';
import { DashboardStatsStore } from './dashboard-stats.store';

const STATS_URL = '/api/stats';
const STATS: StatsResponse = {
  customersCount: 1234,
  simulationsCount: 2,
  averageBaseCents: 12_400,
  currency: 'EUR',
};
const plain = (text: string | null | undefined): string => (text ?? '').replace(/\s+/g, ' ').trim();

let fixture: ComponentFixture<DashboardMetrics>;
let host: HTMLElement;
let http: HttpTestingController;

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [
      DashboardStatsStore,
      provideHttpClient(withInterceptors([apiBaseInterceptor, apiErrorInterceptor])),
      provideHttpClientTesting(),
      ...ratesEnvironment().providers,
    ],
  });
  http = TestBed.inject(HttpTestingController);
  fixture = TestBed.createComponent(DashboardMetrics);
  host = fixture.nativeElement as HTMLElement;
  fixture.detectChanges();
  TestBed.tick();
});

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
  TestBed.tick();
  fixture.detectChanges();
}

async function answer(body: StatsResponse): Promise<void> {
  http.expectOne(STATS_URL).flush(body);
  await settle();
}

/** «Clientes» → «1234», read from the description list of the metrics. */
function metrics(): Record<string, string> {
  const entries = [...host.querySelectorAll('dl > div')].map((item) => [
    plain(item.querySelector('dt')?.textContent),
    plain(item.querySelector('dd')?.textContent),
  ]);
  return Object.fromEntries(entries) as Record<string, string>;
}

describe('AC-92 dashboard metrics (spec 05 §3.1, RF-19)', () => {
  it('asks GET /stats once and shows a skeleton meanwhile, announced only by the listing', () => {
    expect(http.match(STATS_URL)).toHaveLength(1);
    expect(host.querySelector('dl')?.getAttribute('aria-busy')).toBe('true');
    expect(host.querySelectorAll('.skeleton')).toHaveLength(3);
    expect(host.querySelector('[role="status"]')).toBeNull();
  });

  it('shows the three metrics, the average in EUR, without tax', async () => {
    await answer(STATS);

    expect(metrics()).toEqual({
      Clientes: '1234',
      Simulaciones: '2',
      'Importe medio simulado (sin impuestos)': '124,00 €',
    });
    expect(host.querySelector('dl')?.hasAttribute('aria-busy')).toBe(false);
  });

  it('converts the average to the selected currency as one leaf item, approximate, with the date of the rates', async () => {
    await TestBed.inject(ExchangeRatesStore).start();
    TestBed.inject(CurrencyStore).select('USD');
    await answer(STATS);

    expect(metrics()['Importe medio simulado (sin impuestos)']).toBe('≈ 137,80 US$');
    expect(plain(host.querySelector('[data-testid="metrics-note"]')?.textContent)).toBe(
      'Orientativo en USD con tipos del 12/11/2026',
    );
  });

  it('S-08 without simulations: «—» and «Aún no hay simulaciones»', async () => {
    await answer({ ...STATS, simulationsCount: 0, averageBaseCents: null });

    expect(metrics()['Importe medio simulado (sin impuestos)']).toBe('— Aún no hay simulaciones');
  });

  it('a failure shows «—» in the three and a discreet notice, never an alert', async () => {
    http.expectOne(STATS_URL).flush(
      {
        type: 'about:blank',
        title: 'Error',
        status: 500,
        code: 'INTERNAL_ERROR',
        instance: INSTANCE_FIXTURE,
      },
      { status: 500, statusText: 'Internal Server Error' },
    );
    await settle();

    expect(Object.values(metrics())).toEqual(['—', '—', '—']);
    expect(plain(host.querySelector('[data-testid="metrics-error"]')?.textContent)).toBe(
      'No se han podido cargar las métricas.',
    );
    expect(host.querySelector('[role="alert"]')).toBeNull();
  });
});
