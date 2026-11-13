import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { apiBaseInterceptor } from '../../core/api/api-base.interceptor';
import { apiErrorInterceptor } from '../../core/api/api-error.interceptor';
import { ToastStore } from '../../core/layout/toast.store';
import { CATALOG_FIXTURE, CUSTOMER_FIXTURE, INSTANCE_FIXTURE } from '../../core/testing/catalog.fixture';
import { CustomerCreatePage } from './customer-create.page';

@Component({ selector: 'app-blank', template: '' })
class Blank {}

describe('V2 customer creation form (spec 05 §3.2)', () => {
  let fixture: ComponentFixture<CustomerCreatePage>;
  let http: HttpTestingController;
  let host: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'customers/:id', component: Blank }]),
        provideHttpClient(withInterceptors([apiBaseInterceptor, apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CustomerCreatePage);
    host = fixture.nativeElement as HTMLElement;
    // Not whenStable(): the pending GET /catalog keeps the app unstable until a test answers it.
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  /** Lets the submit action finish (it resolves in promises the fixture does not track) and renders. */
  async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  }

  async function loadCatalog(): Promise<void> {
    TestBed.tick(); // lets the resource send its request (first load or «Reintentar»)
    http.expectOne('/api/catalog').flush(CATALOG_FIXTURE);
    await fixture.whenStable();
  }

  function control(id: string): HTMLInputElement | HTMLSelectElement {
    const element = host.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`);
    if (element === null) throw new Error(`#${id} is not rendered`);
    return element;
  }

  async function fill(id: string, value: string): Promise<void> {
    const element = control(id);
    element.value = value;
    // What a browser fires when the user types or picks an option, then leaves the field.
    element.dispatchEvent(new Event('input'));
    element.dispatchEvent(new Event('change'));
    element.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  async function fillValidSpanishCustomer(taxId = 'B12345674'): Promise<void> {
    await fill('customer-company', 'Industrias Atlánticas del Norte, S.L.');
    await fill('customer-tax-id', taxId);
    await fill('customer-email', 'compras@industrias-atlanticas.example');
    await fill('customer-plan', 'BUSINESS');
  }

  async function submit(): Promise<void> {
    host.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  }

  const text = (selector: string): string => host.querySelector(selector)?.textContent.trim() ?? '';

  it('RNF-08 shows a skeleton while the catalog loads, and an error with «Reintentar» if it fails', async () => {
    expect(host.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(host.querySelector('form')).toBeNull();

    http.expectOne('/api/catalog').flush(null, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();
    expect(text('[role="alert"]')).toContain('No se ha podido cargar el catálogo');

    host.querySelector<HTMLButtonElement>('[role="alert"] button')?.click();
    await loadCatalog();
    expect(host.querySelector('form')).not.toBeNull();
  });

  it('AC-72 preselects Spain and changes the tax id label and example with the country', async () => {
    await loadCatalog();

    expect(control('customer-country').value).toBe('ES');
    expect(text('label[for="customer-tax-id"]')).toBe('DNI, NIE o CIF');
    expect(text('#customer-tax-id-hint')).toBe('Ejemplo: B12345674');

    await fill('customer-country', 'PT');
    expect(text('label[for="customer-tax-id"]')).toBe('NIF (NIPC)');
    expect(text('#customer-tax-id-hint')).toBe('Ejemplo: 123456789');
  });

  it('AC-73 checks the schema in the browser and sends nothing while it fails; the focus goes to the first error', async () => {
    await loadCatalog();
    await fill('customer-email', 'no-es-un-email');
    await submit();

    expect(text('#customer-company-error')).toBe('Este campo es obligatorio.');
    expect(text('#customer-email-error')).toBe('Introduce un email válido.');
    expect(control('customer-company').getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(control('customer-company'));
    http.expectNone('/api/customers');
  });

  it('AC-72 creates the customer, says «Cliente creado» and opens its detail', async () => {
    await loadCatalog();
    await fillValidSpanishCustomer();
    await submit();

    const request = http.expectOne('/api/customers');
    expect(request.request.body).toEqual({
      country: 'ES',
      companyName: 'Industrias Atlánticas del Norte, S.L.',
      taxId: 'B12345674',
      contactEmail: 'compras@industrias-atlanticas.example',
      plan: 'BUSINESS',
    });
    request.flush(CUSTOMER_FIXTURE, { status: 201, statusText: 'Created' });
    await settle();

    expect(TestBed.inject(Router).url).toBe(`/customers/${CUSTOMER_FIXTURE.id}`);
    expect(
      TestBed.inject(ToastStore)
        .toasts()
        .map(({ message }) => message),
    ).toEqual(['Cliente creado']);
  });

  it('AC-73 / TV-ES-04 shows the check digit error under the tax id, focuses it and keeps the data', async () => {
    await loadCatalog();
    await fillValidSpanishCustomer('12345678A');
    await submit();

    http.expectOne('/api/customers').flush(
      {
        status: 422,
        instance: INSTANCE_FIXTURE,
        code: 'BUSINESS_RULE_VIOLATION',
        errors: [{ location: 'body', pointer: '/taxId', code: 'TAX_ID_INVALID_CHECK' }],
      },
      { status: 422, statusText: 'Unprocessable' },
    );
    await settle();

    expect(text('#customer-tax-id-error')).toBe(
      'El carácter de control no es correcto. Revisa el identificador.',
    );
    expect(document.activeElement).toBe(control('customer-tax-id'));
    expect(control('customer-company').value).toBe('Industrias Atlánticas del Norte, S.L.');
    expect(host.querySelector('[role="alert"]')).toBeNull();

    // The server's error belongs to the value it judged: editing the field clears it until the next submit.
    await fill('customer-tax-id', 'B76543214');
    expect(text('#customer-tax-id-error')).toBe('');
    expect(control('customer-tax-id').hasAttribute('aria-invalid')).toBe(false);
  });

  it('AC-73 names the country and its accepted types in a format error', async () => {
    await loadCatalog();
    await fillValidSpanishCustomer('X');
    await submit();

    http.expectOne('/api/customers').flush(
      {
        status: 422,
        instance: INSTANCE_FIXTURE,
        code: 'BUSINESS_RULE_VIOLATION',
        errors: [{ location: 'body', pointer: '/taxId', code: 'TAX_ID_INVALID_FORMAT' }],
      },
      { status: 422, statusText: 'Unprocessable' },
    );
    await settle();

    expect(text('#customer-tax-id-error')).toBe('El formato no es válido para España (DNI, NIE o CIF).');
  });

  it('AC-74 explains a duplicate and links «Ver cliente» to the existing one', async () => {
    await loadCatalog();
    await fillValidSpanishCustomer();
    await submit();

    const existing = '019a7b2c-0000-7000-8000-000000000001';
    http.expectOne('/api/customers').flush(
      {
        status: 409,
        instance: INSTANCE_FIXTURE,
        code: 'CUSTOMER_ALREADY_EXISTS',
        existingCustomerId: existing,
      },
      { status: 409, statusText: 'Conflict' },
    );
    await settle();

    expect(text('[role="alert"] p')).toBe('Ya existe un cliente con este identificador fiscal.');
    expect(host.querySelector('[role="alert"] a')?.getAttribute('href')).toBe(`/customers/${existing}`);
  });

  it('D-127 keeps the data and gives a reference when the server fails', async () => {
    await loadCatalog();
    await fillValidSpanishCustomer();
    await submit();

    http
      .expectOne('/api/customers')
      .flush(
        { status: 500, instance: INSTANCE_FIXTURE, code: 'INTERNAL_ERROR' },
        { status: 500, statusText: 'Error' },
      );
    await settle();

    expect(text('[role="alert"] p')).toBe(
      'No se ha podido crear el cliente. Inténtalo de nuevo. (Referencia: 4e5f6a7b)',
    );
    expect(control('customer-tax-id').value).toBe('B12345674');
  });

  it('CL-45 disables «Crear cliente» while sending, so a double click creates one customer', async () => {
    await loadCatalog();
    await fillValidSpanishCustomer();
    await submit();

    const button = host.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(button?.disabled).toBe(true);
    await submit();

    http.expectOne('/api/customers').flush(CUSTOMER_FIXTURE, { status: 201, statusText: 'Created' });
    await settle();
  });
});
