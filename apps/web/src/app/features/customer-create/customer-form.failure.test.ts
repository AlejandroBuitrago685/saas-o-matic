import { describe, expect, it } from 'vitest';

import { ApiError } from '../../core/api/api-error';
import { describeFailure } from './customer-form.failure';

const noParams = (): object => ({});

describe('spec 05 §3.2 notice of a failed POST /customers', () => {
  it('AC-85 D-152 says that the server cannot be reached when nginx answers for the API', () => {
    const failure = describeFailure(new ApiError({ status: 502, code: 'SERVICE_UNAVAILABLE' }), noParams);

    expect(failure).toEqual({
      fieldErrors: [],
      notice: {
        message: 'No se puede conectar con el servidor. Inténtalo de nuevo en unos minutos.',
        existingCustomerId: null,
      },
    });
  });

  it('RNF-SEC-08 gives the wait of a 429', () => {
    const error = new ApiError({ status: 429, code: 'RATE_LIMITED', retryAfterSeconds: 12 });

    expect(describeFailure(error, noParams).notice?.message).toBe(
      'Demasiadas peticiones. Espera 12 s y vuelve a intentarlo.',
    );
  });

  it('AC-85 a request without an answer keeps the message of the form', () => {
    const error = new ApiError({ status: 0, code: 'NETWORK_ERROR' });

    expect(describeFailure(error, noParams).notice?.message).toBe(
      'No se ha podido crear el cliente. Inténtalo de nuevo.',
    );
  });
});
