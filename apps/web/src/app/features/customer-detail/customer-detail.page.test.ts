import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { SimulationPage, SimulationResponse } from '@saas-o-matic/contract';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { apiBaseInterceptor } from '../../core/api/api-base.interceptor';
import { apiErrorInterceptor } from '../../core/api/api-error.interceptor';
import { CATALOG_FIXTURE, CUSTOMER_FIXTURE, INSTANCE_FIXTURE } from '../../core/testing/catalog.fixture';
import { CustomerDetailPage } from './customer-detail.page';

const ID = CUSTOMER_FIXTURE.id;
const HISTORY_URL = `/api/customers/${ID}/simulations`;
const plain = (text: string | null | undefined): string => (text ?? '').replace(/\s+/g, ' ').trim();

function simulation(index: number, totalCents = 1210): SimulationResponse {
  return {
    id: `019a7b2c-0000-7000-8000-${String(index).padStart(12, '0')}`,
    customerId: ID,
    activeUsers: 1,
    storageGb: 0,
    apiCallsPerMonth: 0,
    pricing: {
      currency: 'EUR',
      tariffCode: 'STANDARD',
      tiers: [{ tier: 1, fromUser: 1, toUser: 10, units: 1, unitPriceCents: 1000, subtotalCents: 1000 }],
      baseCents: 1000,
      taxCountry: 'ES',
      taxRateBps: 2100,
      taxCents: 210,
      totalCents,
    },
    createdAt: '2026-11-13T10:20:00.000Z',
  };
}

function page(items: SimulationResponse[], total: number, offset = 0): SimulationPage {
  return { items, page: { limit: 20, offset, total } };
}

