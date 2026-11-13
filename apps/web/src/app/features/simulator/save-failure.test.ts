import { describe, expect, it } from 'vitest';

import { ApiError } from '../../core/api/api-error';
import { saveFailureMessage } from './save-failure';

describe('spec 05 §3.4 notice of a failed «Guardar simulación»', () => {
  it('AC-85 D-152 says that the server cannot be reached when nginx answers for the API', () => {
    expect(saveFailureMessage(new ApiError({ status: 504, code: 'SERVICE_UNAVAILABLE' }))).toBe(
      'No se puede conectar con el servidor. Inténtalo de nuevo en unos minutos.',
    );
  });

  it('RNF-SEC-08 gives the wait of a 429', () => {
    const error = new ApiError({ status: 429, code: 'RATE_LIMITED', retryAfterSeconds: 5 });

    expect(saveFailureMessage(error)).toBe('Demasiadas peticiones. Espera 5 s y vuelve a intentarlo.');
  });

  it('D-127 keeps its own message, with the reference, for anything else', () => {
    const error = new ApiError({ status: 500, code: 'INTERNAL_ERROR', reference: '4e5f6a7b' });

    expect(saveFailureMessage(error)).toBe(
      'No se ha podido guardar la simulación. Inténtalo de nuevo. (Referencia: 4e5f6a7b)',
    );
  });
});
