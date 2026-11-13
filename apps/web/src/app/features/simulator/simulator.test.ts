import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import type { SimulationResponse } from '@saas-o-matic/contract';
import { validateCatalog } from '@saas-o-matic/domain';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiBaseInterceptor } from '../../core/api/api-base.interceptor';
import { apiErrorInterceptor } from '../../core/api/api-error.interceptor';
import type { ReadyCatalog } from '../../core/catalog/catalog.store';
import { ToastStore } from '../../core/layout/toast.store';
import { CATALOG_FIXTURE, CUSTOMER_FIXTURE, INSTANCE_FIXTURE } from '../../core/testing/catalog.fixture';
import { ANNOUNCE_DELAY_MS, tierLabel } from './projection-panel';
import { Simulator } from './simulator';

function readyCatalog(): ReadyCatalog {
  const validated = validateCatalog(CATALOG_FIXTURE);
  if (!validated.ok) throw new Error('invalid catalog fixture');
  return { response: CATALOG_FIXTURE, catalog: validated.value };
}

/** The tests compare without telling apart the kind of space (spec 05 §4.5). */
const plain = (text: string | null | undefined): string => (text ?? '').replace(/\s+/g, ' ').trim();

describe('V4 simulator (spec 05 §3.4)', () => {
  let fixture: ComponentFixture<Simulator>;
  let host: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiBaseInterceptor, apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Simulator);
    fixture.componentRef.setInput('customer', CUSTOMER_FIXTURE);
    fixture.componentRef.setInput('catalog', readyCatalog());
    host = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  const slider = (): HTMLInputElement =>
    host.querySelector<HTMLInputElement>('input[type="range"]') ?? fail();
  const usersField = (): HTMLInputElement => host.querySelector<HTMLInputElement>('#users-number') ?? fail();
  const saveButton = (): HTMLButtonElement =>
    [...host.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent.includes('Guardar')) ??
    fail();
  /** Each row of the projection as «label | amount». */
  const projection = (): string[] =>
    [...host.querySelectorAll('app-projection-panel dl > div')].map(
      (row) =>
        `${plain(row.querySelector('dt')?.textContent)} | ${plain(row.querySelector('dd')?.textContent)}`,
    );
  const total = (): string => plain(host.querySelector('[data-testid="projection-total"]')?.textContent);

  function fail(): never {
    throw new Error('element not rendered');
  }

  async function type(element: HTMLInputElement, value: string): Promise<void> {
    element.value = value;
    element.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  }

  it('AC-77 starts at 1 user, 0 GB and 0 API calls', () => {
    expect(usersField().value).toBe('1');
    expect(slider().value).toBe('0');
    expect(total()).toBe('12,10 €');
  });

  it('AC-76 / TV-PR-04 / TV-FX-06 projects 15 users of a Spanish customer in EUR', async () => {
    await type(usersField(), '15');

    expect(projection()).toEqual(
      [
        'Tramo 1 · usuarios 1–10 · 10 × 10,00 € | 100,00 €',
        'Tramo 2 · usuarios 11–50 · 5 × 8,00 € | 40,00 €',
        'Base mensual | 140,00 €',
        'Impuesto (ES, 21 %) | 29,40 €',
      ].map(plain),
    );
    expect(total()).toBe('169,40 €');
  });

  it('AC-77 the field follows the slider, and the slider takes the position of a typed value', async () => {
    await type(slider(), '99');
    expect(usersField().value).toBe('100');

    await type(usersField(), '37');
    expect(slider().value).toBe('36');
    expect(total()).toBe(plain('382,36 €'));
  });

  it.each(['10001', '0', 'abc'])(
    'AC-77 with %s shows the error, keeps the last valid projection and disables saving',
    async (value) => {
      await type(usersField(), '15');
      await type(usersField(), value);

      expect(plain(host.querySelector('#users-error')?.textContent)).toBe(
        value === 'abc' ? 'Introduce un número entero.' : 'Introduce un valor entre 1 y 10000.',
      );
      expect(usersField().getAttribute('aria-invalid')).toBe('true');
      expect(usersField().value).toBe(value);
      expect(total()).toBe('169,40 €');
      expect(saveButton().disabled).toBe(true);
    },
  );

  // Totals computed with the domain's calculatePricing (STANDARD tariff, ES 21 %), not by hand.
  it.each([
    { position: '9', users: '10', sum: '121,00 €', lastTier: 'Tramo 1' },
    { position: '10', users: '11', sum: '130,68 €', lastTier: 'Tramo 2' },
    { position: '49', users: '50', sum: '508,20 €', lastTier: 'Tramo 2' },
    { position: '50', users: '51', sum: '514,25 €', lastTier: 'Tramo 3' },
  ])(
    'AC-91 position $position reaches exactly $users users, and the tier changes at 11 and 51',
    async ({ position, users, sum, lastTier }) => {
      await type(slider(), position);

      expect(usersField().value).toBe(users);
      expect(slider().getAttribute('aria-valuetext')).toBe(`${users} usuarios`);
      expect(total()).toBe(plain(sum));
      expect(
        projection()
          .filter((row) => row.startsWith('Tramo'))
          .at(-1),
      ).toMatch(new RegExp(`^${lastTier} `));
    },
  );

  it('AC-91 announces the typed value even when no position matches it (105 → «105 usuarios»)', async () => {
    await type(usersField(), '105');

    expect(slider().getAttribute('aria-valuetext')).toBe('105 usuarios');
    expect(slider().value).toBe('99');
  });

  it('spec 05 §3.4.1 Re Pág / Av Pág move ten positions, within the ends', async () => {
    slider().dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', cancelable: true }));
    await fixture.whenStable();
    expect(usersField().value).toBe('11');

    slider().dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', cancelable: true }));
    slider().dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', cancelable: true }));
    await fixture.whenStable();
    expect(usersField().value).toBe('1');
  });

  it('marks storage and API calls as informative and validates their ranges', async () => {
    expect(plain(host.querySelector('#storage-hint')?.textContent)).toBe('Informativo, no afecta al precio');
    await type(host.querySelector<HTMLInputElement>('#storage-number') ?? fail(), '100001');

    expect(plain(host.querySelector('#storage-error')?.textContent)).toBe(
      'Introduce un valor entre 0 y 100000.',
    );
    expect(saveButton().disabled).toBe(true);
  });

  it('AC-78 / AC-89 saves once on a double click, sends only the inputs and emits what the server returns', async () => {
    const saved: SimulationResponse[] = [];
    fixture.componentInstance.saved.subscribe((simulation) => saved.push(simulation));
    await type(usersField(), '51');

    saveButton().click();
    await fixture.whenStable();
    expect(saveButton().disabled).toBe(true);
    saveButton().click();

    const request = http.expectOne('/api/simulations');
    expect(request.request.body).toEqual({
      customerId: CUSTOMER_FIXTURE.id,
      activeUsers: 51,
      storageGb: 0,
      apiCallsPerMonth: 0,
    });
    const response = simulationResponse();
    request.flush(response, { status: 201, statusText: 'Created' });
    await settle();

    expect(saved).toEqual([response]);
    expect(
      TestBed.inject(ToastStore)
        .toasts()
        .map(({ message }) => message),
    ).toEqual(['Simulación guardada']);
    expect(usersField().value).toBe('51');
    expect(saveButton().disabled).toBe(false);
  });

  it('RNF-08 / D-127 keeps the values and explains the failure, with its reference, when saving fails', async () => {
    await type(usersField(), '15');
    saveButton().click();
    await fixture.whenStable();

    http
      .expectOne('/api/simulations')
      .flush(
        { status: 500, instance: INSTANCE_FIXTURE, code: 'INTERNAL_ERROR' },
        { status: 500, statusText: 'Error' },
      );
    await settle();

    expect(plain(host.querySelector('[role="alert"]')?.textContent)).toBe(
      'No se ha podido guardar la simulación. Inténtalo de nuevo. (Referencia: 4e5f6a7b)',
    );
    expect(usersField().value).toBe('15');
  });

  it('D-48 / RNF-13 announces the total to screen readers once the value settles, not on every step', async () => {
    vi.useFakeTimers();
    const live = (): string => plain(host.querySelector('[aria-live="polite"]')?.textContent);
    // Synchronous typing: whenStable() would wait for the fake timers.
    const typeNow = (value: string): void => {
      usersField().value = value;
      usersField().dispatchEvent(new Event('input'));
      TestBed.tick();
    };
    await vi.advanceTimersByTimeAsync(ANNOUNCE_DELAY_MS);
    TestBed.tick();
    expect(live()).toBe(''); // nothing to announce while the user has not changed anything
    typeNow('15');
    await vi.advanceTimersByTimeAsync(ANNOUNCE_DELAY_MS - 100);
    typeNow('51');
    await vi.advanceTimersByTimeAsync(ANNOUNCE_DELAY_MS - 100);
    TestBed.tick();
    expect(live()).not.toContain('169,40');
    expect(live()).not.toContain('514,25');

    await vi.advanceTimersByTimeAsync(100);
    TestBed.tick();
    expect(live()).toBe(plain('Total mensual: 514,25 €'));
  });

  it('TV-PR-06 labels the open last tier without an upper limit', () => {
    const line = { tier: 3, fromUser: 51, toUser: null, units: 1, unitPriceCents: 500, subtotalCents: 500 };

    expect(plain(tierLabel(line))).toBe('Tramo 3 · usuarios desde 51 · 1 × 5,00 €');
  });
});

function simulationResponse(): SimulationResponse {
  return {
    id: '019a7b2c-9999-7000-8000-000000000051',
    customerId: CUSTOMER_FIXTURE.id,
    activeUsers: 51,
    storageGb: 0,
    apiCallsPerMonth: 0,
    pricing: {
      currency: 'EUR',
      tariffCode: 'STANDARD',
      tiers: [
        { tier: 1, fromUser: 1, toUser: 10, units: 10, unitPriceCents: 1000, subtotalCents: 10000 },
        { tier: 2, fromUser: 11, toUser: 50, units: 40, unitPriceCents: 800, subtotalCents: 32000 },
        { tier: 3, fromUser: 51, toUser: null, units: 1, unitPriceCents: 500, subtotalCents: 500 },
      ],
      baseCents: 42500,
      taxCountry: 'ES',
      taxRateBps: 2100,
      taxCents: 8925,
      totalCents: 51425,
    },
    createdAt: '2026-11-13T10:20:00.000Z',
  };
}
