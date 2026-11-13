import { describe, expect, it } from 'vitest';

import { ApiError } from '../api/api-error';
import { fieldMessage, isApiErrorCode, isFieldErrorCode, problemMessage } from './error-messages';

describe('06-frontend §5 / spec 05 §6 error messages in Spanish', () => {
  it.each([
    ['REQUIRED', {}, 'Este campo es obligatorio.'],
    ['TOO_SHORT', { min: 2, max: 200 }, 'Debe tener entre 2 y 200 caracteres.'],
    ['TOO_LONG', { min: 2, max: 200 }, 'Debe tener entre 2 y 200 caracteres.'],
    ['OUT_OF_RANGE', { min: 1, max: 10000 }, 'Introduce un valor entre 1 y 10000.'],
    ['INVALID_TYPE', {}, 'Introduce un número entero.'],
    ['INVALID_FORMAT', { field: 'contactEmail' }, 'Introduce un email válido.'],
    ['INVALID_ENUM', {}, 'Selecciona una opción de la lista.'],
    [
      'TAX_ID_INVALID_FORMAT',
      { country: 'España', taxIdTypes: 'DNI, NIE o CIF' },
      'El formato no es válido para España (DNI, NIE o CIF).',
    ],
    ['TAX_ID_INVALID_CHECK', {}, 'El carácter de control no es correcto. Revisa el identificador.'],
    ['TAX_ID_UNSUPPORTED_TYPE', {}, 'Los NIF que empiezan por K, L o M no están admitidos.'],
    ['CUSTOMER_NOT_FOUND', {}, 'El cliente ya no existe.'],
  ] as const)('AC-73 %s → the message of the spec', (code, params, message) => {
    expect(fieldMessage(code, params)).toBe(message);
  });

  it('AC-74 explains a duplicate tax id', () => {
    const error = new ApiError({ status: 409, code: 'CUSTOMER_ALREADY_EXISTS' });

    expect(problemMessage(error)).toBe('Ya existe un cliente con este identificador fiscal.');
  });

  it('interpolates Retry-After in a 429', () => {
    const error = new ApiError({ status: 429, code: 'RATE_LIMITED', retryAfterSeconds: 30 });

    expect(problemMessage(error)).toBe('Demasiadas peticiones. Espera 30 s y vuelve a intentarlo.');
  });

  it('D-127 adds the reference to the generic message, and omits it when there is none', () => {
    expect(problemMessage(new ApiError({ status: 500, code: 'INTERNAL_ERROR', reference: '4e5f6a7b' }))).toBe(
      'Algo ha fallado. Inténtalo de nuevo. (Referencia: 4e5f6a7b)',
    );
    expect(problemMessage(new ApiError({ status: 0, code: 'NETWORK_ERROR' }))).toBe(
      'Algo ha fallado. Inténtalo de nuevo.',
    );
  });

  it('AC-85 D-152 says the server cannot be reached when nginx answers for the API', () => {
    expect(problemMessage(new ApiError({ status: 502, code: 'SERVICE_UNAVAILABLE' }))).toBe(
      'No se puede conectar con el servidor. Inténtalo de nuevo en unos minutos.',
    );
  });

  it('recognises only the codes of the contract and of the client', () => {
    expect(isApiErrorCode('CUSTOMER_ALREADY_EXISTS')).toBe(true);
    expect(isApiErrorCode('NETWORK_ERROR')).toBe(true);
    expect(isApiErrorCode('SERVICE_UNAVAILABLE')).toBe(true);
    expect(isApiErrorCode('toString')).toBe(false);
    expect(isFieldErrorCode('TAX_ID_INVALID_CHECK')).toBe(true);
    expect(isFieldErrorCode('constructor')).toBe(false);
  });
});
