import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { CustomerPage, CustomerSummary } from '@saas-o-matic/contract';
import { beforeEach, describe, expect, it } from 'vitest';

import { apiBaseInterceptor } from '../../core/api/api-base.interceptor';
import { apiErrorInterceptor } from '../../core/api/api-error.interceptor';
import { CUSTOMER_FIXTURE, INSTANCE_FIXTURE } from '../../core/testing/catalog.fixture';
import { DashboardPage } from './dashboard.page';

const LIST_URL = '/api/customers';
const plain = (text: string | null | undefined): string => (text ?? '').replace(/\s+/g, ' ').trim();

function summary(index: number): CustomerSummary {
  const { taxId, taxIdType, country, plan, createdAt } = CUSTOMER_FIXTURE;
  return {
    id: `019a7b2c-0000-7000-8000-${String(index).padStart(12, '0')}`,
    companyName: `Cliente ${String(index)}`,
    taxId,
    taxIdType,
    country,
    plan,
    createdAt,
  };
}

function page(count: number, total: number, offset = 0): CustomerPage {
  const items = Array.from({ length: count }, (_, index) => summary(offset + index + 1));
  return { items, page: { limit: 20, offset, total } };
}

let fixture: ComponentFixture<DashboardPage>;
let host: HTMLElement;
let http: HttpTestingController;

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(withInterceptors([apiBaseInterceptor, apiErrorInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  http = TestBed.inject(HttpTestingController);
  fixture = TestBed.createComponent(DashboardPage);
  host = fixture.nativeElement as HTMLElement;
  fixture.detectChanges();
  TestBed.tick();
});

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
  fixture.detectChanges();
  TestBed.tick();
  fixture.detectChanges();
}

const pending = (): TestRequest => http.expectOne((each) => each.url === LIST_URL);

async function answer(body: CustomerPage): Promise<TestRequest> {
  const request = pending();
  request.flush(body);
  await settle();
  return request;
}

function button(name: string): HTMLButtonElement {
  const found = [...host.querySelectorAll('button')].find((each) => plain(each.textContent) === name);
  if (found === undefined) throw new Error(`No button «${name}»`);
  return found;
}

/** Types in the search field and presses Enter, which searches at once. */
async function searchFor(text: string): Promise<void> {
  const field = host.querySelector<HTMLInputElement>('#customer-search');
  if (field === null) throw new Error('No search field');
  field.value = text;
  field.dispatchEvent(new Event('input'));
  field.form?.dispatchEvent(new Event('submit', { cancelable: true }));
  await settle();
}

describe('AC-70 V1 dashboard states (spec 05 §3.1)', () => {
  it('shows the skeleton while the first page loads, with a status for screen readers', () => {
    expect(host.querySelectorAll('[data-testid="customer-skeleton"]')).toHaveLength(6);
    expect(plain(host.querySelector('[role="status"]')?.textContent)).toBe('Cargando clientes…');
  });

  it('with 25 customers: 20 card links to their detail and «1–20 de 25»', async () => {
    await answer(page(20, 25));

    const cards = host.querySelectorAll<HTMLAnchorElement>('ul[aria-label="Clientes"] a');
    expect(cards).toHaveLength(20);
    expect(cards[0]?.getAttribute('href')).toBe(`/customers/${summary(1).id}`);
    expect(plain(cards[0]?.textContent)).toContain('España');
    expect(plain(host.querySelector('nav[aria-label="Paginación"] p')?.textContent)).toBe('1–20 de 25');
    expect(button('Anterior').getAttribute('aria-disabled')).toBe('true');
    expect(button('Siguiente').getAttribute('aria-disabled')).toBe('false');
  });

  it('«Siguiente» asks for the next page and keeps the focus while it loads (aria-disabled, not disabled)', async () => {
    await answer(page(20, 25));
    const next = button('Siguiente');
    next.focus();

    next.click();
    TestBed.tick();
    fixture.detectChanges();

    expect(pending().request.params.get('offset')).toBe('20');
    expect(next.disabled).toBe(false);
    expect(next.getAttribute('aria-disabled')).toBe('true');
    expect(document.activeElement).toBe(next);
  });

  it('without customers: «Todavía no hay clientes» and a link to create the first one', async () => {
    await answer(page(0, 0));

    expect(plain(host.textContent)).toContain('Todavía no hay clientes');
    const create = [...host.querySelectorAll('a')].find(
      (link) => plain(link.textContent) === 'Crear el primer cliente',
    );
    expect(create?.getAttribute('href')).toBe('/customers/new');
  });

  it('an error shows «Reintentar», keeps the search field, and retrying asks again', async () => {
    pending().flush(
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

    expect(plain(host.querySelector('[role="alert"]')?.textContent)).toContain(
      'No se ha podido cargar el listado.',
    );
    expect(host.querySelector('#customer-search')).not.toBeNull();
    button('Reintentar').click();
    TestBed.tick();
    expect(pending()).toBeDefined();
  });
});

describe('AC-71 V1 search', () => {
  beforeEach(async () => {
    await answer(page(20, 25));
  });

  it('the field has its label and a limit of 100 characters', () => {
    const label = host.querySelector('label[for="customer-search"]');

    expect(plain(label?.textContent)).toBe('Buscar por empresa o identificador fiscal');
    expect(host.querySelector('#customer-search')?.getAttribute('maxlength')).toBe('100');
  });

  it('no matches: the message names the query, and «Limpiar búsqueda» lists everything again', async () => {
    await searchFor('zzz');
    const search = pending();
    expect(search.request.params.get('q')).toBe('zzz');
    search.flush(page(0, 0));
    await settle();

    expect(plain(host.textContent)).toContain('No hay clientes que coincidan con «zzz»');
    button('Limpiar búsqueda').click();
    TestBed.tick();
    fixture.detectChanges();

    expect(pending().request.params.has('q')).toBe(false);
    expect(host.querySelector<HTMLInputElement>('#customer-search')?.value).toBe('');
    // The button goes away with the message: the focus moves to the field instead of being lost (spec 05 §5).
    expect(document.activeElement?.id).toBe('customer-search');
  });
});
