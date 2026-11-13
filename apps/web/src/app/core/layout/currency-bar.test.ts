import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExchangeRatesStore } from '../currency/exchange-rates.store';
import type { RatesSnapshot, RatesState } from '../currency/rates-state';
import { ratesResponse, REFERENCE_UPDATED_AT } from '../testing/exchange-rates.fixture';
import { ratesEnvironment, type RatesEnvironment } from '../testing/rates-environment.fixture';
import { CurrencyBar } from './currency-bar';
import { ratesStatusView } from './rates-status';

const plain = (text: string | null | undefined): string => (text ?? '').replace(/\s+/g, ' ').trim();

describe('D-51 texts of the rates indicator (spec 05 §4.4)', () => {
  const snapshot: RatesSnapshot = { rates: { updatedAt: REFERENCE_UPDATED_AT, rates: {} }, fetchedAt: 0 };

  it.each([
    {
      state: { status: 'loading' },
      chosen: 'EUR',
      text: 'Cargando tipos de cambio…',
      extra: { isBusy: true, canRetry: false },
    },
    {
      state: { status: 'fresh', snapshot },
      chosen: 'EUR',
      text: 'Tipos del 12/11/2026',
      extra: { isBusy: false, canRetry: false },
    },
    {
      state: { status: 'refreshing', snapshot },
      chosen: 'USD',
      text: 'Tipos del 12/11/2026',
      extra: { isBusy: true, detail: 'Actualizando…' },
    },
    {
      state: { status: 'stale', snapshot, failure: 'NETWORK' },
      chosen: 'USD',
      text: 'Tipos desactualizados del 12/11/2026',
      extra: { canRetry: true, tone: 'warning' },
    },
    {
      state: { status: 'error', failure: 'HTTP' },
      chosen: 'EUR',
      text: 'No se han podido obtener los tipos de cambio',
      extra: { canRetry: true, tone: 'danger' },
    },
    {
      state: { status: 'error', failure: 'RATE_LIMITED' },
      chosen: 'USD',
      text: 'No se han podido obtener los tipos de cambio; importes en EUR',
      extra: { canRetry: true, tone: 'danger' },
    },
  ] as const)('$state.status with $chosen chosen → «$text»', ({ state, chosen, text, extra }) => {
    expect(ratesStatusView(state as RatesState, chosen)).toMatchObject({ text, ...extra });
  });
});

describe('D-51 currency bar of the header: indicator and selector (AC-80, AC-81)', () => {
  let env: RatesEnvironment;
  let fixture: ComponentFixture<CurrencyBar>;
  let host: HTMLElement;

  beforeEach(() => {
    env = ratesEnvironment();
    TestBed.configureTestingModule({ providers: env.providers });
    fixture = TestBed.createComponent(CurrencyBar);
    host = fixture.nativeElement as HTMLElement;
  });

  const status = (): HTMLElement => host.querySelector<HTMLElement>('[data-testid="rates-status"]') ?? fail();
  const select = (): HTMLSelectElement =>
    host.querySelector<HTMLSelectElement>('[data-testid="currency-select"]') ?? fail();
  const enabled = (): string[] =>
    [...select().options].filter((option) => !option.disabled).map((option) => option.value);
  const retryButton = (): HTMLButtonElement | undefined =>
    [...host.querySelectorAll('button')].find((button) => button.textContent.includes('Reintentar'));

  function fail(): never {
    throw new Error('element not rendered');
  }

  async function start(): Promise<void> {
    await TestBed.inject(ExchangeRatesStore).start();
    await fixture.whenStable();
  }

  it('AC-81: while loading, a polite live region with activity, and only EUR', async () => {
    env.fetch.mockReturnValueOnce(new Promise(() => undefined));
    void TestBed.inject(ExchangeRatesStore).start();
    await fixture.whenStable();

    expect(status().getAttribute('role')).toBe('status');
    expect(status().getAttribute('aria-live')).toBe('polite');
    expect(plain(status().textContent)).toBe('Cargando tipos de cambio…');
    expect(status().querySelector('app-spinner')).not.toBeNull();
    expect(enabled()).toEqual(['EUR']);
    expect(select().value).toBe('EUR');
  });

  it('AC-80: with EUR selected, the error is shown without the user doing anything, with «Reintentar» outside the live region', async () => {
    env.fetch.mockResolvedValueOnce(ratesResponse({}, 500));
    await start();

    expect(plain(status().textContent)).toBe('No se han podido obtener los tipos de cambio');
    expect(retryButton()).toBeDefined();
    expect(status().contains(retryButton() ?? null)).toBe(false);
    expect(status().querySelector('svg')).not.toBeNull(); // an icon, never colour alone
    expect(enabled()).toEqual(['EUR']);
  });

  it('AC-80: «Reintentar» moves the focus to the selector, then shows the date and enables the currencies', async () => {
    env.fetch.mockResolvedValueOnce(ratesResponse({}, 429));
    await start();

    retryButton()?.click();
    expect(document.activeElement).toBe(select());
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(plain(status().textContent)).toBe('Tipos del 12/11/2026');
    });

    expect(retryButton()).toBeUndefined();
    expect(enabled()).toEqual(['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'MXN']);
  });

  it('spec 05 §4.1: choosing a currency in the selector changes the effective currency', async () => {
    await start();

    select().value = 'JPY';
    select().dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(select().value).toBe('JPY');
    expect(plain(status().textContent)).toBe('Tipos del 12/11/2026');
  });
});
