import type { BusinessErrorCode, SchemaErrorCode } from '@saas-o-matic/contract';

import type { ApiError, ApiErrorCode } from '../api/api-error';

export type FieldErrorCode = SchemaErrorCode | BusinessErrorCode;

/** Values a message may interpolate (spec 05 §6): limits from the catalog, data from the response. */
export interface MessageParams {
  readonly min?: number;
  readonly max?: number;
  /** Country name, already in Spanish. */
  readonly country?: string;
  /** Accepted tax id types, as the field label names them («DNI, NIE o CIF»). */
  readonly taxIdTypes?: string;
  /** Name of the field the error belongs to. */
  readonly field?: string;
  readonly retryAfterSeconds?: number | null;
  readonly reference?: string | null;
}

type MessageFn = (params: MessageParams) => string;

const generic: MessageFn = ({ reference }) =>
  reference
    ? `Algo ha fallado. Inténtalo de nuevo. (Referencia: ${reference})`
    : 'Algo ha fallado. Inténtalo de nuevo.';

const lengthBetween: MessageFn = ({ min, max }) => {
  if (max === undefined) return 'El texto no tiene una longitud admitida.';
  // The email only has a maximum in the catalog.
  return min === undefined
    ? `Debe tener como máximo ${String(max)} caracteres.`
    : `Debe tener entre ${String(min)} y ${String(max)} caracteres.`;
};

const rateLimited: MessageFn = ({ retryAfterSeconds }) =>
  retryAfterSeconds === null || retryAfterSeconds === undefined
    ? 'Demasiadas peticiones. Espera unos segundos y vuelve a intentarlo.'
    : `Demasiadas peticiones. Espera ${String(retryAfterSeconds)} s y vuelve a intentarlo.`;

/**
 * Message of each response code. If the contract adds a code without a message, this does not compile
 * (06-frontend §5).
 */
const PROBLEM_MESSAGES = {
  MALFORMED_JSON: generic,
  VALIDATION_ERROR: generic,
  NOT_FOUND: generic,
  CUSTOMER_ALREADY_EXISTS: () => 'Ya existe un cliente con este identificador fiscal.',
  PAYLOAD_TOO_LARGE: generic,
  UNSUPPORTED_MEDIA_TYPE: generic,
  BUSINESS_RULE_VIOLATION: generic,
  RATE_LIMITED: rateLimited,
  INTERNAL_ERROR: generic,
  SERVICE_UNAVAILABLE: () => 'No se puede conectar con el servidor. Inténtalo de nuevo en unos minutos.',
  NETWORK_ERROR: generic,
  UNKNOWN_ERROR: generic,
} as const satisfies Record<ApiErrorCode, MessageFn>;

/** Message of each `errors[].code`, worded as spec 05 §6. */
const FIELD_MESSAGES = {
  REQUIRED: () => 'Este campo es obligatorio.',
  INVALID_TYPE: () => 'Introduce un número entero.',
  TOO_SHORT: lengthBetween,
  TOO_LONG: lengthBetween,
  OUT_OF_RANGE: ({ min, max }) =>
    min === undefined || max === undefined
      ? 'El valor está fuera del rango admitido.'
      : `Introduce un valor entre ${String(min)} y ${String(max)}.`,
  INVALID_FORMAT: ({ field }) =>
    field === 'contactEmail' ? 'Introduce un email válido.' : 'El formato no es válido.',
  INVALID_ENUM: () => 'Selecciona una opción de la lista.',
  UNKNOWN_FIELD: generic,
  TAX_ID_INVALID_FORMAT: ({ country, taxIdTypes }) =>
    country === undefined || taxIdTypes === undefined
      ? 'El formato del identificador no es válido.'
      : `El formato no es válido para ${country} (${taxIdTypes}).`,
  TAX_ID_INVALID_CHECK: () => 'El carácter de control no es correcto. Revisa el identificador.',
  TAX_ID_UNSUPPORTED_TYPE: () => 'Los NIF que empiezan por K, L o M no están admitidos.',
  CUSTOMER_NOT_FOUND: () => 'El cliente ya no existe.',
} as const satisfies Record<FieldErrorCode, MessageFn>;

export function isApiErrorCode(code: unknown): code is ApiErrorCode {
  return typeof code === 'string' && Object.hasOwn(PROBLEM_MESSAGES, code);
}

/**
 * Errors whose own message tells the user what to do (wait, or try again in a few minutes): a form or an action shows
 * it instead of its generic notice (spec 05 §6, D-152).
 */
export function hasActionableMessage(error: ApiError): boolean {
  return error.code === 'RATE_LIMITED' || error.code === 'SERVICE_UNAVAILABLE';
}

export function isFieldErrorCode(code: unknown): code is FieldErrorCode {
  return typeof code === 'string' && Object.hasOwn(FIELD_MESSAGES, code);
}

/** Message for an error shown outside any field: a notice of the form or of the view. */
export function problemMessage(error: ApiError): string {
  const { reference, retryAfterSeconds } = error;
  return PROBLEM_MESSAGES[error.code]({ reference, retryAfterSeconds });
}

export function fieldMessage(code: FieldErrorCode, params: MessageParams = {}): string {
  return FIELD_MESSAGES[code](params);
}