describe('V3 customer detail (spec 05 §3.3 and §3.5)', () => {
  let fixture: ComponentFixture<CustomerDetailPage>;
  let host: HTMLElement;
  let http: HttpTestingController;

  function open(id: string): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiBaseInterceptor, apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CustomerDetailPage);
    fixture.componentRef.setInput('id', id);
    host = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    TestBed.tick();
  }

  /**
   * Lets pending promises finish and renders. Not whenStable(): requests the test has not answered yet (the
   * catalog, the history) would keep the app unstable.
   */
  async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    TestBed.tick();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  }

  /** Answers the three initial requests of a loaded customer. */
  async function loadCustomer(history: SimulationPage = page([], 0)): Promise<void> {
    http.expectOne(`/api/customers/${ID}`).flush(CUSTOMER_FIXTURE);
    http.expectOne((request) => request.url === HISTORY_URL).flush(history);
    await settle();
    http.expectOne('/api/catalog').flush(CATALOG_FIXTURE);
    await settle();
  }

  const text = (selector: string): string => plain(host.querySelector(selector)?.textContent);
  const buttonNamed = (name: string): HTMLButtonElement | undefined =>
    [...host.querySelectorAll<HTMLButtonElement>('button')].find((b) => plain(b.textContent) === name);

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    http.verify();
  });

  it('RNF-08 shows skeletons of the three sections, announced once, while loading', () => {
    open(ID);

    expect(host.querySelectorAll('.skeleton').length).toBeGreaterThan(3);
    expect(host.querySelectorAll('[role="status"]')).toHaveLength(1);
    expect(text('[role="status"] .sr-only')).toBe('Cargando el cliente…');
    http.match(() => true);
  });

  it.each([
    { name: 'a malformed id (400)', id: 'abc', status: 400, code: 'VALIDATION_ERROR' },
    {
      name: 'an unknown UUID (404)',
      id: '019a7b2c-ffff-7fff-8fff-ffffffffffff',
      status: 404,
      code: 'NOT_FOUND',
    },
  ])('AC-75 shows «Cliente no encontrado» for $name', async ({ id, status, code }) => {
    open(id);
    // The API answers the customer and its history the same way.
    for (const request of http.match(() => true)) {
      request.flush({ status, instance: INSTANCE_FIXTURE, code }, { status, statusText: 'x' });
    }
    await settle();

    expect(text('h1')).toBe('Cliente no encontrado');
    expect(host.querySelector('a[href="/"]')?.textContent.trim()).toBe('Volver al inicio');
  });

  it('AC-78 / CL-47 shows the customer data at body size with small labels, and the empty history', async () => {
    open(ID);
    await loadCustomer();

    expect(text('h1')).toBe('Industrias Atlánticas del Norte, S.L.');
    const rows = [...host.querySelectorAll('app-customer-card .data-list > div')].map(
      (row) =>
        `${plain(row.querySelector('dt')?.textContent)}: ${plain(row.querySelector('dd')?.textContent)}`,
    );
    expect(rows).toEqual([
      'Identificador fiscal: B12345674 CIF',
      'País: España',
      'Email: compras@industrias-atlanticas.example',
      'Plan: BUSINESS',
      'Fecha de alta: 13/11/2026',
    ]);
    expect(host.querySelector('a[href^="mailto:"]')?.getAttribute('href')).toBe(
      'mailto:compras@industrias-atlanticas.example',
    );
    expect(text('app-simulation-history li')).toBe(
      'Aún no hay simulaciones. Usa el simulador para crear la primera.',
    );
    expect(host.querySelector('app-simulator')).not.toBeNull();
  });

  it('AC-78 puts a saved simulation first with the amounts of the response, and the empty state goes away', async () => {
    open(ID);
    await loadCustomer();
    const users = host.querySelector<HTMLInputElement>('#users-number');
    if (users === null) throw new Error('simulator not rendered');
    users.value = '51';
    users.dispatchEvent(new Event('input'));
    await settle();
    const projected = text('[data-testid="projection-total"]');

    buttonNamed('Guardar simulación')?.click();
    await settle();
    // The server's own figures for 51 users in ES (TV-PR-06 of AC-78): 425,00 € + 89,25 € = 514,25 €.
    const saved = simulation(51);
    http.expectOne('/api/simulations').flush(
      {
        ...saved,
        activeUsers: 51,
        pricing: { ...saved.pricing, baseCents: 42500, taxCents: 8925, totalCents: 51425 },
      },
      { status: 201, statusText: 'Created' },
    );
    await settle();

    const first = host.querySelector('app-simulation-card');
    const rows = [...(first?.querySelectorAll('.data-list > div') ?? [])].map(
      (row) =>
        `${plain(row.querySelector('dt')?.textContent)}: ${plain(row.querySelector('dd')?.textContent)}`,
    );
    expect(plain(first?.querySelector('p')?.textContent)).toBe(plain(`Total mensual: ${projected}`));
    expect(rows).toContain(plain('Usuarios activos: 51'));
    expect(rows).toContain(plain('Base mensual: 425,00 €'));
    expect(rows).toContain(plain('Impuesto (21 %): 89,25 €'));
    expect(text('app-simulation-history')).not.toContain('Aún no hay simulaciones');
  });

  it('RNF-08 / spec 05 §3.5 loads 20 more with «Cargar más» and hides it when everything is shown', async () => {
    open(ID);
    const firstTwenty = Array.from({ length: 20 }, (_, index) => simulation(index + 1));
    await loadCustomer(page(firstTwenty, 22));
    expect(host.querySelectorAll('app-simulation-card')).toHaveLength(20);

    buttonNamed('Cargar más')?.click();
    await settle();
    const more = http.expectOne((request) => request.url === HISTORY_URL);
    expect(more.request.params.get('offset')).toBe('20');
    more.flush(page([simulation(21), simulation(22)], 22, 20));
    await settle();

    expect(host.querySelectorAll('app-simulation-card')).toHaveLength(22);
    expect(buttonNamed('Cargar más')).toBeUndefined();
  });

  it('RNF-08 a history error offers «Reintentar» and leaves the simulator working', async () => {
    open(ID);
    http.expectOne(`/api/customers/${ID}`).flush(CUSTOMER_FIXTURE);
    http
      .expectOne((request) => request.url === HISTORY_URL)
      .flush(
        { status: 500, instance: INSTANCE_FIXTURE, code: 'INTERNAL_ERROR' },
        { status: 500, statusText: 'x' },
      );
    await settle();
    http.expectOne('/api/catalog').flush(CATALOG_FIXTURE);
    await settle();

    expect(text('app-simulation-history [role="alert"]')).toContain('No se ha podido cargar el historial.');
    expect(host.querySelector('app-simulator #users-number')).not.toBeNull();

    buttonNamed('Reintentar')?.click();
    TestBed.tick();
    http.expectOne((request) => request.url === HISTORY_URL).flush(page([simulation(1)], 1));
    await settle();
    expect(host.querySelectorAll('app-simulation-card')).toHaveLength(1);
  });

  it('AC-78 a simulation saved while the history failed is not shown twice after «Reintentar»', async () => {
    open(ID);
    http.expectOne(`/api/customers/${ID}`).flush(CUSTOMER_FIXTURE);
    http
      .expectOne((request) => request.url === HISTORY_URL)
      .flush(
        { status: 500, instance: INSTANCE_FIXTURE, code: 'INTERNAL_ERROR' },
        { status: 500, statusText: 'x' },
      );
    await settle();
    http.expectOne('/api/catalog').flush(CATALOG_FIXTURE);
    await settle();

    buttonNamed('Guardar simulación')?.click();
    await settle();
    const saved = simulation(7);
    http.expectOne('/api/simulations').flush(saved, { status: 201, statusText: 'Created' });
    await settle();
    buttonNamed('Reintentar')?.click();
    TestBed.tick();
    // The server's first page already contains the simulation saved here.
    http.expectOne((request) => request.url === HISTORY_URL).flush(page([saved], 1));
    await settle();

    expect(host.querySelectorAll('app-simulation-card')).toHaveLength(1);
    expect(buttonNamed('Cargar más')).toBeUndefined();
  });

  it('RNF-08 shows an error with «Reintentar» when the customer cannot be loaded', async () => {
    open(ID);
    http
      .expectOne(`/api/customers/${ID}`)
      .flush(
        { status: 500, instance: INSTANCE_FIXTURE, code: 'INTERNAL_ERROR' },
        { status: 500, statusText: 'x' },
      );
    http.expectOne((request) => request.url === HISTORY_URL).flush(page([], 0));
    await settle();

    expect(text('[role="alert"]')).toContain('No se ha podido cargar el cliente.');
  });
});
