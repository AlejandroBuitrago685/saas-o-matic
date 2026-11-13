import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { apiBaseInterceptor } from './api-base.interceptor';
import { ApiError } from './api-error';
import { apiErrorInterceptor } from './api-error.interceptor';
import { referenceOf } from './problem.parser';

const INSTANCE = 'urn:uuid:019a7b2c-4d5e-7f00-8a1b-2c3d4e5f6a7b';

describe('ADR-012 / 06-frontend §5 API interceptors', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiBaseInterceptor, apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  async function failWith(
    body: object | string,
    status: number,
    headers: Record<string, string> = {},
  ): Promise<unknown> {
    const call = firstValueFrom(http.get('/customers/x')).catch((error: unknown) => error);
    controller.expectOne('/api/customers/x').flush(body, { status, statusText: 'x', headers });
    return call;
  }

  it('sends API routes to /api on the same origin and leaves absolute URLs alone', () => {
    void firstValueFrom(http.get('/catalog'));
    void firstValueFrom(http.get('https://open.er-api.com/v6/latest/EUR'));

    controller.expectOne('/api/catalog').flush({});
    controller.expectOne('https://open.er-api.com/v6/latest/EUR').flush({});
    controller.verify();
  });

  it('AC-73 turns a 422 Problem into an ApiError with its field errors and reference', async () => {
    const error = await failWith(
      {
        type: '/problems/business-rule-violation',
        title: 'Business rule violation',
        status: 422,
        instance: INSTANCE,
        code: 'BUSINESS_RULE_VIOLATION',
        errors: [{ location: 'body', pointer: '/taxId', code: 'TAX_ID_INVALID_CHECK' }],
      },
      422,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 422,
      code: 'BUSINESS_RULE_VIOLATION',
      errors: [{ location: 'body', pointer: '/taxId', code: 'TAX_ID_INVALID_CHECK' }],
      reference: '4e5f6a7b',
    });
  });

  it('AC-74 keeps the existing customer id of a 409', async () => {
    const existing = '019a7b2c-0000-7000-8000-000000000001';
    const error = await failWith(
      { status: 409, instance: INSTANCE, code: 'CUSTOMER_ALREADY_EXISTS', existingCustomerId: existing },
      409,
    );

    expect(error).toMatchObject({ code: 'CUSTOMER_ALREADY_EXISTS', existingCustomerId: existing });
  });

  it('reads Retry-After of a 429 in seconds', async () => {
    const error = await failWith({ status: 429, instance: INSTANCE, code: 'RATE_LIMITED' }, 429, {
      'Retry-After': '12',
    });

    expect(error).toMatchObject({ code: 'RATE_LIMITED', retryAfterSeconds: 12 });
  });

  it('drops field errors with unknown codes or locations instead of trusting them', async () => {
    const error = await failWith(
      {
        status: 400,
        instance: INSTANCE,
        code: 'VALIDATION_ERROR',
        errors: [
          { location: 'body', pointer: '/plan', code: 'NOT_A_CODE' },
          { location: 'header', pointer: '/x', code: 'REQUIRED' },
          { location: 'body', pointer: '/plan', code: 'INVALID_ENUM' },
        ],
      },
      400,
    );

    expect(error).toMatchObject({ errors: [{ location: 'body', pointer: '/plan', code: 'INVALID_ENUM' }] });
  });

  it('turns a body that is not Problem Details into UNKNOWN_ERROR', async () => {
    const error = await failWith('<html>Bad gateway</html>', 502);

    expect(error).toMatchObject({ status: 502, code: 'UNKNOWN_ERROR', reference: null });
  });

  it('turns a request without an answer into NETWORK_ERROR', async () => {
    const call = firstValueFrom(http.get('/catalog')).catch((error: unknown) => error);
    controller.expectOne('/api/catalog').error(new ProgressEvent('error'), { status: 0 });

    await expect(call).resolves.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });
});

describe('D-127 error reference: the last 8 characters of the request UUID', () => {
  it('takes them from the urn:uuid instance', () => {
    expect(referenceOf(INSTANCE)).toBe('4e5f6a7b');
  });

  it('is null for an instance that is not a request URN', () => {
    expect(referenceOf('urn:uuid:nope')).toBeNull();
    expect(referenceOf(undefined)).toBeNull();
  });
});
